import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Prevent static optimization
export const dynamic = 'force-dynamic';

// This prevents the route from being built statically
export async function GET() {
  return Response.json({ message: 'Please use POST method' }, { status: 405 });
}

export async function POST(req) {
  // Only initialize Prisma when the function is actually called
  const prisma = new PrismaClient();

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Check if username is already taken
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return Response.json({ error: 'Username is already taken' }, { status: 400 });
    }

    // Validate username format (alphanumeric and underscores only)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return Response.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
    }

    // Validate username length
    if (username.length < 3 || username.length > 20) {
      return Response.json({ error: 'Username must be between 3 and 20 characters' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { 
        username,
        password: hashedPassword,
        email: `${username}@placeholder.com` // We still need an email for Google auth compatibility
      },
    });

    await prisma.$disconnect();
    return Response.json({ message: 'User created', userId: user.id });
  } catch (error) {
    console.error('Signup error:', error);
    await prisma.$disconnect();
    return Response.json({ error: 'Failed to create user' }, { status: 500 });
  }
}