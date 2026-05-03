import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import {
  addDocumentToQueue,
  shouldUseBullMqQueue,
} from '@/services/queue.service';
import { processDocument } from '@/services/document-processor.service';
import { ok, err, unauthorized, notFound, serverError } from '@/lib/api-response';
import { z } from 'zod';
import mongoose from 'mongoose';

const schema = z.object({
  documentId: z.string().min(1),
});

/** Second invocation after upload; gives full maxDuration budget (plan-dependent). */
export const maxDuration = 300;

const ACTIVE_PROCESSING_MS = 4 * 60 * 1000;

function isActivelyProcessing(doc: {
  status: string;
  processingStartedAt?: Date | null;
}): boolean {
  if (doc.status !== 'processing') return false;
  if (!doc.processingStartedAt) return false;
  return (
    Date.now() - new Date(doc.processingStartedAt).getTime() <
    ACTIVE_PROCESSING_MS
  );
}

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
    }).select('status processingJobId processingStartedAt');

    if (!doc) return notFound('Document');

    if (shouldUseBullMqQueue()) {
      if (isActivelyProcessing(doc)) {
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
    }

    if (doc.status === 'ready') {
      return ok({
        documentId,
        status: 'ready',
        message: 'Already processed',
      });
    }

    if (isActivelyProcessing(doc)) {
      return err('Document is already being processed');
    }

    await processDocument(documentId);

    return ok({ documentId, status: 'ready' });
  } catch (e) {
    return serverError(e);
  }
}
