import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import DocumentModel from '@/models/Document';
import { uploadToS3, generateS3Key, getContentType, getFileExtension } from '@/utils/s3';
import { validateFileSize, validateFileType, sanitizeFilename } from '@/utils/file';
import { handleApiError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
};

/**
 * POST /api/documents/upload
 * Upload a document file to S3 and create a database record
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string; // In production, get from session/auth

    if (!file) {
      throw new ValidationError('No file provided');
    }

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Validate file
    validateFileSize(file.size);
    validateFileType(file.name, file.type);

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name);
    const extension = getFileExtension(sanitizedFilename);
    const contentType = getContentType(extension);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate S3 key and upload
    const s3Key = generateS3Key(userId, sanitizedFilename);
    
    // Try to upload to S3, fallback to local storage if S3 is not available
    let s3Url: string;
    try {
      s3Url = await uploadToS3(buffer, s3Key, contentType);
    } catch (s3Error) {
      // S3 not available, use local path instead
      logger.warn('S3 upload failed, using local storage');
      s3Url = `/uploads/${s3Key}`;
      
      // Save file locally in development (you need to create S3 bucket for production)
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents', userId);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const localFilePath = path.join(uploadDir, path.basename(s3Key));
      fs.writeFileSync(localFilePath, buffer);
      
      logger.info('File saved locally', { path: localFilePath });
    }

    // Create document record in database
    const document = await DocumentModel.create({
      userId,
      filename: sanitizedFilename,
      originalName: file.name,
      fileType: extension,
      fileSize: file.size,
      s3Key,
      s3Url,
      status: {
        stage: 'uploaded',
        progress: 0,
        message: 'File uploaded successfully',
      },
    });

    logger.info('Document uploaded successfully', {
      documentId: document._id,
      userId,
      filename: sanitizedFilename,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'File uploaded successfully',
        document: {
          id: document._id,
          filename: document.filename,
          fileType: document.fileType,
          fileSize: document.fileSize,
          status: document.status,
          createdAt: document.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    logger.error('Document upload failed', error as Error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

/**
 * GET /api/documents/upload
 * Get upload configuration and limits
 */
export async function GET() {
  try {
    const { UPLOAD_CONFIG } = await import('@/lib/config');

    return NextResponse.json({
      success: true,
      config: {
        maxFileSize: UPLOAD_CONFIG.maxFileSize,
        maxFileSizeMB: UPLOAD_CONFIG.maxFileSize / (1024 * 1024),
        allowedFileTypes: UPLOAD_CONFIG.allowedFileTypes,
        allowedMimeTypes: UPLOAD_CONFIG.allowedMimeTypes,
      },
    });
  } catch (error) {
    const { error: errorMessage, statusCode } = handleApiError(error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
