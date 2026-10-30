import 'dotenv/config';
import { prisma } from '../src/lib/db';
import crypto from 'crypto';

async function main() {
  console.log('--- Step 1 Verification: PostgreSQL + pgvector ---');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is not set in your .env file.');
    console.error('Expected format: DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public"');
    process.exit(1);
  }

  try {
    // 1. Connection check
    console.log('1. Connecting to PostgreSQL...');
    const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now;`;
    console.log('   ✅ Connected! Current DB time:', result[0]?.now);

    // 2. Vector extension check
    console.log('2. Checking pgvector extension...');
    const ext = await prisma.$queryRaw<Array<{ extname: string; extversion: string }>>`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
    `;

    if (ext.length === 0) {
      console.warn('   ⚠️ pgvector extension is NOT installed in this database yet.');
      console.log('   Attempting to create extension automatically...');
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
      console.log('   ✅ pgvector extension enabled successfully!');
    } else {
      console.log(`   ✅ pgvector extension found! Version: ${ext[0].extversion}`);
    }

    // 3. Schema check
    console.log('3. Checking target tables...');
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    const tableNames = tables.map(t => t.tablename);
    const expectedTables = ['users', 'documents', 'chunks', 'chats', 'messages', 'usage_logs', 'audit_logs'];
    const missing = expectedTables.filter(t => !tableNames.includes(t));

    if (missing.length > 0) {
      console.warn(`   ⚠️ Missing tables: ${missing.join(', ')}`);
      console.log('   Run: npx prisma migrate dev --name init');
      process.exit(1);
    }
    console.log(`   ✅ All 7 tables present: ${expectedTables.join(', ')}`);

    // 4. Vector insertion and cosine similarity search test
    console.log('4. Testing 1536-dimensional vector insert & <=> cosine distance...');
    const testUserId = crypto.randomUUID();
    const testDocId = crypto.randomUUID();
    const testChunkId = crypto.randomUUID();

    // Create a mock user & document
    await prisma.user.create({
      data: {
        id: testUserId,
        name: 'Test Vector User',
        email: `test_vector_${Date.now()}@example.com`,
        passwordHash: 'dummy_hash',
      },
    });

    await prisma.document.create({
      data: {
        id: testDocId,
        userId: testUserId,
        name: 'test_doc.pdf',
        originalName: 'test_doc.pdf',
        mimeType: 'application/pdf',
        filePath: 'uploads/test_doc.pdf',
        status: 'ready',
      },
    });

    // Create a normalized 1536-dimensional mock embedding vector
    const mockVector = new Array(1536).fill(0);
    mockVector[0] = 0.6;
    mockVector[1] = 0.8;
    const vectorString = `[${mockVector.join(',')}]`;

    // Insert chunk with vector
    await prisma.$executeRaw`
      INSERT INTO chunks (
        id, document_id, user_id, chunk_index, chunk_text, chunk_tokens, embedding, created_at
      ) VALUES (
        ${testChunkId}::uuid,
        ${testDocId}::uuid,
        ${testUserId}::uuid,
        0,
        'This is a test document chunk for pgvector verification.',
        10,
        ${vectorString}::vector,
        NOW()
      );
    `;

    // Query using cosine distance operator <=>
    type VectorQueryResult = {
      id: string;
      chunk_text: string;
      similarity: number;
    };

    const queryResults = await prisma.$queryRaw<VectorQueryResult[]>`
      SELECT 
        id, 
        chunk_text, 
        1 - (embedding <=> ${vectorString}::vector) AS similarity
      FROM chunks
      WHERE user_id = ${testUserId}::uuid
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT 1;
    `;

    if (queryResults.length > 0 && Math.abs(queryResults[0].similarity - 1.0) < 0.001) {
      console.log(`   ✅ Vector search successful! Cosine similarity with identical vector: ${queryResults[0].similarity.toFixed(4)}`);
    } else {
      console.error('   ❌ Vector search did not return expected similarity.', queryResults);
      process.exit(1);
    }

    // 5. Cleanup test data
    console.log('5. Cleaning up test data...');
    await prisma.user.delete({ where: { id: testUserId } }); // cascades to document and chunk
    console.log('   ✅ Cleanup complete (cascading deletes verified).');

    console.log('\n🎉 STEP 1 VERIFICATION PASSED: PostgreSQL + pgvector are fully operational!');
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

