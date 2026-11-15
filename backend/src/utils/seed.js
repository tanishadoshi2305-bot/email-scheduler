const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");

const DEMO_USER = {
  email: "demo@dispatch.app",
  password: "password123",
  name: "Demo User",
};

/**
 * Ensures the default demo user exists in SQLite on server startup.
 */
async function seedDemoUser() {
  const existingUser = await prisma.user.findUnique({
    where: { email: DEMO_USER.email },
  });

  if (existingUser) {
    return existingUser;
  }

  const hashedPassword = await bcrypt.hash(DEMO_USER.password, 10);

  const createdUser = await prisma.user.create({
    data: {
      email: DEMO_USER.email,
      password: hashedPassword,
      name: DEMO_USER.name,
    },
  });

  console.log(`[Seed] Created demo user: ${DEMO_USER.email}`);
  return createdUser;
}

module.exports = {
  DEMO_USER,
  seedDemoUser,
};
