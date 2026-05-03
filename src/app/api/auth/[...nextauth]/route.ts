import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/** Credentials + Mongoose require Node; avoids Edge/runtime quirks on Vercel. */
export const runtime = 'nodejs';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
