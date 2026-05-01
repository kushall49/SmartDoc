require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.collection('documents').find({status: 'ready'}).toArray();
  const userId = docs[0].userId.toString();
  
  const Model = mongoose.model('Document', new mongoose.Schema({}, { strict: false }));
  // simulate
  const mdocs = await Model.find({ userId, status: 'ready' });
  console.log('Mdocs length with string:', mdocs.length);
  process.exit(0);
}
run();
