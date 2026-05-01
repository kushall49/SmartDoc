require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.collection('documents').find({ rawText: { $regex: /DataBridge/i } }).toArray();
  if (docs.length > 0) {
     console.log('Contract text:', docs[0].rawText.substring(0, 500));
  } else {
     console.log('No DataBridge found');
  }
  process.exit(0);
}
run();
