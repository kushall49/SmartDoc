import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // If user is already signed in, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
