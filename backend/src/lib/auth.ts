/**
 * @deprecated Legacy NextAuth config replaced in Step 7.
 * All authentication logic is now managed via JWT + bcrypt in src/services/auth.service.ts.
 */
export * from '@/services/auth.service';
export { requireAuth, optionalAuth } from '@/server/middleware/auth.middleware';
