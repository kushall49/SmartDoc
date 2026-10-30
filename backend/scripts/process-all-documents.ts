import { prisma } from '../src/lib/db';
import { processDocument } from '../src/services/document-processor.service';

async function main() {
  console.log('=== Running Document Ingestion Pipeline for all documents ===');
  const docs = await prisma.document.findMany();
  console.log(`Found ${docs.length} document(s) in PostgreSQL.`);

  for (const doc of docs) {
    console.log(`\nProcessing document: ${doc.id} (${doc.name}, status=${doc.status}, file=${doc.filePath})...`);
    try {
      await processDocument(doc.id);
      const updated = await prisma.document.findUnique({
        where: { id: doc.id },
        include: { _count: { select: { chunks: true } } },
      });
      console.log(`-> SUCCESS: ${doc.name} status=${updated?.status}, rawTextLen=${(updated?.rawText || '').length}, chunks=${updated?._count.chunks}, summaryLen=${(updated?.summary || '').length}`);
    } catch (err) {
      console.error(`-> FAILED: ${doc.name}:`, err);
    }
  }

  console.log('\n=== All documents processed ===');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

