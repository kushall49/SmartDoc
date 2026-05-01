'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Zap, AlertCircle } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: 'There is a server configuration error. Please contact support.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The sign-in link has expired or has already been used.',
  Default: 'An error occurred during sign in. Please try again.',
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') ?? 'Default';
  const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES['Default'];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-2xl">SmartDocIQ</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Sign In Error</h1>
          <p className="text-slate-400 text-sm mb-6">{message}</p>
          <Link
            href="/auth/signin"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
