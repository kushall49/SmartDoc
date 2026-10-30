import { Response, NextFunction } from 'express';
import { verifyToken, signToken, AuthUserPayload } from '@/services/auth.service';
import { AuthenticatedRequest, OptionalAuthRequest } from '../types';

export { signToken as signJwtToken };
export type { AuthUserPayload as AuthUser };

/**
 * Extracts JWT token from Authorization header (`Bearer <token>`)
 * or from httpOnly cookie (`auth_token`).
 */
function extractToken(req: any): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }
  return null;
}

/**
 * Strict authentication middleware for protected routes.
 * Replaces NextAuth `getServerSession()`.
 * Sets `req.user = { id, email, role, name }` on success.
 */
export function requireAuth(
  req: any,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing authentication token.',
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired authentication token.',
    });
    return;
  }

  (req as AuthenticatedRequest).user = {
    id: payload.id,
    email: payload.email,
    role: payload.role || 'user',
    name: payload.name,
  };

  next();
}

/**
 * Optional authentication middleware for public endpoints with optional user context.
 */
export function optionalAuth(
  req: any,
  _res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      (req as OptionalAuthRequest).user = {
        id: payload.id,
        email: payload.email,
        role: payload.role || 'user',
        name: payload.name,
      };
    }
  }
  next();
}
