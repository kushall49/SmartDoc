require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.collection('documents').find({}).toArray();
  console.log(docs.map(d => ({ name: d.name, entitiesCount: d.entities?.length })));
  process.exit(0);
}
run();
