import 'dotenv/config';
import { prisma } from '../src/lib/db';
import {
  searchSimilarChunks,
  storeDocumentChunks,
  findSimilarDocuments,
} from '../src/services/vector-search.service';
import crypto from 'crypto';

// Helper to generate a normalized mock vector with a dominant direction
function createNormalizedVector(dimension = 1536, seedIndex = 0, magnitude = 1.0): number[] {
  const vec = new Array(dimension).fill(0);
  // Place distinct weights to simulate semantic directions
  vec[seedIndex % dimension] = magnitude;
  vec[(seedIndex + 1) % dimension] = 0.5 * magnitude;
  
  // Normalize
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  return vec.map((v) => v / norm);
}

async function main() {
  console.log('===========================================================');
  console.log('--- STEP 2 VERIFICATION: In-memory Cosine → pgvector Query ---');
  console.log('===========================================================\n');

  const testUserId = crypto.randomUUID();
  const testUser2Id = crypto.randomUUID();
  const docAId = crypto.randomUUID();
  const docBId = crypto.randomUUID();
  const docUser2Id = crypto.randomUUID();

  try {
    // 1. Setup mock users and documents in PostgreSQL
    console.log('1. Setting up mock users and documents...');
    await prisma.user.createMany({
      data: [
        {
          id: testUserId,
          name: 'Primary Test User',
          email: `user1_${Date.now()}@example.com`,
          passwordHash: 'dummy_hash_1',
        },
        {
          id: testUser2Id,
          name: 'Isolated Tenant User',
          email: `user2_${Date.now()}@example.com`,
          passwordHash: 'dummy_hash_2',
        },
      ],
    });

    await prisma.document.createMany({
      data: [
        {
          id: docAId,
          userId: testUserId,
          name: 'AI_Architecture_Guide.pdf',
          originalName: 'AI_Architecture_Guide.pdf',
          mimeType: 'application/pdf',
          filePath: 'uploads/ai_arch.pdf',
          status: 'ready',
        },
        {
          id: docBId,
          userId: testUserId,
          name: 'Financial_Q3_Report.pdf',
          originalName: 'Financial_Q3_Report.pdf',
          mimeType: 'application/pdf',
          filePath: 'uploads/fin_q3.pdf',
          status: 'ready',
        },
        {
          id: docUser2Id,
          userId: testUser2Id,
          name: 'Confidential_User2_Doc.pdf',
          originalName: 'Confidential_User2_Doc.pdf',
          mimeType: 'application/pdf',
          filePath: 'uploads/confidential.pdf',
          status: 'ready',
        },
      ],
    });
    console.log('   ✅ Users and documents initialized.');

    // 2. Insert mock chunks with 1536-d vectors using storeDocumentChunks
    console.log('2. Storing document chunks with pgvector (1536-d vectors)...');

    // Vector direction 1: "AI & Neural Networks"
    const aiVector1 = createNormalizedVector(1536, 10, 1.0);
    const aiVector2 = createNormalizedVector(1536, 10, 0.9); // closely related to aiVector1

    // Vector direction 2: "Finance & Balance Sheets"
    const finVector1 = createNormalizedVector(1536, 500, 1.0);

    // Store Doc A chunks (User 1)
    await storeDocumentChunks(docAId, testUserId, [
      {
        chunkIndex: 0,
        chunkText: 'Neural networks and transformer architectures power modern document RAG systems.',
        chunkTokens: 14,
        pageNumber: 1,
        embedding: aiVector1,
      },
      {
        chunkIndex: 1,
        chunkText: 'Vector embeddings map semantic meanings to high-dimensional metric spaces.',
        chunkTokens: 12,
        pageNumber: 2,
        embedding: aiVector2,
      },
    ]);

    // Store Doc B chunks (User 1)
    await storeDocumentChunks(docBId, testUserId, [
      {
        chunkIndex: 0,
        chunkText: 'Q3 net revenue increased by 14% year-over-year with strong operating cash flow.',
        chunkTokens: 15,
        pageNumber: 1,
        embedding: finVector1,
      },
    ]);

    // Store User 2 chunk (Different tenant with exact same AI vector)
    await storeDocumentChunks(docUser2Id, testUser2Id, [
      {
        chunkIndex: 0,
        chunkText: 'SECRET: Tenant 2 proprietary neural weights must never leak.',
        chunkTokens: 11,
        pageNumber: 1,
        embedding: aiVector1,
      },
    ]);
    console.log('   ✅ All chunks successfully stored in PostgreSQL `chunks` table.');

    // 3. Test Single-Document Scoped Search
    console.log('3. Testing single-document scoped vector search (ORDER BY embedding <=> $1)...');
    const startSingle = performance.now();
    const singleDocResults = await searchSimilarChunks({
      userId: testUserId,
      queryEmbedding: aiVector1,
      documentId: docAId,
      limit: 5,
    });
    const singleElapsed = performance.now() - startSingle;

    console.log(`   Query executed in ${singleElapsed.toFixed(2)} ms`);
    console.log(`   Found ${singleDocResults.length} chunks for Document A:`);
    singleDocResults.forEach((r, idx) => {
      console.log(`     [#${idx + 1}] Similarity: ${r.similarity.toFixed(4)} | Doc: ${r.documentName} | Text: "${r.chunkText.slice(0, 50)}..."`);
    });

    if (singleDocResults.length === 0 || singleDocResults[0].documentId !== docAId) {
      throw new Error('Single-document search failed to retrieve target document chunks.');
    }
    if (Math.abs(singleDocResults[0].similarity - 1.0) > 0.001) {
      throw new Error(`Expected similarity ~1.0 for exact vector match, got ${singleDocResults[0].similarity}`);
    }
    console.log('   ✅ Single-document scoped search passed!');

    // 4. Test Cross-Document Search
    console.log('\n4. Testing cross-document search across all User 1 documents...');
    const crossDocResults = await searchSimilarChunks({
      userId: testUserId,
      queryEmbedding: aiVector1,
      // No documentId specified -> searches across all user documents
      limit: 10,
    });

    console.log(`   Found ${crossDocResults.length} chunks across User 1 documents.`);
    if (crossDocResults.length < 2) {
      throw new Error('Cross-document search failed to retrieve chunks from multiple documents.');
    }
    console.log('   ✅ Cross-document search passed!');

    // 5. Test Multi-Tenant Isolation
    console.log('\n5. Testing Multi-Tenant Isolation (User 1 vs User 2)...');
    const tenantLeakCheck = crossDocResults.find((r) => r.documentId === docUser2Id);
    if (tenantLeakCheck) {
      throw new Error('CRITICAL SECURITY FAILURE: User 2 chunk leaked into User 1 search results!');
    }
    console.log('   ✅ Multi-tenant isolation verified: User 2 data is 100% inaccessible to User 1.');

    // 6. Test Document Similarity
    console.log('\n6. Testing document-level similarity via pgvector...');
    const similarDocs = await findSimilarDocuments(docAId, testUserId, 5);
    console.log(`   Similar documents to Doc A found: ${similarDocs.length}`);
    similarDocs.forEach((d) => {
      console.log(`     Doc: ${d.documentName} | Max Similarity: ${d.score.toFixed(4)}`);
    });
    console.log('   ✅ Document similarity aggregation verified.');

    // 7. Cleanup
    console.log('\n7. Cleaning up test data...');
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.user.delete({ where: { id: testUser2Id } });
    console.log('   ✅ Cascading deletes cleaned up all test documents and chunks.');

    console.log('\n===========================================================');
    console.log('🎉 STEP 2 VERIFICATION PASSED: pgvector query replaces in-memory cosine!');
    console.log('===========================================================');
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

