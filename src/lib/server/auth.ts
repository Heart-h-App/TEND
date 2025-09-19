import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from './db';
import type { User } from '@prisma/client';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'tend-secret-key-change-in-production';
const SALT_ROUNDS = 10;
const SESSION_EXPIRY_DAYS = 30;

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Session management
export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return {
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

export async function validateSession(token: string) {
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || new Date() > session.expiresAt) {
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export async function invalidateSession(token: string) {
  try {
    await prisma.session.delete({
      where: { token },
    });
    return true;
  } catch (error) {
    console.error('Error invalidating session:', error);
    return false;
  }
}

// JWT utilities
export function generateJWT(user: Pick<User, 'id' | 'email'>) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
  } catch (error) {
    return null;
  }
}

// User authentication
export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

// Create or update user with password
export async function createOrUpdateUserWithPassword(email: string, password: string) {
  const hashedPassword = await hashPassword(password);
  const now = new Date();
  
  // Try to find existing user
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  
  if (existingUser) {
    // Update existing user with password
    return await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash: hashedPassword,
        passwordCreatedAt: existingUser.passwordCreatedAt || now,
        passwordUpdatedAt: now,
      },
    });
  } else {
    // Create new user with password
    return await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        passwordCreatedAt: now,
        passwordUpdatedAt: now,
      },
    });
  }
}

// Check if user has password
export async function userHasPassword(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true },
  });
  
  return !!user?.passwordHash;
}
