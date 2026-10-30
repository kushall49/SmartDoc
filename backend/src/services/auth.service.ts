import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'smartdociq-interview-ready-jwt-secret-key-32chars';

export const JWT_EXPIRES_IN = '7d';
const BCRYPT_SALT_ROUNDS = 12;

export interface AuthUserPayload {
  id: string;
  email: string;
  role: string;
  name?: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compares plaintext password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Signs a JWT containing essential user identity claims.
 */
export function signToken(user: AuthUserPayload, expiresIn = JWT_EXPIRES_IN): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: expiresIn as any }
  );
}

/**
 * Verifies a JWT token and returns the decoded payload, or null if invalid/expired.
 */
export function verifyToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUserPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Registers a new user in PostgreSQL with bcrypt-hashed password.
 */
export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: SafeUser; token: string }> {
  const normalizedEmail = input.email.toLowerCase().trim();

  // Multi-tenant email uniqueness check
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'user',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const token = signToken(user);
  logger.info('User registered successfully', { userId: user.id, email: user.email });

  return { user, token };
}

/**
 * Authenticates user credentials against PostgreSQL and generates a signed JWT.
 */
export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: SafeUser; token: string }> {
  const normalizedEmail = input.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  const safeUser: SafeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  const token = signToken(safeUser);
  logger.info('User authenticated successfully', { userId: user.id, email: user.email });

  return { user: safeUser, token };
}

/**
 * Retrieves a sanitized user profile by UUID from PostgreSQL.
 */
export async function getUserProfile(userId: string): Promise<SafeUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

