import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { addDocumentToQueue } from '@/services/queue.service';
import { ok, err, unauthorized, notFound, serverError } from '@/lib/api-response';
import { z } from 'zod';
import mongoose from 'mongoose';

const schema = z.object({
  documentId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return err(parsed.error.issues[0]?.message ?? 'Invalid request');

    const { documentId } = parsed.data;

    await connectDB();
    const doc = await DocumentModel.findOne({
      _id: documentId,
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!doc) return notFound('Document');

    // Allow re-processing of failed documents
    if (doc.status === 'processing') {
      return err('Document is already being processed');
    }

    const jobId = await addDocumentToQueue(documentId);
    await DocumentModel.updateOne(
      { _id: documentId },
      {
        status: 'pending',
        processingJobId: jobId,
        errorMessage: undefined,
      }
    );

    return ok({ documentId, jobId, status: 'pending' });
  } catch (e) {
    return serverError(e);
  }
}
