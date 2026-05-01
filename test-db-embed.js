require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.collection('documents').find({}).toArray();
  const embeddings = await mongoose.connection.collection('embeddings').countDocuments();
  console.log('Total documents:', docs.length);
  console.log('Total embeddings in DB:', embeddings);
  
  if (embeddings === 0) {
      console.log('NO EMBEDDINGS FOUND. Topic clusters need embeddings to work.');
  }
  process.exit(0);
}
run();
