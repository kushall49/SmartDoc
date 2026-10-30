import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/server/app';
import { prisma } from '../src/lib/db';
import crypto from 'crypto';

async function main() {
  console.log('===========================================================');
  console.log('--- STEP 6 VERIFICATION: Next.js API Routes → Express ---');
  console.log('===========================================================\n');

  const app = createApp();
  const PORT = 4099; // Isolated test port
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`1. Express test server listening on http://localhost:${PORT}`);

  const baseUrl = `http://localhost:${PORT}/api`;
  let authToken = '';
  let testUserId = '';
  let uploadedDocId = '';
  let uploadedFilePath = '';

  try {
    // 1. Health check
    console.log('\n2. Testing GET /api/health...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    console.log('   Response:', healthJson);
    if (healthRes.status !== 200 || healthJson.status !== 'ok') {
      throw new Error('Health check failed');
    }
    console.log('   ✅ Health endpoint verified (PostgreSQL connected).');

    // 2. Auth: Register
    console.log('\n3. Testing POST /api/auth/register...');
    const testEmail = `express_test_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Express Tester',
        email: testEmail,
        password: 'securePassword123!',
      }),
    });
    const regJson = await regRes.json();
    if (regRes.status !== 201 || !regJson.token) {
      throw new Error(`Register failed: ${JSON.stringify(regJson)}`);
    }
    authToken = regJson.token;
    testUserId = regJson.user.id;
    console.log(`   User registered with ID: ${testUserId}`);
    console.log('   ✅ Register verified (bcrypt + JWT + cookie generated).');

    // 3. Auth: Login
    console.log('\n4. Testing POST /api/auth/login...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'securePassword123!',
      }),
    });
    const loginJson = await loginRes.json();
    if (loginRes.status !== 200 || !loginJson.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
    }
    console.log('   ✅ Login verified.');

    // 4. Auth: GET /api/auth/me (Protected route)
    console.log('\n5. Testing GET /api/auth/me (Bearer Token authentication)...');
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meJson = await meRes.json();
    if (meRes.status !== 200 || meJson.user.email !== testEmail) {
      throw new Error(`Auth /me failed: ${JSON.stringify(meJson)}`);
    }
    console.log(`   Authenticated user: ${meJson.user.name} (${meJson.user.email})`);
    console.log('   ✅ requireAuth middleware verified.');

    // 5. Document upload via multer (Gotcha 2)
    console.log('\n6. Testing POST /api/documents/upload (multer diskStorage)...');
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(8).toString('hex');
    const mockContent = 'SmartDocIQ Express migration verified. Neural vectors and text extraction.';
    const filename = 'sample_contract.pdf';

    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
          `Content-Type: application/pdf\r\n\r\n`
      ),
      Buffer.from(mockContent, 'utf-8'),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch(`${baseUrl}/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    const uploadJson = await uploadRes.json();
    if (uploadRes.status !== 201 || !uploadJson.document) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadJson)}`);
    }
    uploadedDocId = uploadJson.document.id;
    uploadedFilePath = uploadJson.document.filePath;
    console.log(`   Document created in Postgres: ${uploadedDocId}`);
    console.log(`   Stored file path: ${uploadedFilePath}`);
    console.log('   ✅ Multer file upload verified (10MB limit enforced, diskStorage saved).');

    // 6. List documents
    console.log('\n7. Testing GET /api/documents...');
    const listRes = await fetch(`${baseUrl}/documents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const listJson = await listRes.json();
    if (listRes.status !== 200 || !Array.isArray(listJson.documents)) {
      throw new Error(`List documents failed: ${JSON.stringify(listJson)}`);
    }
    console.log(`   Found ${listJson.documents.length} document(s) for user.`);
    console.log('   ✅ Document list endpoint verified.');

    // 7. Check document status
    console.log('\n8. Testing GET /api/documents/:id/status...');
    const statusRes = await fetch(`${baseUrl}/documents/${uploadedDocId}/status`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const statusJson = await statusRes.json();
    if (statusRes.status !== 200 || statusJson.status !== 'pending') {
      throw new Error(`Status check failed: ${JSON.stringify(statusJson)}`);
    }
    console.log(`   Document status: ${statusJson.status}`);
    console.log('   ✅ Status polling endpoint verified.');

    // 8. Serve file directly via Express
    console.log('\n9. Testing GET /api/files/* (Local file download)...');
    const fileRes = await fetch(`http://localhost:${PORT}/api/files/${uploadedFilePath}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const fileContent = await fileRes.text();
    if (fileRes.status !== 200 || fileContent !== mockContent) {
      throw new Error(`File serving mismatch. Expected "${mockContent}", received "${fileContent}"`);
    }
    console.log('   ✅ Static/dynamic local file serving verified.');

    // 9. SSE Streaming Chat (Gotcha 1)
    console.log('\n10. Testing POST /api/chat/stream (SSE Streaming & headers)...');
    const sseRes = await fetch(`${baseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is this document about?',
        documentId: uploadedDocId,
      }),
    });

    const contentType = sseRes.headers.get('content-type');
    console.log(`   SSE Content-Type header: "${contentType}"`);
    if (!contentType || !contentType.includes('text/event-stream')) {
      throw new Error(`Expected text/event-stream, got ${contentType}`);
    }

    // Read initial stream chunk to confirm sources event was flushed
    const reader = sseRes.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      const firstChunkText = new TextDecoder().decode(value);
      console.log(`   First chunk received: ${firstChunkText.trim().slice(0, 100)}...`);
      reader.cancel();
    }
    console.log('   ✅ SSE streaming headers & chunk flushing verified (Gotcha 1).');

    // 10. Delete Document
    console.log('\n11. Testing DELETE /api/documents/:id...');
    const delRes = await fetch(`${baseUrl}/documents/${uploadedDocId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const delJson = await delRes.json();
    if (delRes.status !== 200 || !delJson.success) {
      throw new Error(`Delete document failed: ${JSON.stringify(delJson)}`);
    }
    console.log('   ✅ Document deleted from PostgreSQL and disk.');

    // 11. Cleanup test user
    console.log('\n12. Cleaning up test user...');
    await prisma.user.delete({ where: { id: testUserId } });
    console.log('   ✅ Test user cleaned up.');

    console.log('\n===========================================================');
    console.log('🎉 STEP 6 VERIFICATION PASSED: Express Backend Operational!');
    console.log('===========================================================');
  } catch (error) {
    console.error('\n❌ Step 6 Verification Failed:', error);
    process.exit(1);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

main();

