'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronDown, FileText, Brain, Search, MessageSquare, Zap, Shield, Mail, Linkedin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const NAV_ITEMS = [
  { label: 'Home', chevron: false },
  { label: 'Features', chevron: false },
  { label: 'About', chevron: false },
  { label: 'Contact Us', chevron: false },
] as const;

const CONTACT_LINKS = [
  { label: 'Gmail', href: 'mailto:contact@smartdoc.ai', icon: Mail },
  { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: Linkedin },
  { label: 'X', href: 'https://x.com', icon: X },
] as const;

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <AboutSection />
      <ContactSection />
      <SocialProofSection />
    </>
  );
}

function HeroSection() {
  return (
    <section id="home" className="relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_40%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.08),transparent_34%)]" />
      <div className="relative z-10">
        <Navbar />
        <div className="mt-[3px] h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

        <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pt-20 pb-24 text-center md:pt-24 lg:pt-28">
          <h1
            className={cn(
              'font-normal leading-[1.02] tracking-[-0.024em] text-[clamp(3.5rem,12vw,150px)]',
              'neon-text neon-pulse'
            )}
            style={{ fontFamily: "'General Sans', 'Geist Sans', sans-serif" }}
          >
            SmartDoc
          </h1>
          <p className="mt-4 max-w-md text-center text-lg leading-8 text-hero-sub opacity-80">
            AI-Powered Document Intelligence
          </p>
          <div className="mt-8 mb-[66px]">
            <Link href="/dashboard">
              <Button variant="heroSecondary" size="lg" className="px-[29px] py-[24px]">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Navbar() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const profileInitial =
    session?.user?.name?.[0]?.toUpperCase() ??
    session?.user?.email?.[0]?.toUpperCase() ??
    'U';

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="w-full px-8 py-5">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center">
          <Image src="/smartdoc-logo.svg" alt="SmartDoc logo" width={48} height={48} className="h-12 w-auto" priority />
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => scrollToSection(item.label === 'Contact Us' ? 'brands' : item.label.toLowerCase())}
              className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-lg font-normal text-foreground/90 transition-colors hover:text-foreground"
            >
              <span>{item.label}</span>
              {item.chevron ? <ChevronDown className="h-4 w-4" /> : null}
            </button>
          ))}
        </nav>

        {isAuthenticated ? (
          <Link
            href="/profile"
            aria-label="Open profile"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-br from-primary/30 to-primary/10 text-sm font-bold text-foreground shadow-[0_0_18px_rgba(139,92,246,0.2)] transition-all hover:scale-[1.03] hover:border-primary/70"
          >
            {profileInitial}
          </Link>
        ) : (
          <Link href="/auth/signup">
            <Button variant="heroSecondary" size="sm" className="rounded-full px-4 py-2">
              Sign Up
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: FileText,
      title: 'OCR Processing',
      description: 'Extract text from images, PDFs, and scanned documents with high accuracy',
    },
    {
      icon: Brain,
      title: 'AI Analysis',
      description: 'Automatic summarization, entity extraction, and document classification',
    },
    {
      icon: Search,
      title: 'Semantic Search',
      description: 'Find documents using natural language queries and vector embeddings',
    },
    {
      icon: MessageSquare,
      title: 'RAG Chat',
      description: 'Chat with your documents using retrieval-augmented generation',
    },
    {
      icon: Zap,
      title: 'Fast Processing',
      description: 'Background job queues for efficient async document processing',
    },
    {
      icon: Shield,
      title: 'Secure Storage',
      description: 'Enterprise-grade security with AWS S3 and encrypted data',
    },
  ];

  return (
    <section id="features" className="relative overflow-hidden bg-background py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.12),transparent_50%),radial-gradient(circle_at_70%_50%,rgba(56,189,248,0.08),transparent_50%)]" />
      
      <div className="relative z-10 mx-auto max-w-6xl px-4">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Powerful Features
          </h2>
          <p className="mt-4 text-lg text-foreground/70">
            Everything you need for intelligent document management
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={cn(
                  'group relative overflow-hidden rounded-2xl p-8',
                  'border border-foreground/10 backdrop-blur-sm',
                  'bg-gradient-to-br from-foreground/5 to-foreground/[0.02]',
                  'transition-all duration-300 hover:border-primary/30',
                  'hover:shadow-[0_0_32px_rgba(139,92,246,0.15)]'
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                <div className="relative z-10">
                  <div className="mb-5 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-3 ring-1 ring-primary/20 transition-all duration-300 group-hover:from-primary/30 group-hover:to-primary/20 group-hover:ring-primary/40">
                    <Icon className="h-6 w-6 text-primary transition-colors duration-300 group-hover:text-primary" />
                  </div>
                  
                  <h3 className="mb-3 text-xl font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                    {feature.title}
                  </h3>
                  
                  <p className="text-foreground/70 leading-relaxed transition-colors duration-300 group-hover:text-foreground/80">
                    {feature.description}
                  </p>
                </div>

                <div className="absolute inset-0 rounded-2xl border border-primary/0 transition-colors duration-300 group-hover:border-primary/20" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden bg-background py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(139,92,246,0.15),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(56,189,248,0.08),transparent_50%)]" />
      <div className="relative z-10">
        <div className="mx-auto px-4" style={{ maxWidth: '70%' }}>
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              We&apos;re on a mission to revolutionize document intelligence.
            </h2>
            
            <div className="space-y-6">
              <p className="text-lg text-foreground/70 leading-relaxed">
                At SmartDoc, we see intelligent document processing as the next frontier in business automation—and AI as the foundation of smarter workflows, efficiency, and better decision-making. Our platform combines state-of-the-art machine learning with intuitive design to help organizations of all sizes unlock the hidden value in their documents.
              </p>

              <p className="text-base text-foreground/70 leading-relaxed">
                Whether you&apos;re processing invoices, contracts, or research papers, SmartDoc makes it faster, smarter, and more cost-effective. Our advanced algorithms for accurate text extraction and intelligent processing, combined with bank-level encryption and compliance with GDPR, SOC 2, and ISO standards, ensure your data is always secure. With our APIs, webhooks, and pre-built connectors for popular business tools, integrating SmartDoc into your existing workflows is seamless.
              </p>

              <p className="text-base text-foreground/70 leading-relaxed">
                We believe in a future where artificial intelligence empowers businesses to extract actionable insights from their documents effortlessly. Our vision is to become the world&apos;s most trusted document intelligence platform, and we&apos;re committed to continuously evolving with AI, maintaining enterprise-trusted infrastructure, and offering transparent pricing with no hidden surprises. Every feature we build is designed with innovation, reliability, and transparency at its core.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setFormData({ name: '', email: '', organization: '', message: '' });
        alert('Thank you for reaching out! We\'ll get back to you soon.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative overflow-hidden bg-background py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_50%,rgba(139,92,246,0.12),transparent_50%),radial-gradient(circle_at_75%_50%,rgba(56,189,248,0.08),transparent_50%)]" />
      <div className="relative z-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-foreground/5" />
            <div className="absolute inset-0 border border-foreground/10 rounded-3xl" />
            
            <div className="relative grid grid-cols-1 gap-0 items-start md:grid-cols-2 p-8 md:p-12">
              <div className="pr-0 md:pr-8 border-r-0 md:border-r border-foreground/10">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight mb-4">
                  Get in touch
                </h2>
                <p className="text-lg text-foreground/70 leading-relaxed">
                  Want to know more about SmartDoc?<br />
                  Fill out the form and we&apos;ll get back to you.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="pl-0 md:pl-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="name"
                    placeholder="Name*"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="px-4 py-3 rounded-lg border border-foreground/20 bg-foreground/5 backdrop-blur-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-foreground/10 transition-all"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email*"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="px-4 py-3 rounded-lg border border-foreground/20 bg-foreground/5 backdrop-blur-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-foreground/10 transition-all"
                  />
                </div>

                <input
                  type="text"
                  name="organization"
                  placeholder="Organization (optional)"
                  value={formData.organization}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-foreground/5 backdrop-blur-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-foreground/10 transition-all"
                />

                <textarea
                  name="message"
                  placeholder="Message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-foreground/5 backdrop-blur-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-foreground/10 transition-all resize-none"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-primary to-primary/80 text-white font-medium hover:shadow-lg hover:shadow-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Submit'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialProofSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let rafId = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;
    const fadeDuration = 0.5;

    const updateOpacity = () => {
      const duration = video.duration;
      const currentTime = video.currentTime;

      if (Number.isFinite(duration) && duration > 0) {
        const fadeIn = Math.min(currentTime / fadeDuration, 1);
        const fadeOut = Math.min((duration - currentTime) / fadeDuration, 1);
        const opacity = Math.max(0, Math.min(fadeIn, fadeOut));
        video.style.opacity = `${opacity}`;
      }

      rafId = requestAnimationFrame(updateOpacity);
    };

    const handleEnded = () => {
      video.style.opacity = '0';
      if (resetTimer) {
        clearTimeout(resetTimer);
      }

      resetTimer = setTimeout(() => {
        video.currentTime = 0;
        void video.play();
      }, 100);
    };

    video.addEventListener('ended', handleEnded);
    void video.play().catch(() => undefined);
    rafId = requestAnimationFrame(updateOpacity);

    return () => {
      cancelAnimationFrame(rafId);
      video.removeEventListener('ended', handleEnded);
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
    };
  }, []);

  return (
    <section id="brands" className="relative w-full overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0 }}
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-20 px-4 pt-16 pb-24">
        <div className="h-40 w-full" />

        <div className="w-full max-w-5xl overflow-hidden">
          <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
            <p className="shrink-0 whitespace-nowrap text-sm text-foreground/50">
              Connect with us<br />
              on your favorite platform
            </p>

            <div className="w-full overflow-hidden">
              <div className="flex w-max items-center gap-16 animate-marquee">
                {Array.from({ length: 2 }).flatMap(() => CONTACT_LINKS).map((contact, index) => {
                  const Icon = contact.icon;

                  return (
                    <a
                      key={`${contact.label}-${index}`}
                      href={contact.href}
                      target={contact.label === 'Gmail' ? undefined : '_blank'}
                      rel={contact.label === 'Gmail' ? undefined : 'noreferrer'}
                      className="flex items-center gap-3 shrink-0 rounded-full border border-foreground/10 bg-foreground/5 px-4 py-2 transition-all hover:border-primary/30 hover:bg-foreground/10"
                    >
                      <div className="liquid-glass flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-base font-semibold text-foreground">{contact.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
