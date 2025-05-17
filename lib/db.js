// This file is intentionally empty during build time
// The actual database connection will be established at runtime
export const getPrismaClient = () => {
  if (process.env.NODE_ENV === 'production') {
    const { PrismaClient } = require('@prisma/client');
    return new PrismaClient();
  } else {
    if (!global.prisma) {
      const { PrismaClient } = require('@prisma/client');
      global.prisma = new PrismaClient();
    }
    return global.prisma;
  }
}; 