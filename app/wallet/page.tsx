'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store';
import { Navbar } from '@/components/navbar';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { ArrowDownToLine, ArrowUpFromLine, Copy, Info } from 'lucide-react';

export default function Wallet() {
  const { user, userData } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<string>('');
  const [utr, setUtr] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!user || !userData) return null;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !utr) return toast.error('Please fill all fields');
    if (Number(amount) < 100) return toast.error('Minimum deposit is ₹100');

    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        user_id: user.uid,
        type: 'deposit',
        amount: Number(amount),
        utr,
        status: 'pending',
        timestamp: Date.now()
      });
      toast.success('Deposit request submitted! Admin will verify shortly.');
      setAmount('');
      setUtr('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return toast.error('Please enter amount');
    const numAmount = Number(amount);
    if (numAmount < 100) return toast.error('Minimum withdrawal is ₹100');
    if (numAmount > userData.balance) return toast.error('Insufficient balance');
    if (userData.total_deposits < 100) return toast.error('You must deposit at least ₹100 before withdrawing');

    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        user_id: user.uid,
        type: 'withdraw',
        amount: numAmount,
        status: 'pending',
        timestamp: Date.now()
      });
      
      // Deduct balance immediately for withdrawal request
      import('firebase/firestore').then(({ doc, updateDoc, increment }) => {
        updateDoc(doc(db, 'users', user.uid), { balance: increment(-numAmount) });
      });

      toast.success('Withdrawal request submitted! Processing in 30 mins.');
      setAmount('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyUpi = () => {
    navigator.clipboard.writeText('winverse@naviaxis');
    toast.success('UPI ID copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 relative">
      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-6 text-center">
        <h1 className="text-2xl font-black tracking-tight text-white mb-2">Wallet</h1>
        <p className="text-zinc-400 text-sm font-medium">Available Balance</p>
        <p className="text-5xl font-black font-mono mt-1 bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
          ₹{userData.balance?.toFixed(2) || '0.00'}
        </p>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* Tabs */}
        <div className="flex bg-zinc-900/50 p-1 rounded-2xl border border-zinc-800/50 mb-6">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'deposit' ? 'bg-emerald-500 text-zinc-950 shadow-lg' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            DEPOSIT
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'withdraw' ? 'bg-rose-500 text-zinc-950 shadow-lg' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            WITHDRAW
          </button>
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'deposit' ? (
            <form onSubmit={handleDeposit} className="space-y-5">
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Send Payment To</p>
                <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-200">winverse@naviaxis</p>
                      <p className="text-xs text-zinc-500">Verified Merchant</p>
                    </div>
                  </div>
                  <button type="button" onClick={copyUpi} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-300">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>Transfer the exact amount to the UPI ID above, then enter the 12-digit UTR/Reference number below.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono text-lg"
                  placeholder="100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">12-Digit UTR Number</label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  minLength={12}
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono tracking-widest"
                  placeholder="123456789012"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-zinc-950 font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Submitting...' : 'Submit Deposit Request'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleWithdraw} className="space-y-5">
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
                <div className="flex items-start gap-3 text-sm text-zinc-300">
                  <Info className="w-5 h-5 text-blue-400 shrink-0" />
                  <div className="space-y-2">
                    <p>Withdrawals are processed within 30 minutes.</p>
                    <p>Minimum withdrawal amount is <strong className="text-white">₹100</strong>.</p>
                    {userData.total_deposits < 100 && (
                      <p className="text-rose-400 font-medium">You must deposit at least ₹100 before your first withdrawal.</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Withdraw Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="100"
                  max={userData.balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-mono text-lg"
                  placeholder="100"
                />
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-zinc-500">Available: ₹{userData.balance.toFixed(2)}</span>
                  <button type="button" onClick={() => setAmount(Math.floor(userData.balance).toString())} className="text-xs font-bold text-rose-400 hover:text-rose-300">MAX</button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || userData.total_deposits < 100}
                className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-zinc-950 font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Processing...' : 'Withdraw Funds'}
              </button>
            </form>
          )}
        </motion.div>
      </div>

      <Navbar />
    </div>
  );
}
