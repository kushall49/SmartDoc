import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  getUserProfile,
} from '@/services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Cookie configuration for cross-origin security (Gotcha 3)
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /api/auth/register
 * Replaces NextAuth credentials registration
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input',
      });
      return;
    }

    const { user, token } = await registerUser(parsed.data);

    res.cookie('auth_token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (error: any) {
    const statusCode = error.message.includes('already exists') ? 409 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Replaces NextAuth signIn('credentials')
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid credentials',
      });
      return;
    }

    const { user, token } = await loginUser(parsed.data);

    res.cookie('auth_token', token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      token,
      user,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message || 'Invalid email or password',
    });
  }
});

/**
 * GET /api/auth/me
 * Replaces NextAuth useSession() / getServerSession()
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await getUserProfile(authReq.user.id);

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Replaces NextAuth signOut()
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('auth_token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;
