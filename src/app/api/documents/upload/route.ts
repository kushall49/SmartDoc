import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { DocumentModel } from '@/models/Document';
import { uploadFile, validateFile } from '@/services/s3.service';
import { addDocumentToQueue } from '@/services/queue.service';
import { ok, err, unauthorized, serverError } from '@/lib/api-response';
import { checkApiRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

/** Allow AI/OCR pipeline to finish on Vercel (plan may cap lower). */
export const maxDuration = 300;

// Generate a unique file key scoped to the user
function buildS3Key(userId: string, originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const ext = originalName.split('.').pop() ?? '';
  return `documents/${userId}/${timestamp}-${random}${ext ? '.' + ext : ''}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorized();

    const rateLimitOk = await checkApiRateLimit(session.user.id);
    if (!rateLimitOk) return err('Rate limit exceeded. Please slow down.', 429);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return err('No file provided');

    const validationError = validateFile({
      name: file.name,
      type: file.type,
      size: file.size,
    });
    if (validationError) return err(validationError);

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = buildS3Key(session.user.id, file.name);

    await connectDB();

    // Create document record (status: uploading)
    const doc = await DocumentModel.create({
      userId: new mongoose.Types.ObjectId(session.user.id),
      name: file.name.replace(/\.[^/.]+$/, ''),
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      // Legacy compat fields
      filename: file.name,
      fileType: file.name.split('.').pop()?.toLowerCase() ?? '',
      fileSize: file.size,
      s3Key,
      s3Url: '',
      status: 'uploading',
    });

    // Upload file to S3 or local
    const s3Url = await uploadFile(s3Key, buffer, file.type);
    await DocumentModel.updateOne({ _id: doc._id }, { s3Url, status: 'pending' });

    // Queue async processing
    const jobId = await addDocumentToQueue(doc._id.toString());
    await DocumentModel.updateOne({ _id: doc._id }, { processingJobId: jobId });

    logger.info('Document uploaded and queued', {
      documentId: doc._id,
      name: doc.name,
      jobId,
    });

    return ok({
      documentId: doc._id.toString(),
      jobId,
      name: doc.name,
      status: 'pending',
    });
  } catch (e) {
    logger.error('Upload error', { error: String(e) });
    return serverError(e);
  }
}

export async function GET() {
  return ok({
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '10'),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES ?? 'pdf,png,jpg,jpeg,docx').split(','),
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ],
  });
}
