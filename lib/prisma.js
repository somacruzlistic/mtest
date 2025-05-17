import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prismaClientSingleton = () => {
  return new PrismaClient();
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 