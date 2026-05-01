import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { Embedding } from '@/models/Embedding';
import { Chat } from '@/models/Chat';
import { deleteFile } from '@/services/s3.service';
import { ok, unauthorized, notFound, serverError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    await connectDB();
    const doc = await DocumentModel.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id),
    })
      .select('-rawText -extractedText')
      .lean();

    if (!doc) return notFound('Document');

    return ok({ document: doc });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    await connectDB();
    const doc = await DocumentModel.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!doc) return notFound('Document');

    // Delete everything related to this document
    await Promise.allSettled([
      deleteFile(doc.s3Key),
      Embedding.deleteMany({ documentId: doc._id }),
      Chat.deleteMany({ documentId: doc._id }),
      doc.deleteOne(),
    ]);

    logger.info('Document deleted', { documentId: doc._id });
    return ok({ deleted: true, documentId: id });
  } catch (e) {
    return serverError(e);
  }
}
