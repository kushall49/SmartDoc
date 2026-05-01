require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.collection('documents').find({
     $or: [
        { extractedText: { $regex: /M&E Kumar/i } },
        { rawText: { $regex: /M&E Kumar/i } }
     ]
  }).toArray();
  console.log('Found docs matching M&E Kumar with space:', docs.length);
  
  const docs2 = await mongoose.connection.collection('documents').find({
     $or: [
        { extractedText: { $regex: /Kumar/i } },
        { rawText: { $regex: /Kumar/i } }
     ]
  }).toArray();
  console.log('Found docs matching Kumar:', docs2.length);

  if (docs2.length > 0) {
    const text = docs2[0].rawText.substring(0, 200);
    console.log('Sample text:', text);
  }
  process.exit(0);
}
run();
