import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { getJobStatus } from '@/services/queue.service';
import { ok, unauthorized, notFound, serverError } from '@/lib/api-response';
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
      .select(
        'status errorMessage processingJobId processingStartedAt processingCompletedAt name documentType summary'
      )
      .lean();

    if (!doc) return notFound('Document');

    const jobStatus =
      doc.processingJobId ? await getJobStatus(doc.processingJobId) : null;

    return ok({
      documentId: id,
      name: doc.name,
      status: doc.status,
      documentType: doc.documentType,
      summary: doc.summary,
      errorMessage: doc.errorMessage,
      processingStartedAt: doc.processingStartedAt,
      processingCompletedAt: doc.processingCompletedAt,
      jobStatus,
    });
  } catch (e) {
    return serverError(e);
  }
}
