'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import { User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? 'Registration failed');
        return;
      }

      // Auto sign in after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        router.push('/auth/signin');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden flex items-center justify-center px-4">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(139,92,246,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(56,189,248,0.1),transparent_50%)]" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-6 flex items-center gap-3">
            <Image src="/smartdoc-logo.svg" alt="SmartDoc logo" width={48} height={48} className="h-12 w-auto" />
            <span className="text-xl font-bold text-foreground">SmartDoc</span>
          </div>
        </div>

        {/* Card */}
        <div className={cn(
          'relative overflow-hidden rounded-3xl p-8',
          'border border-foreground/10 backdrop-blur-sm',
          'bg-gradient-to-br from-foreground/5 via-foreground/[0.02] to-foreground/5'
        )}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-foreground mb-2">Create an account</h1>
            <p className="text-foreground/70 text-sm mb-6">
              Start analyzing documents with AI
            </p>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name
                </label>
                <div className="relative group">
                  <User
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 transition-colors group-focus-within:text-primary"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    minLength={2}
                    className={cn(
                      'w-full bg-foreground/5 border border-foreground/10 text-foreground rounded-xl',
                      'pl-11 pr-4 py-3 text-sm placeholder:text-foreground/40',
                      'focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20',
                      'transition-all duration-200'
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <div className="relative group">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 transition-colors group-focus-within:text-primary"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className={cn(
                      'w-full bg-foreground/5 border border-foreground/10 text-foreground rounded-xl',
                      'pl-11 pr-4 py-3 text-sm placeholder:text-foreground/40',
                      'focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20',
                      'transition-all duration-200'
                    )}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative group">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 transition-colors group-focus-within:text-primary"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className={cn(
                      'w-full bg-foreground/5 border border-foreground/10 text-foreground rounded-xl',
                      'pl-11 pr-4 py-3 text-sm placeholder:text-foreground/40',
                      'focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20',
                      'transition-all duration-200'
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                variant="hero"
                size="lg"
                className="w-full mt-6"
              >
                {loading ? 'Creating account...' : 'Create Account'}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
              <span className="text-xs text-foreground/50 px-2">or</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
            </div>

            <p className="text-foreground/70 text-sm text-center mt-6">
              Already have an account?{' '}
              <Link
                href="/auth/signin"
                className="text-primary hover:text-primary/90 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
