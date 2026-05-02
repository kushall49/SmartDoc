import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { ok, err, serverError } from '@/lib/api-response';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? 'Validation failed');
    }

    const { name, email, password } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email }).select('_id').lean();
    if (existing) {
      return err('An account with this email already exists', 409);
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'user',
    });

    return ok(
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      undefined
    );
  } catch (e) {
    return serverError(e);
  }
}
