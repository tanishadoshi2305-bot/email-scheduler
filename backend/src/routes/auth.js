const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { authMiddleware, signAuthToken } = require("../middleware/auth");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  createdAt: true,
};

function toPublicUser(userRecord) {
  return {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    avatar: userRecord.avatar || null,
    createdAt: userRecord.createdAt,
  };
}

function formatNameFromEmail(email) {
  const localPart = email.split("@")[0] || "Dispatch User";
  const words = localPart
    .split(/[._-]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length === 0) return "Dispatch User";
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

/**
 * Extracts verified Google OAuth profile or validates local mock Google Sign-In credentials.
 */
async function resolveGoogleProfile({ credential, mockProfile }) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (googleClientId) {
    if (typeof credential !== "string" || !credential.trim()) {
      const err = new Error("Google credential token is required.");
      err.status = 400;
      throw err;
    }

    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(googleClientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
    } catch {
      const err = new Error("Invalid or expired Google credential.");
      err.status = 401;
      throw err;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email || payload.email_verified === false) {
      const err = new Error("Google account email could not be verified.");
      err.status = 401;
      throw err;
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    return {
      isMock: false,
      email: normalizedEmail,
      name: payload.name?.trim() || formatNameFromEmail(normalizedEmail),
      googleId: payload.sub,
      avatar: payload.picture || null,
      password: null,
    };
  }

  if (!mockProfile || typeof mockProfile !== "object") {
    const err = new Error(
      "Google Client ID is not configured; provide your Google email and password."
    );
    err.status = 400;
    throw err;
  }

  const rawEmail = typeof mockProfile.email === "string" ? mockProfile.email.trim() : "";
  if (!EMAIL_REGEX.test(rawEmail)) {
    const err = new Error("Couldn't find your Google Account. Enter a valid email.");
    err.status = 400;
    throw err;
  }

  const rawPassword = typeof mockProfile.password === "string" ? mockProfile.password : "";
  if (rawPassword.length < 6) {
    const err = new Error("Password must be at least 6 characters long.");
    err.status = 400;
    throw err;
  }

  const normalizedEmail = rawEmail.toLowerCase();
  const displayName =
    typeof mockProfile.name === "string" && mockProfile.name.trim()
      ? mockProfile.name.trim()
      : formatNameFromEmail(normalizedEmail);
  const avatarUrl =
    typeof mockProfile.avatar === "string" && mockProfile.avatar.trim()
      ? mockProfile.avatar.trim()
      : null;

  return {
    isMock: true,
    email: normalizedEmail,
    name: displayName,
    googleId: `mock_${normalizedEmail}`,
    avatar: avatarUrl,
    password: rawPassword,
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        error: "All fields (name, email, and password) are required.",
      });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists. Please sign in instead.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
      },
      select: USER_PUBLIC_SELECT,
    });

    const token = signAuthToken(user);
    return res.status(201).json({ token, user });
  } catch (err) {
    return next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        error: "Please enter both your email and password.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userRecord = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!userRecord) {
      return res.status(401).json({
        error: "No account found with this email address.",
      });
    }

    if (!userRecord.password) {
      return res.status(400).json({
        error: "This account is linked with Google. Please use Continue with Google.",
      });
    }

    const isValidPassword = await bcrypt.compare(password, userRecord.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: "Incorrect password. Please check your credentials and try again.",
      });
    }

    const user = toPublicUser(userRecord);
    const token = signAuthToken(user);
    return res.status(200).json({ token, user });
  } catch (err) {
    return next(err);
  }
});

router.post("/google", async (req, res, next) => {
  try {
    const { credential, mockProfile } = req.body || {};
    const profile = await resolveGoogleProfile({ credential, mockProfile });

    const whereOr = profile.googleId
      ? [{ googleId: profile.googleId }, { email: profile.email }]
      : [{ email: profile.email }];

    let userRecord = await prisma.user.findFirst({
      where: { OR: whereOr },
    });

    if (userRecord) {
      if (profile.isMock) {
        if (userRecord.password) {
          const passwordMatches = await bcrypt.compare(profile.password, userRecord.password);
          if (!passwordMatches) {
            return res.status(401).json({
              error: "Wrong Google account password. Try again.",
            });
          }
        }
      }

      const updates = {};
      if (profile.googleId && userRecord.googleId !== profile.googleId) {
        updates.googleId = profile.googleId;
      }
      if (profile.avatar && userRecord.avatar !== profile.avatar) {
        updates.avatar = profile.avatar;
      }
      if (profile.name && !userRecord.name) {
        updates.name = profile.name;
      }
      if (profile.isMock && !userRecord.password) {
        updates.password = await bcrypt.hash(profile.password, 10);
      }

      if (Object.keys(updates).length > 0) {
        userRecord = await prisma.user.update({
          where: { id: userRecord.id },
          data: updates,
        });
      }
    } else {
      const hashedPassword = profile.isMock
        ? await bcrypt.hash(profile.password, 10)
        : null;

      userRecord = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.googleId,
          avatar: profile.avatar,
          password: hashedPassword,
        },
      });
    }

    const user = toPublicUser(userRecord);
    const token = signAuthToken(user);
    return res.status(200).json({ token, user });
  } catch (err) {
    return next(err);
  }
});

router.get("/me", authMiddleware, (req, res) => {
  return res.status(200).json({ user: req.user });
});

module.exports = router;
