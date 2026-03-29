'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { Navbar } from '@/components/navbar';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Copy, LogOut, Mail, Share2, Trophy, User, Wallet, ShieldAlert } from 'lucide-react';

export default function Account() {
  const { user, userData } = useAuthStore();
  const router = useRouter();
  const [name, setName] = useState(userData?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user || !userData) return null;

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const saveName = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { name });
      toast.success('Profile updated');
      setIsEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyReferral = () => {
    const link = `${window.location.origin}/login?ref=${userData.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 relative">
      <div className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-8">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 p-1 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
              <img src={userData.profile_image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-1">
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-white text-sm w-full focus:outline-none focus:border-emerald-500"
                />
                <button onClick={saveName} disabled={loading} className="bg-emerald-500 text-zinc-950 px-3 py-1.5 rounded-lg text-sm font-bold">Save</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">{userData.name}</h2>
                <button onClick={() => setIsEditing(true)} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Edit</button>
              </div>
            )}
            <p className="text-sm text-zinc-400 font-mono mt-1">{user.email}</p>
            <div className="inline-flex items-center gap-1.5 bg-zinc-800/50 px-2 py-1 rounded-md mt-2 border border-zinc-700/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <Wallet className="w-6 h-6 text-emerald-400 mb-2" />
            <p className="text-2xl font-black font-mono text-white">₹{userData.balance?.toFixed(2)}</p>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-1">Balance</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <Trophy className="w-6 h-6 text-amber-400 mb-2" />
            <p className="text-2xl font-black font-mono text-white">{userData.total_bets}</p>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-1">Total Bets</p>
          </div>
        </div>

        {/* Referral System */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Refer & Earn</h3>
              <p className="text-xs text-indigo-200/70 font-medium">Get ₹30 instantly per signup</p>
            </div>
          </div>

          <div className="bg-zinc-950/50 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mb-1">Your Code</p>
              <p className="text-xl font-black font-mono text-white tracking-widest">{userData.referral_code}</p>
            </div>
            <button onClick={copyReferral} className="w-10 h-10 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-between items-center text-sm border-t border-indigo-500/20 pt-4 mt-2">
            <span className="text-zinc-400 font-medium">Referral Earnings</span>
            <span className="font-black font-mono text-emerald-400">₹{userData.referral_earnings?.toFixed(2) || '0.00'}</span>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden">
          {userData.role === 'admin' && (
            <button onClick={() => router.push('/admin')} className="w-full flex items-center gap-3 p-4 hover:bg-emerald-500/10 transition-colors border-b border-zinc-800/50 text-left">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-400">Admin Panel</p>
                <p className="text-xs text-emerald-500/70">Manage users, bets, and payments</p>
              </div>
            </button>
          )}
          <a href="mailto:officialwinverse@gmail.com" className="flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-zinc-200">Helpdesk Support</p>
              <p className="text-xs text-zinc-500">officialwinverse@gmail.com</p>
            </div>
          </a>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 hover:bg-rose-500/10 transition-colors text-left">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-rose-400">Logout</p>
              <p className="text-xs text-rose-500/70">Securely end your session</p>
            </div>
          </button>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
