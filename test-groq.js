require('dotenv').config({ path: '.env.local' });
const { OpenAI } = require('openai');
const mongoose = require('mongoose');

const openai = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.collection('documents').find({status: 'ready'}).toArray();
  const docList = docs.map(d => 'ID: ' + d._id + '\nName: ' + (d.name || d.originalName) + '\nSummary: ' + (d.summary || 'No summary available.')).join('\n\n');
  console.log('Sending docs:', docs.length);
  
  try {
     const response = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an AI that clusters documents into meaningful thematic topics. Group the provided documents into 2-5 clusters based on their contents and summaries. Return ONLY a valid JSON object strictly matching this format: {"clusters": [{"theme": "Theme Name", "documents": [{"id": "doc_id", "name": "doc_name", "score": 1.0}]}]}. Do not include markdown formatting or extra text.'
          },
          {
            role: 'user',
            content: 'Cluster these documents:\n\n' + docList
          }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });
      console.log('--- RESPONSE ---');
      console.log(response.choices[0].message.content);
  } catch(e) {
      console.error(e);
  }
  process.exit(0);
}
run();
