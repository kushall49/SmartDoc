import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { ok, unauthorized, serverError } from '@/lib/api-response';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    await connectDB();

    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(session.user.id),
    };
    if (status) query.status = status;
    if (type) query.documentType = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    const [documents, total] = await Promise.all([
      DocumentModel.find(query)
        .select('-rawText -extractedText')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DocumentModel.countDocuments(query),
    ]);

    return ok(
      { documents, total },
      { page, limit, pages: Math.ceil(total / limit) }
    );
  } catch (e) {
    return serverError(e);
  }
}
