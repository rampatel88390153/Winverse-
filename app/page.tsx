'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore, useGameStore } from '@/lib/store';
import { Navbar } from '@/components/navbar';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { Coins, Flame, History, ShieldAlert, Trophy, Users } from 'lucide-react';

const OPTIONS = [
  { id: 'Red', color: 'bg-rose-500', shadow: 'shadow-rose-500/50' },
  { id: 'Green', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/50' },
  { id: 'Blue', color: 'bg-blue-500', shadow: 'shadow-blue-500/50' },
  { id: 'Big', color: 'bg-amber-500', shadow: 'shadow-amber-500/50' },
  { id: 'Small', color: 'bg-purple-500', shadow: 'shadow-purple-500/50' },
];

export default function Home() {
  const { user, userData } = useAuthStore();
  const { currentRoundId, timer, status } = useGameStore();
  const router = useRouter();

  const [amount, setAmount] = useState<number>(20);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [liveBets, setLiveBets] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [showResult, setShowResult] = useState<{ status: string; amount: number } | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Listen to my bets for this round
  useEffect(() => {
    if (!user || !currentRoundId) return;
    const q = query(
      collection(db, 'bets'),
      where('round_id', '==', currentRoundId),
      where('user_id', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const bets = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setMyBets(bets);
      
      // Check for win/lose updates
      const finishedBets = bets.filter(b => b.status !== 'pending');
      if (finishedBets.length > 0 && status === 'betting' && timer > 25) {
        // Just started a new round, show previous result
        const totalWon = finishedBets.filter(b => b.status === 'win').reduce((acc, b) => acc + (b.amount * 1.9), 0);
        if (totalWon > 0) {
          setShowResult({ status: 'win', amount: totalWon });
        } else {
          setShowResult({ status: 'lose', amount: 0 });
        }
        setTimeout(() => setShowResult(null), 4000);
      }
    });
    return () => unsub();
  }, [user, currentRoundId, status, timer]);

  // Listen to all live bets for this round
  useEffect(() => {
    if (!currentRoundId) return;
    const q = query(
      collection(db, 'bets'),
      where('round_id', '==', currentRoundId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLiveBets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentRoundId]);

  // Listen to history
  useEffect(() => {
    const q = query(collection(db, 'rounds'), orderBy('timestamp', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const placeBet = async (option: string) => {
    if (!user || !userData) return toast.error('Please login');
    if (status !== 'betting') return toast.error('Betting is locked!');
    if (myBets.length >= 3) return toast.error('Max 3 bets per round');
    if (amount < 20 || amount > 50000) return toast.error('Bet must be between ₹20 and ₹50,000');
    if (userData.balance < amount) return toast.error('Insufficient balance');

    try {
      // Optimistic deduction is handled by backend, but we can't easily do it securely here without a cloud function.
      // Since we are using client SDK, we should deduct balance here.
      // Wait, the backend doesn't deduct on bet placement, it only credits on win.
      // Let's deduct balance now.
      const userRef = doc(db, 'users', user.uid);
      await addDoc(collection(db, 'bets'), {
        user_id: user.uid,
        round_id: currentRoundId,
        option,
        amount,
        status: 'pending',
        timestamp: Date.now()
      });
      // Deduct balance
      import('firebase/firestore').then(({ updateDoc, increment }) => {
        updateDoc(userRef, { balance: increment(-amount), total_bets: increment(1) });
      });
      toast.success(`Placed ₹${amount} on ${option}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!user || !userData) return null;

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 relative overflow-hidden">
      {/* Result Popup */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm"
          >
            <div className={`p-8 rounded-3xl border ${showResult.status === 'win' ? 'bg-emerald-950/80 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.4)]' : 'bg-rose-950/80 border-rose-500/50 shadow-[0_0_50px_rgba(244,63,94,0.4)]'} text-center backdrop-blur-xl`}>
              <h2 className={`text-6xl font-black mb-4 ${showResult.status === 'win' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {showResult.status === 'win' ? 'YOU WIN!' : 'YOU LOSE'}
              </h2>
              {showResult.status === 'win' && (
                <p className="text-3xl font-bold text-white">+₹{showResult.amount.toFixed(2)}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-zinc-950 font-black text-sm">
            W
          </div>
          <span className="font-black tracking-tight text-lg">WINVERSE</span>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-mono font-bold text-sm">₹{userData.balance?.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-amber-100 mb-1">
              <Flame className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Limited Time</span>
            </div>
            <h2 className="text-2xl font-black text-white leading-tight">100% FIRST DEPOSIT BONUS</h2>
            <p className="text-amber-100 text-sm mt-2 font-medium">Double your wallet instantly.</p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        </motion.div>

        {/* Game Area */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-5 backdrop-blur-xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Round ID</p>
              <p className="font-mono text-sm text-zinc-300">{currentRoundId || 'Loading...'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Time Left</p>
              <p className={`text-3xl font-black font-mono ${timer <= 10 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                00:{timer.toString().padStart(2, '0')}
              </p>
            </div>
          </div>

          {/* Betting Options */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {OPTIONS.slice(0, 3).map((opt) => (
              <button
                key={opt.id}
                onClick={() => placeBet(opt.id)}
                disabled={status !== 'betting'}
                className={`relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center transition-all active:scale-95 ${opt.color} ${status !== 'betting' ? 'opacity-50 grayscale' : `hover:shadow-lg ${opt.shadow}`}`}
              >
                <span className="font-black text-white text-lg drop-shadow-md">{opt.id}</span>
                <span className="text-[10px] text-white/80 font-bold uppercase mt-1">1.9x</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {OPTIONS.slice(3).map((opt) => (
              <button
                key={opt.id}
                onClick={() => placeBet(opt.id)}
                disabled={status !== 'betting'}
                className={`relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center transition-all active:scale-95 ${opt.color} ${status !== 'betting' ? 'opacity-50 grayscale' : `hover:shadow-lg ${opt.shadow}`}`}
              >
                <span className="font-black text-white text-xl drop-shadow-md">{opt.id}</span>
                <span className="text-[10px] text-white/80 font-bold uppercase mt-1">1.9x</span>
              </button>
            ))}
          </div>

          {/* Amount Selector */}
          <div className="bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bet Amount</span>
              <span className="font-mono font-bold text-emerald-400">₹{amount}</span>
            </div>
            <input
              type="range"
              min="20"
              max="50000"
              step="10"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex gap-2 mt-4">
              {[20, 100, 500, 1000, 5000].map(val => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold font-mono transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Status Overlay */}
          {status !== 'betting' && (
            <div className="absolute inset-0 z-10 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <ShieldAlert className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
              <h3 className="text-2xl font-black text-white tracking-widest uppercase">
                {status === 'locked' ? 'BETS LOCKED' : 'CALCULATING'}
              </h3>
              <p className="text-zinc-400 text-sm mt-2 font-medium">Please wait for the result...</p>
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Last 10 Results</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {history.map((h, i) => {
              const opt = OPTIONS.find(o => o.id === h.result);
              return (
                <div key={h.id} className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg ${opt?.color || 'bg-zinc-800'}`}>
                  {h.result.charAt(0)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Bets */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Live Bets</h3>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {liveBets.map((bet) => {
                const opt = OPTIONS.find(o => o.id === bet.option);
                return (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between items-center p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${bet.user_id}`} alt="avatar" className="w-full h-full" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 font-mono">{bet.user_id.substring(0, 6)}***</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`w-2 h-2 rounded-full ${opt?.color}`} />
                          <span className="text-xs font-bold">{bet.option}</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">₹{bet.amount}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {liveBets.length === 0 && (
              <p className="text-center text-zinc-500 text-sm py-4">No bets placed yet.</p>
            )}
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
