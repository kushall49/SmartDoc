import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Brain, Search, MessageSquare, Zap, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SmartDocIQ
            </span>
          </div>
          <nav className="flex gap-4">
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signin">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            AI-Powered Document
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Intelligence Platform
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Extract insights, analyze content, and chat with your documents using 
            cutting-edge AI technology. Transform how you work with documents.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Start Processing
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
          <p className="text-muted-foreground">Everything you need to process and understand documents</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<FileText className="h-10 w-10" />}
            title="OCR Processing"
            description="Extract text from images, PDFs, and scanned documents with high accuracy"
            href="/dashboard/upload"
          />
          <FeatureCard
            icon={<Brain className="h-10 w-10" />}
            title="AI Analysis"
            description="Automatic summarization, entity extraction, and document classification"
            href="/dashboard/documents"
          />
          <FeatureCard
            icon={<Search className="h-10 w-10" />}
            title="Semantic Search"
            description="Find documents using natural language queries and vector embeddings"
            href="/dashboard/search"
          />
          <FeatureCard
            icon={<MessageSquare className="h-10 w-10" />}
            title="RAG Chat"
            description="Chat with your documents using retrieval-augmented generation"
            href="/dashboard/chat"
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10" />}
            title="Fast Processing"
            description="Background job queues for efficient async document processing"
            href="/dashboard/documents"
          />
          <FeatureCard
            icon={<Shield className="h-10 w-10" />}
            title="Secure Storage"
            description="Enterprise-grade security with AWS S3 and encrypted data"
            href="/dashboard/upload"
          />
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Use Cases</h2>
            <p className="text-muted-foreground">Built for real-world document challenges</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <UseCaseCard title="Invoice Processing" description="Extract vendors, amounts, and dates automatically" />
            <UseCaseCard title="Contract Analysis" description="Identify key terms and obligations" />
            <UseCaseCard title="Resume Screening" description="Parse skills, experience, and education" />
            <UseCaseCard title="Report Summaries" description="Generate executive summaries instantly" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 SmartDocIQ. Built with Next.js, OpenAI, and AWS.</p>
          <p className="text-sm mt-2">A portfolio project showcasing AI/ML and cloud architecture</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, href }: { icon: React.ReactNode; title: string; description: string; href: string }) {
  return (
    <Link href={href} className="block group">
      <div className="p-6 rounded-lg border bg-card hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full">
        <div className="text-primary mb-4 group-hover:scale-110 transition-transform">{icon}</div>
        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        <div className="mt-4 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Try it now →
        </div>
      </div>
    </Link>
  );
}

function UseCaseCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border bg-gradient-to-br from-blue-50 to-purple-50">
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
