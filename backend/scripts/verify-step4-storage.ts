import 'dotenv/config';
import path from 'path';
import { prisma } from '../src/lib/db';
import {
  saveFile,
  readFile,
  deleteFile,
  fileExists,
  validateFile,
} from '../src/services/storage.service';
import crypto from 'crypto';

async function main() {
  console.log('===========================================================');
  console.log('--- STEP 4 VERIFICATION: S3 + Fallback → Local Disk Only ---');
  console.log('===========================================================\n');

  const testUserId = crypto.randomUUID();
  const testDocId = crypto.randomUUID();

  try {
    // 1. Test validation rules (10MB limit + MIME filters)
    console.log('1. Testing upload validation rules...');

    // Unsupported MIME
    const invalidMime = validateFile({
      name: 'malicious.exe',
      type: 'application/x-msdownload',
      size: 1024,
    });
    if (!invalidMime || !invalidMime.includes('Unsupported file type')) {
      throw new Error(`Expected unsupported MIME rejection, got: ${invalidMime}`);
    }
    console.log('   ✅ Unsupported MIME correctly rejected.');

    // Oversized (>10MB)
    const oversized = validateFile({
      name: 'large_archive.pdf',
      type: 'application/pdf',
      size: 11 * 1024 * 1024, // 11 MB
    });
    if (!oversized || !oversized.includes('exceeds the 10 MB limit')) {
      throw new Error(`Expected oversized rejection, got: ${oversized}`);
    }
    console.log('   ✅ Oversized file (>10MB) correctly rejected.');

    // Valid file
    const valid = validateFile({
      name: 'annual_report.pdf',
      type: 'application/pdf',
      size: 2 * 1024 * 1024, // 2 MB
    });
    if (valid !== null) {
      throw new Error(`Expected valid file to pass, got error: ${valid}`);
    }
    console.log('   ✅ Valid PDF (2MB) accepted.');

    // 2. Test saving to local ./uploads directory
    console.log('\n2. Testing local disk save (./uploads/documents/<userId>/...)...');
    const mockContent = 'SmartDocIQ PDF document content stored directly on local disk without S3.';
    const mockBuffer = Buffer.from(mockContent, 'utf-8');

    const saved = await saveFile(testUserId, 'financial_summary.pdf', mockBuffer);
    console.log(`   Saved relative path: ${saved.filePath}`);
    console.log(`   Public serving URL: ${saved.publicUrl}`);
    console.log(`   Absolute disk path: ${saved.absolutePath}`);

    const onDisk = await fileExists(saved.filePath);
    if (!onDisk) {
      throw new Error(`File was not found on disk at: ${saved.absolutePath}`);
    }
    console.log('   ✅ File confirmed present on local disk.');

    // 3. Test reading file back
    console.log('\n3. Testing reading file from local storage...');
    const readBuffer = await readFile(saved.filePath);
    const readString = readBuffer.toString('utf-8');
    if (readString !== mockContent) {
      throw new Error(`Content mismatch! Expected "${mockContent}", read "${readString}"`);
    }
    console.log('   ✅ File read matches original buffer byte-for-byte.');

    // 4. Test directory traversal security
    console.log('\n4. Testing path traversal protection...');
    let traversalBlocked = false;
    try {
      await readFile('../../../secret.txt');
    } catch {
      traversalBlocked = true;
    }
    if (!traversalBlocked) {
      throw new Error('Directory traversal attempt was NOT blocked!');
    }
    console.log('   ✅ Directory traversal attempt safely blocked.');

    // 5. Test PostgreSQL document record linking
    console.log('\n5. Testing PostgreSQL document creation with file_path...');
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Storage Test User',
        email: `storage_${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
      },
    });

    const docRecord = await prisma.document.create({
      data: {
        id: testDocId,
        userId: testUserId,
        name: 'financial_summary',
        originalName: 'financial_summary.pdf',
        mimeType: 'application/pdf',
        sizeBytes: saved.sizeBytes,
        filePath: saved.filePath, // Storing clean local path
        status: 'ready',
      },
    });

    console.log(`   Document inserted in Postgres with id: ${docRecord.id}, file_path: "${docRecord.filePath}"`);
    if (docRecord.filePath !== saved.filePath) {
      throw new Error('Stored file_path mismatch in PostgreSQL.');
    }
    console.log('   ✅ PostgreSQL document successfully linked to local disk file.');

    // 6. Test file deletion and database cleanup
    console.log('\n6. Testing deletion and cleanup...');
    await deleteFile(saved.filePath);
    const stillExists = await fileExists(saved.filePath);
    if (stillExists) {
      throw new Error('File still exists on disk after deleteFile call.');
    }
    console.log('   ✅ File removed from local disk.');

    await prisma.user.delete({ where: { id: testUserId } }); // cascades to document
    console.log('   ✅ Test user and document cleaned up in PostgreSQL.');

    console.log('\n===========================================================');
    console.log('🎉 STEP 4 VERIFICATION PASSED: S3 Dropped, Local Storage Only!');
    console.log('===========================================================');
  } catch (error) {
    console.error('\n❌ Step 4 Verification Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

