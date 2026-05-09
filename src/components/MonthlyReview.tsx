import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, TrendingUp, TrendingDown, Award, AlertTriangle, Lightbulb, Share2, Download } from 'lucide-react';
import { getMonthlyReview } from '../services/geminiService';
import { formatCurrency, cn } from '../lib/utils';
import { Transaction, Budget } from '../lib/types';
import Logo from './Logo';

interface MonthlyReviewProps {
  onClose: () => void;
  transactions: Transaction[];
  budgets: Budget[];
  month: string; // YYYY-MM
}

export default function MonthlyReview({ onClose, transactions, budgets, month }: MonthlyReviewProps) {
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const monthName = new Date(month + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  useEffect(() => {
    async function generateReview() {
      try {
        const monthTransactions = transactions.filter(t => t.date.startsWith(month));
        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        const categoryMap: Record<string, number> = {};
        monthTransactions.filter(t => t.type === 'expense').forEach(t => {
          categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });
        
        const topCategories = Object.entries(categoryMap)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        const budgetsStatus = budgets
          .filter(b => b.month === month)
          .map(b => ({ category: b.category, limit: b.limit, spent: b.spent }));

        const result = await getMonthlyReview({
          month: monthName,
          totalIncome: income,
          totalExpense: expense,
          topCategories,
          budgetsStatus
        });

        setReview(result);
      } catch (err) {
        console.error(err);
        setError("Gagal memuat review bulanan. Pastikan koneksi internet lancar.");
      } finally {
        setLoading(false);
      }
    }

    generateReview();
  }, [month, transactions, budgets, monthName]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[32px] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Monthly Review</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{monthName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" size={24} />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">Menganalisis pengeluaranmu...</p>
                <p className="text-xs text-muted-foreground">Flowce sedang merenungkan keputusan keuanganmu bulan ini.</p>
              </div>
            </div>
          ) : error ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>
              <p className="text-sm font-medium text-destructive">{error}</p>
              <button onClick={onClose} className="px-6 py-2 bg-secondary rounded-xl text-xs font-bold">Tutup</button>
            </div>
          ) : (
            <>
              {/* Score & Mood */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <div className="text-7xl mb-2">{review.mood}</div>
                  <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center font-black border-4 border-card text-xl shadow-lg">
                    {review.rating}
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold tracking-tight">Skor Keuangan: {review.rating}/10</h3>
                  <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                    "{review.summary}"
                  </p>
                </div>
              </div>

              {/* Praise & Warning */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-[24px] bg-emerald-500/5 border border-emerald-500/10 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Award size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Pujian</span>
                  </div>
                  <p className="text-sm leading-relaxed text-emerald-700/80 dark:text-emerald-400/80">{review.praise}</p>
                </div>
                <div className="p-6 rounded-[24px] bg-rose-500/5 border border-rose-500/10 space-y-3">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Perhatian</span>
                  </div>
                  <p className="text-sm leading-relaxed text-rose-700/80 dark:text-rose-400/80">{review.warning}</p>
                </div>
              </div>

              {/* Actionable Tip */}
              <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/10 flex gap-4 items-start">
                <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Lightbulb size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 block">Tips Flowce</span>
                  <p className="text-sm font-bold text-foreground leading-relaxed">{review.tip}</p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-98 transition-all">
                  <Share2 size={18} />
                  Bagikan Capaian
                </button>
                <button className="flex-1 py-4 bg-secondary text-foreground border border-border rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-muted transition-all">
                  <Download size={18} />
                  Simpan Laporan
                </button>
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-secondary/30 flex justify-center border-t border-border">
          <Logo size={24} variant="light" />
        </div>
      </motion.div>
    </div>
  );
}
