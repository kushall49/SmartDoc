# SmartDocIQ

**AI Document Intelligence Platform** - Extract, Analyze, and Chat with Your Documents

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.3-green)](https://www.mongodb.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-orange)](https://openai.com/)

## 🚀 Features

- **📄 Document Upload**: Support for PDFs, images, invoices, contracts, and more
- **🔍 OCR Processing**: Extract text from images and scanned documents
- **🤖 AI Analysis**: 
  - Intelligent summarization
  - Entity extraction (names, dates, amounts, IDs, etc.)
  - Document type classification
  - Anomaly and fraud detection
- **🧠 Semantic Search**: Find documents using natural language queries
- **💬 RAG Chat**: Chat with your documents using Retrieval-Augmented Generation
- **☁️ Cloud Storage**: Secure file storage with AWS S3
- **⚡ Background Processing**: Asynchronous document processing with job queues
- **🎨 Modern UI**: Clean interface built with Next.js 15 and ShadCN

## 🏗️ Architecture

```
SmartDocIQ/
├── src/
│   ├── app/              # Next.js 15 App Router
│   ├── components/       # React components (ShadCN)
│   ├── lib/             # Core utilities and configurations
│   ├── models/          # MongoDB schemas
│   ├── services/        # AI services (OCR, NLP, embeddings)
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions
├── public/              # Static assets
└── tests/              # Test suites
```

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- ShadCN UI Components

**Backend:**
- Next.js API Routes
- MongoDB + Mongoose
- BullMQ (Job Queue)
- Redis

**AI/ML:**
- OpenAI GPT-4 (Summarization, Entity Extraction, Classification)
- OpenAI Embeddings (Semantic Search)
- Tesseract.js (OCR)
- RAG (Retrieval-Augmented Generation)

**Infrastructure:**
- AWS S3 (File Storage)
- NextAuth.js (Authentication)

## 📋 Prerequisites

- Node.js >= 18.17.0
- MongoDB
- Redis
- AWS Account (for S3)
- OpenAI API Key

## 🚀 Getting Started

### 1. Clone and Install

```bash
git clone <your-repo>
cd smartdociq
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run e2e

# Generate coverage report
npm run test:coverage
```

## 📚 API Documentation

### Upload Document
```
POST /api/documents/upload
Content-Type: multipart/form-data
```

### Process Document
```
POST /api/documents/process
Body: { documentId: string }
```

### Search Documents
```
GET /api/documents/search?q=query
```

### Chat with Document
```
POST /api/chat
Body: { documentId: string, message: string }
```

## 🎯 Use Cases

- **Invoice Processing**: Extract vendor names, amounts, dates
- **Contract Analysis**: Identify key terms and parties
- **Resume Screening**: Extract skills, experience, education
- **Report Summarization**: Generate executive summaries
- **Compliance Checking**: Detect anomalies and missing information

## 📈 Performance

- Async processing with job queues
- Vector search for fast semantic retrieval
- Optimized embeddings storage
- Caching strategies for repeated queries

## 🔒 Security

- Secure file uploads with validation
- Rate limiting on API endpoints
- Authentication with NextAuth.js
- Encrypted data transmission
- Role-based access control

## 🤝 Contributing

This is a portfolio project. Feel free to fork and customize for your needs.

## 📄 License

MIT License - feel free to use this project for learning and portfolio purposes.

## 👤 Author

Built by Kushal L as a portfolio project showcasing:
- Full-stack development
- AI/ML integration
- Cloud architecture
- Modern web technologies

---

⭐ If this project helps you, consider giving it a star!

