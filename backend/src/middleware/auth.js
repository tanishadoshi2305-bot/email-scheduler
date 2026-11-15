const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

function signAuthToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

/**
 * Express middleware that verifies the Bearer JWT and attaches `req.user`.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({ error: "Authorization token required" });
    }

    const payload = jwt.verify(token, getJwtSecret());
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User account no longer exists" });
    }

    req.user = user;
    return next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return next(err);
  }
}

module.exports = {
  getJwtSecret,
  signAuthToken,
  authMiddleware,
};
