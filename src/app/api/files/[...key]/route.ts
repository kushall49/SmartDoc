import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { getFileBuffer } from '@/services/s3.service';
import { unauthorized, notFound, serverError } from '@/lib/api-response';
import mongoose from 'mongoose';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyParts } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const key = keyParts.join('/');
    await connectDB();

    const doc = await DocumentModel.findOne({
      s3Key: key,
      userId: new mongoose.Types.ObjectId(session.user.id),
    }).lean();

    if (!doc) return notFound('File');

    const buffer = await getFileBuffer(key);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': doc.mimeType ?? 'application/octet-stream',
        'Content-Disposition': `inline; filename="${doc.originalName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
