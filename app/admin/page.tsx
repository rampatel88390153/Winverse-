'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, where, getDocs, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGameStore } from '@/lib/store';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Activity, CheckCircle, XCircle, Users, Wallet, Settings, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const { currentRoundId, timer, status, mode } = useGameStore();
  const [stats, setStats] = useState({ users: 0, deposits: 0, withdraws: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [liveBets, setLiveBets] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [manualResult, setManualResult] = useState('');

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const txSnap = await getDocs(collection(db, 'transactions'));
      
      let dep = 0, wit = 0;
      txSnap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'approved') {
          if (data.type === 'deposit') dep += data.amount;
          if (data.type === 'withdraw') wit += data.amount;
        }
      });
      
      setStats({ users: usersSnap.size, deposits: dep, withdraws: wit });
    };
    fetchStats();
  }, []);

  // Listen to pending transactions
  useEffect(() => {
    const q = query(collection(db, 'transactions'), where('status', '==', 'pending'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Listen to live bets for current round
  useEffect(() => {
    if (!currentRoundId) return;
    const q = query(collection(db, 'bets'), where('round_id', '==', currentRoundId));
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

  const handleTransaction = async (txId: string, userId: string, type: string, amount: number, action: 'approved' | 'rejected') => {
    try {
      const txRef = doc(db, 'transactions', txId);
      const userRef = doc(db, 'users', userId);
      
      if (action === 'approved') {
        if (type === 'deposit') {
          await updateDoc(userRef, { balance: increment(amount), total_deposits: increment(amount) });
        }
        // If withdraw, balance was already deducted on request.
      } else if (action === 'rejected') {
        if (type === 'withdraw') {
          // Refund balance
          await updateDoc(userRef, { balance: increment(amount) });
        }
      }
      
      await updateDoc(txRef, { status: action });
      toast.success(`Transaction ${action}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const changeMode = async (newMode: string) => {
    try {
      await fetch('/api/admin/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newMode })
      });
      toast.success(`Mode changed to ${newMode}`);
    } catch (e: any) {
      toast.error('Failed to change mode');
    }
  };

  const setManual = async (result: string) => {
    try {
      await fetch('/api/admin/manual-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result })
      });
      setManualResult(result);
      toast.success(`Manual result set to ${result}`);
    } catch (e: any) {
      toast.error('Failed to set manual result');
    }
  };

  // Calculate live bet stats
  const betStats = { Red: 0, Green: 0, Blue: 0, Big: 0, Small: 0 };
  let totalBetAmount = 0;
  liveBets.forEach(b => {
    betStats[b.option as keyof typeof betStats] += b.amount;
    totalBetAmount += b.amount;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-zinc-900/80 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-xl">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">WINVERSE ADMIN</h1>
          <p className="text-zinc-400 font-medium mt-1">System Control Panel</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Round ID</p>
            <p className="font-mono text-sm text-zinc-300">{currentRoundId}</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-zinc-800 flex items-center justify-center relative">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-800" />
              <circle cx="28" cy="28" r="26" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="163" strokeDashoffset={163 - (163 * timer) / 30} className={timer <= 10 ? 'text-rose-500' : 'text-emerald-500'} />
            </svg>
            <span className={`font-black font-mono text-xl ${timer <= 10 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>{timer}</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Users</p>
            <p className="text-2xl font-black font-mono text-white">{stats.users}</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Deposits</p>
            <p className="text-2xl font-black font-mono text-white">₹{stats.deposits.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Withdraws</p>
            <p className="text-2xl font-black font-mono text-white">₹{stats.withdraws.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Game Control */}
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-black uppercase tracking-wider text-white">Game Control</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Operation Mode</p>
              <div className="flex gap-2">
                {['random', 'manual', 'lowest_bet'].map(m => (
                  <button
                    key={m}
                    onClick={() => changeMode(m)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${mode === m ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'manual' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Set Manual Result</p>
                <div className="flex gap-2">
                  {['Red', 'Green', 'Blue', 'Big', 'Small'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setManual(opt)}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${manualResult === opt ? 'bg-amber-500 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Live Betting Data (Total: ₹{totalBetAmount})</p>
              <div className="space-y-3">
                {Object.entries(betStats).map(([opt, amt]) => {
                  const pct = totalBetAmount > 0 ? (amt / totalBetAmount) * 100 : 0;
                  return (
                    <div key={opt} className="relative bg-zinc-950 border border-zinc-800 rounded-xl p-3 overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-zinc-800/50" style={{ width: `${pct}%` }} />
                      <div className="relative flex justify-between items-center z-10">
                        <span className="font-bold text-zinc-300">{opt}</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-400">₹{amt}</span>
                          <span className="text-xs text-zinc-500 ml-2">({pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Control */}
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-black uppercase tracking-wider text-white">Pending Requests</h2>
            </div>
            <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-1 rounded-full">{transactions.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {transactions.map(tx => (
              <div key={tx.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${tx.type === 'deposit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {tx.type}
                    </span>
                    <p className="text-xs text-zinc-500 font-mono mt-2">User: {tx.user_id}</p>
                    {tx.type === 'deposit' && <p className="text-xs text-zinc-400 font-mono mt-1">UTR: {tx.utr}</p>}
                  </div>
                  <span className="font-black font-mono text-lg text-white">₹{tx.amount}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleTransaction(tx.id, tx.user_id, tx.type, tx.amount, 'approved')} className="flex-1 flex items-center justify-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-xs font-bold transition-colors">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button onClick={() => handleTransaction(tx.id, tx.user_id, tx.type, tx.amount, 'rejected')} className="flex-1 flex items-center justify-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-2 rounded-lg text-xs font-bold transition-colors">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm font-medium">
                No pending requests.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
