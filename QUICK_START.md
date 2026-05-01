# 🚀 Quick Start - Multi-Provider AI System

## Get Running in 5 Minutes

### Step 1: Install Dependencies (1 min)
```powershell
npm install @anthropic-ai/sdk
```

### Step 2: Configure API Keys (2 min)

Create or edit `.env.local` in the project root:

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# MongoDB (use your existing connection)
MONGODB_URI=mongodb://localhost:27017/smartdociq

# OpenAI - Updated Models
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-large
OPENAI_FALLBACK_MODEL=gpt-4o-mini

# Anthropic Claude - NEW!
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=smartdociq-documents

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# TestSpirit
TESTSPIRIT_API_KEY=sk-user-YSh81y7DX3pCrXWfV5JHZXJaE2aZdh6cnNaCHup1ydXdmHyCqtbfFFAtx5jbA2oWbN94zafhLfHJYLKBym7p338Nn6hJtyi-FQaViAnirBjdrPQlVpdXbOynsWZv5v3JuYE
```

**Important:** Replace `your_openai_api_key_here` and `your_anthropic_api_key_here` with your actual keys.

### Step 3: Start the Server (30 sec)
```powershell
npm run dev
```

### Step 4: Test It Out! (1 min)

Open your browser:
- **Main App**: http://localhost:3000
- **Analytics Dashboard**: http://localhost:3000/dashboard/analytics
- **Upload Documents**: http://localhost:3000/dashboard/upload

---

## 🧪 Quick Test

### Test 1: Upload a Document
1. Go to `/dashboard/upload`
2. Upload any PDF or image
3. Watch it process with AI

**Behind the scenes:**
- 📄 OCR extracts text
- 🤖 Smart router selects best AI model
- 💰 Cost is tracked in real-time
- 📊 Analytics are updated

### Test 2: Check Analytics
1. Go to `/dashboard/analytics`
2. See which AI provider was used
3. Check the cost breakdown
4. View efficiency metrics

**What you'll see:**
- Total requests
- Cost per provider
- Savings from smart routing
- Live performance data

---

## 🎯 Routes Available

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/dashboard` | Main dashboard |
| `/dashboard/upload` | Upload documents |
| `/dashboard/documents` | View all documents |
| `/dashboard/chat` | Chat with documents (RAG) |
| `/dashboard/search` | Semantic search |
| `/dashboard/analytics` | **NEW!** AI analytics dashboard |

---

## 🔍 Verify It's Working

### Check Console Logs
You should see:
```
✅ Smart routing enabled
✅ OpenAI configured (gpt-4o)
✅ Claude configured (claude-3-5-sonnet)
```

### Upload a Contract
- Should use **Claude** (better for documents)
- Check analytics to confirm

### Upload Simple Text
- Should use **GPT-4o-mini** (cheaper)
- Check analytics to see cost savings

---

## 📊 Understanding the Analytics Dashboard

### Key Metrics

**Total Requests**
- Shows how many AI calls you've made
- Split by provider (OpenAI vs Claude)

**Total Cost**
- Real dollar amount spent
- Shows cost savings vs single-provider

**Efficiency Score**
- Request-to-cost ratio
- Higher = better optimization

**Provider Breakdown**
- Bar graphs showing usage
- Token counts
- Cost per provider

---

## 🐛 Troubleshooting

### Issue: "ANTHROPIC_API_KEY not configured"
**Solution:** Add your Claude API key to `.env.local`

### Issue: "Module not found: @anthropic-ai/sdk"
**Solution:** Run `npm install @anthropic-ai/sdk`

### Issue: Analytics showing 0 requests
**Solution:** Upload a document first, then check analytics

### Issue: MongoDB connection error
**Solution:** Make sure MongoDB is running:
```powershell
# Check if MongoDB is running
Get-Service MongoDB
```

### Issue: Redis connection error
**Solution:** Make sure Redis is running (needed for background jobs)

---

## 💡 Demo Tips

### For Recruiters

1. **Start with analytics dashboard** - Shows sophistication
2. **Upload different document types** - Show smart routing
3. **Point out cost savings** - Business value
4. **Show the code** - Technical depth

### Key Files to Show

1. `src/services/model-router.service.ts` - Smart routing logic
2. `src/services/ai-enhanced.service.ts` - Multi-provider service
3. `src/components/AIAnalyticsDashboard.tsx` - Real-time UI
4. `ARCHITECTURE.md` - System design docs

---

## 🎓 Learning the System

### 1. How Routing Works

```typescript
// When you call an enhanced AI function:
const result = await generateSummaryEnhanced(text, 'contract');

// The router automatically:
// 1. Assesses complexity
// 2. Checks document type
// 3. Selects best AI provider
// 4. Tracks cost & performance
// 5. Returns result with metadata
```

### 2. What Each Provider Does Best

**OpenAI (GPT-4o)**
- ✅ Fast responses
- ✅ Cost-effective
- ✅ Great for general tasks
- ✅ Excellent chat quality

**Claude 3.5 Sonnet**
- ✅ Superior document understanding
- ✅ 200K context window
- ✅ Best for contracts/legal
- ✅ Structured data extraction

---

## 📚 Next Steps

1. **Read [ARCHITECTURE.md](ARCHITECTURE.md)** - Understand system design
2. **Read [DEMO_GUIDE.md](DEMO_GUIDE.md)** - Prepare your pitch
3. **Upload test documents** - See routing in action
4. **Check analytics** - Understand cost optimization
5. **Review code** - Deep dive into implementation

---

## ✅ Ready to Impress!

You now have:
- ✅ Multi-provider AI system running
- ✅ Real-time analytics dashboard
- ✅ Smart cost optimization
- ✅ Production-ready architecture
- ✅ Complete documentation

**Show this to recruiters with confidence!** 🎯

---

## 🆘 Need Help?

Check these files:
- **Technical details**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Demo script**: [DEMO_GUIDE.md](DEMO_GUIDE.md)
- **All features**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **General info**: [README.md](README.md)

---

**Happy interviewing! You've got this! 🚀**
