'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.push('/');
    }
  }, [userData, router]);

  if (!userData || userData.role !== 'admin') {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Authenticating...</div>;
  }

  return <div className="min-h-screen bg-zinc-950 text-zinc-50">{children}</div>;
}
