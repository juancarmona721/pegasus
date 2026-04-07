const { PrismaClient } = require("../../generated/prisma");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
});

prisma.$connect()
  .then(() => console.log("Prisma Client connected"))
  .catch((err) => console.error("Prisma Client connection error:", err));

module.exports = prisma;