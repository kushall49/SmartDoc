'use client';

import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-3xl">
      <div className="rounded-2xl border border-foreground/10 bg-gradient-to-br from-foreground/5 via-foreground/[0.02] to-foreground/5 p-6 backdrop-blur-sm">
        <h1 className="text-3xl font-semibold text-foreground">Profile</h1>
        <p className="mt-2 text-foreground/70">Your account details</p>

        <div className="mt-8 flex items-start gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            {session?.user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>

          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">
              {session?.user?.name ?? 'User'}
            </p>
            <p className="text-foreground/70">{session?.user?.email ?? 'No email found'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
