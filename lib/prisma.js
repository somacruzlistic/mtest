import { PrismaClient } from '@prisma/client'

const prismaGlobal = global

if (!prismaGlobal.prisma) {
  prismaGlobal.prisma = new PrismaClient()
}

const prisma = prismaGlobal.prisma

export default prisma 