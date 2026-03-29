'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, User, Trophy } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/wallet', icon: Wallet, label: 'Wallet' },
    { href: '/account', icon: User, label: 'Account' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800/50 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''}`} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
