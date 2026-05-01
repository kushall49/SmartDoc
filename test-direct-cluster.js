require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // mock user id
  const docs = await mongoose.connection.collection('documents').find({status: 'ready'}).toArray();
  if (!docs.length) {
    console.log('No ready docs.');
    process.exit(1);
  }
  const userId = docs[0].userId.toString();
  console.log('Found userId:', userId, 'with docs:', docs.length);
  
  const { clusterDocumentsByTopic } = require('./src/services/intelligence.service'); // Cannot wait, it's TS... We can't require TS trivially without ts-node.
  
  const { execSync } = require('child_process');
  
  process.exit(0);
}
run();
