import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/auth-provider';

export const metadata: Metadata = {
  title: 'Winverse - Premium Betting Platform',
  description: '100% First Deposit Bonus. Play and win instantly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-50 min-h-screen font-sans antialiased selection:bg-emerald-500/30">
        <AuthProvider>
          {children}
          <Toaster position="top-center" toastOptions={{
            style: {
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #27272a'
            }
          }} />
        </AuthProvider>
      </body>
    </html>
  );
}
