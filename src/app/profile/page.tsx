'use client';

import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();
  const profileInitial =
    session?.user?.name?.[0]?.toUpperCase() ??
    session?.user?.email?.[0]?.toUpperCase() ??
    'U';

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_40%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.08),transparent_34%)]" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-14">
        <h1
          className={cn(
            'font-normal leading-[1.02] tracking-[-0.024em] text-transparent bg-clip-text',
            'text-[clamp(2.2rem,6vw,4rem)]'
          )}
          style={{
            fontFamily: "'General Sans', 'Geist Sans', sans-serif",
            backgroundImage: 'linear-gradient(223deg, #E8E8E9 0%, #3A7BBF 104.15%)',
          }}
        >
          Profile
        </h1>
        <p className="mt-3 max-w-xl text-lg text-foreground/70">
          Manage your account details and sign out securely.
        </p>

        <div className="mt-10 border-t border-foreground/15" />

        <section className="py-7">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shadow-[0_8px_28px_rgba(124,58,237,0.22)]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              {profileInitial}
            </div>

            <div className="min-w-0">
              <p className="text-xl font-semibold text-foreground">
                {session?.user?.name ?? 'User'}
              </p>
              <p className="truncate text-foreground/70">
                {session?.user?.email ?? 'No email found'}
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-foreground/10" />

        <section className="flex flex-wrap items-center justify-between gap-4 py-7">
          <div>
            <h2 className="text-base font-semibold text-foreground">Session</h2>
            <p className="text-sm text-foreground/65">End your current session on this device.</p>
          </div>

          <Button
            variant="heroSecondary"
            size="lg"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="min-w-[150px]"
          >
            <LogOut size={16} />
            Log Out
          </Button>
        </section>

        <div className="border-t border-foreground/10" />
      </div>
    </div>
  );
}
