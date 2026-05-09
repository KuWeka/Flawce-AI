import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard, Plus, Sparkles, PieChart as PieIcon, LineChart as LineIcon, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatCurrency, cn } from '@/src/lib/utils';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/src/lib/AuthContext';
import { useTheme } from '@/src/lib/ThemeContext';
import { Transaction, Budget, Account } from '@/src/lib/types';
import { useAccounts } from '@/src/lib/useAccounts';
import { useSmartAlerts } from '@/src/lib/useSmartAlerts';
import SmartAlertBanner from './SmartAlertBanner';
import MonthlyReview from './MonthlyReview';
import { Goal } from '@/src/lib/types';

function NumberTicker({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={className}
    >
      {formatCurrency(value)}
    </motion.span>
  );
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { user } = useAuth();
  const { accentColor } = useTheme();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, balance: 0 });
  const [prevStats, setPrevStats] = useState({ income: 0, expense: 0 });
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [showAutoBanner, setShowAutoBanner] = useState(false);
  const [reviewMonth, setReviewMonth] = useState(new Date().toISOString().slice(0, 7));
  const [timeFilter, setTimeFilter] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan'>('bulanan');
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);

  useEffect(() => {
    // Automatic Review Banner Logic
    const today = new Date();
    const day = today.getDate();
    const monthKey = today.toISOString().slice(0, 7); // YYYY-MM
    
    const isEndOfMonth = day >= 28;
    const hasSeenReview = localStorage.getItem(`monthly_review_seen_${monthKey}`) === 'true';

    if (isEndOfMonth && !hasSeenReview) {
      setShowAutoBanner(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    let startDate = new Date();
    let prevStartDate = new Date();
    let prevEndDate = new Date();
    
    if (timeFilter === 'harian') {
      startDate.setHours(0, 0, 0, 0);
      prevStartDate.setDate(now.getDate() - 1);
      prevStartDate.setHours(0, 0, 0, 0);
      prevEndDate.setDate(now.getDate() - 1);
      prevEndDate.setHours(23, 59, 59, 999);
    } else if (timeFilter === 'mingguan') {
      startDate.setDate(now.getDate() - 7);
      prevStartDate.setDate(now.getDate() - 14);
      prevEndDate.setDate(now.getDate() - 8);
    } else if (timeFilter === 'bulanan') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (timeFilter === 'tahunan') {
      startDate = new Date(now.getFullYear(), 0, 1);
      prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
      prevEndDate = new Date(now.getFullYear(), 0, 0);
    }

    const txQ = query(
      collection(db, 'transactions'), 
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubTx = onSnapshot(txQ, (snapshot) => {
      const txs: Transaction[] = [];
      const preTxs: Transaction[] = [];
      let curInc = 0;
      let curExp = 0;
      let preInc = 0;
      let preExp = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as Transaction;
        const txDate = new Date(data.date);
        
        if (txDate >= startDate) {
          txs.push({ ...data, id: doc.id });
          if (data.type === 'income') curInc += data.amount;
          else curExp += data.amount;
        } else if (txDate >= prevStartDate && txDate <= prevEndDate) {
          preTxs.push({ ...data, id: doc.id });
          if (data.type === 'income') preInc += data.amount;
          else preExp += data.amount;
        }
      });

      setTransactions(txs);
      setPrevTransactions(preTxs);
      setStats(prev => ({ ...prev, income: curInc, expense: curExp }));
      setPrevStats({ income: preInc, expense: preExp });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'transactions');
    });

    const budgetsQ = query(collection(db, 'budgets'), where('userId', '==', user.uid));
    const unsubBudgets = onSnapshot(budgetsQ, (snapshot) => {
      const b: Budget[] = [];
      snapshot.forEach(doc => b.push({ ...doc.data(), id: doc.id } as Budget));
      setBudgets(b);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'budgets');
    });

    const goalsQ = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubGoals = onSnapshot(goalsQ, (snapshot) => {
      const g: Goal[] = [];
      snapshot.forEach(doc => g.push({ ...doc.data(), id: doc.id } as Goal));
      setGoals(g);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'goals');
    });

    return () => {
      unsubTx();
      unsubBudgets();
      unsubGoals();
    };
  }, [user, timeFilter]);

  // Sync balance from accounts
  useEffect(() => {
    if (accounts.length > 0) {
      const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
      setStats(prev => ({ ...prev, balance: totalBalance }));
    }
  }, [accounts]);

  const cashflowHealth = stats.income > 0 ? (stats.income - stats.expense) / stats.income : 0;
  const prevHealth = prevStats.income > 0 ? (prevStats.income - prevStats.expense) / prevStats.income : 0;
  
  const bufferMonths = stats.expense > 0 ? (stats.balance / (stats.expense / (timeFilter === 'mingguan' ? 0.25 : 1))) : 0;
  const prevBuffer = prevStats.expense > 0 ? (stats.balance / (prevStats.expense / (timeFilter === 'mingguan' ? 0.25 : 1))) : 0;

  const expenseRatio = stats.income > 0 ? stats.expense / stats.income : (stats.expense > 0 ? 1.1 : 0);
  let healthDisplay = { emoji: '😊', text: 'Sehat', color: 'text-primary', bg: 'bg-primary/10' };
  if (expenseRatio > 0.9) {
    healthDisplay = { emoji: '😰', text: 'Defisit', color: 'text-destructive', bg: 'bg-destructive/10' };
  } else if (expenseRatio > 0.7) {
    healthDisplay = { emoji: '😐', text: 'Pas-pasan', color: 'text-warning', bg: 'bg-warning/10' };
  }
  const bufferPercent = stats.income > 0 ? ((stats.income - stats.expense) / stats.income) * 100 : 0;

  const healthTrend = cashflowHealth - prevHealth;
  const incomeTrend = prevStats.income > 0 ? ((stats.income - prevStats.income) / prevStats.income) * 100 : 0;
  const expenseTrend = prevStats.expense > 0 ? ((stats.expense - prevStats.expense) / prevStats.expense) * 100 : 0;
  const bufferTrend = bufferMonths - prevBuffer;


  const getChartData = () => {
    const points: { 
      name: string, 
      expense: number, 
      prevExpense: number,
      balance: number, 
      rawDate?: string, 
      rawHour?: number,
      isMax?: boolean,
      isMin?: boolean
    }[] = [];
    const now = new Date();
    
    if (timeFilter === 'harian') {
      for (let i = 0; i < 24; i += 4) {
        points.push({ name: `${i}:00`, expense: 0, prevExpense: 0, balance: 0, rawHour: i });
      }
      transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (d.toDateString() === now.toDateString()) {
          const hour = d.getHours();
          const point = points.find((p, idx) => {
            const nextHour = points[idx + 1]?.rawHour || 24;
            return hour >= p.rawHour! && hour < nextHour;
          });
          if (point && tx.type === 'expense') point.expense += tx.amount;
        }
      });
      prevTransactions.forEach(tx => {
        const d = new Date(tx.date);
        const hour = d.getHours();
        const point = points.find((p, idx) => {
          const nextHour = points[idx + 1]?.rawHour || 24;
          return hour >= p.rawHour! && hour < nextHour;
        });
        if (point && tx.type === 'expense') point.prevExpense += tx.amount;
      });
    } else if (timeFilter === 'mingguan') {
      const prevDates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const prevD = new Date();
        prevD.setDate(prevD.getDate() - (i + 7));
        points.push({ 
          name: d.toLocaleDateString('id-ID', { weekday: 'short' }), 
          expense: 0, 
          prevExpense: 0, 
          balance: 0, 
          rawDate: d.toDateString() 
        });
        prevDates.push(prevD.toDateString());
      }
      transactions.forEach(tx => {
        const txDate = new Date(tx.date).toDateString();
        const p = points.find(pt => pt.rawDate === txDate);
        if (p && tx.type === 'expense') p.expense += tx.amount;
      });
      prevTransactions.forEach(tx => {
        const txDate = new Date(tx.date).toDateString();
        const idx = prevDates.indexOf(txDate);
        if (idx !== -1 && tx.type === 'expense') points[idx].prevExpense += tx.amount;
      });
    } else if (timeFilter === 'bulanan') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        points.push({ name: `${i}`, expense: 0, prevExpense: 0, balance: 0 });
      }
      transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          const day = d.getDate();
          if (tx.type === 'expense' && day <= points.length) points[day-1].expense += tx.amount;
        }
      });
      prevTransactions.forEach(tx => {
        const d = new Date(tx.date);
        const day = d.getDate();
        if (tx.type === 'expense' && day <= points.length) points[day-1].prevExpense += tx.amount;
      });
    } else if (timeFilter === 'tahunan') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      months.forEach((m) => {
        points.push({ name: m, expense: 0, prevExpense: 0, balance: 0 });
      });
      transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (d.getFullYear() === now.getFullYear()) {
          const m = d.getMonth();
          if (tx.type === 'expense') points[m].expense += tx.amount;
        }
      });
      prevTransactions.forEach(tx => {
        const d = new Date(tx.date);
        const m = d.getMonth();
        if (tx.type === 'expense') points[m].prevExpense += tx.amount;
      });
    }

    // Mark max/min for current period
    const nonZeroExpenses = points.filter(p => p.expense > 0);
    if (nonZeroExpenses.length > 0) {
      let maxVal = -1;
      let minVal = Infinity;
      nonZeroExpenses.forEach(p => {
        if (p.expense > maxVal) maxVal = p.expense;
        if (p.expense < minVal) minVal = p.expense;
      });
      points.forEach(p => {
        if (p.expense === maxVal && maxVal > 0) p.isMax = true;
        if (p.expense === minVal && minVal < Infinity && minVal !== maxVal) p.isMin = true;
      });
    }

    return points;
  };

  const donutData = () => {
    const categories: Record<string, number> = {};
    // Use currently filtered transactions for category breakdown
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
      }
    });
    const dynamicColors = [accentColor, '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
    return Object.entries(categories).map(([name, value], i) => ({
      name, value, color: dynamicColors[i % dynamicColors.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  };

  const chartData = getChartData();
  const catData = donutData();

  const goToChat = () => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'chatbot' }));

  const { alerts, dismissAlert } = useSmartAlerts({ transactions, budgets, goals });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-xs md:text-sm text-muted-foreground font-medium">Pantau arus kas dan asetmu hari ini.</p>
        </div>
        <div className="flex gap-1 p-1 bg-secondary rounded-2xl border border-border w-fit">
          {(['harian', 'mingguan', 'bulanan', 'tahunan'] as const).map((f) => (
            <button 
              key={f} 
              onClick={() => setTimeFilter(f)}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all capitalize",
                timeFilter === f ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <SmartAlertBanner alerts={alerts} onDismiss={dismissAlert} />

      {/* Automatic Monthly Review Banner */}
      <AnimatePresence>
        {showAutoBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 shrink-0">
                  <Sparkles size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Waktunya Review Bulanan!</h3>
                  <p className="text-sm text-muted-foreground">Bulan ini hampir berakhir. Mari lihat bagaimana performa keuanganmu.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                <button 
                  onClick={() => {
                    const monthKey = new Date().toISOString().slice(0, 7);
                    localStorage.setItem(`monthly_review_seen_${monthKey}`, 'true');
                    setShowReview(true);
                    setShowAutoBanner(false);
                  }}
                  className="flex-1 md:flex-none px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  Lihat Review
                </button>
                <button 
                  onClick={() => {
                    const monthKey = new Date().toISOString().slice(0, 7);
                    localStorage.setItem(`monthly_review_seen_${monthKey}`, 'true');
                    setShowAutoBanner(false);
                  }}
                  className="px-6 py-3.5 bg-secondary text-muted-foreground hover:text-foreground rounded-xl font-bold text-xs"
                >
                  Nanti Saja
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReview && (
          <MonthlyReview 
            month={reviewMonth}
            transactions={transactions}
            budgets={budgets}
            onClose={() => setShowReview(false)}
          />
        )}
      </AnimatePresence>

      {/* Hero Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative overflow-hidden p-10 lg:p-12 rounded-[32px] bg-card border border-border shadow-md"
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 flex-1">
            <div className="space-y-2">
              <span className="text-[10px] md:text-xs font-black text-muted-foreground uppercase tracking-[0.25em]">Total Saldo Tersedia</span>
              <div className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-foreground drop-shadow-sm">
                <NumberTicker value={stats.balance} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 pt-2">
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1 shadow-sm px-2 py-0.5 bg-secondary rounded-md">Status Keuangan</span>
                <div className={cn("flex items-center gap-2 text-sm font-black", healthDisplay.color)}>
                  <span>{healthDisplay.emoji} {healthDisplay.text}</span>
                </div>
              </div>
              <div className="hidden lg:block w-px h-12 bg-border/60" />
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Potensi Tabungan</span>
                <span className="text-lg font-black font-mono text-primary">
                  {formatCurrency(Math.max(0, stats.income - stats.expense))}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
               <button 
                  onClick={() => setActiveTab('chatbot')}
                  className="px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-bold text-base shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 group"
               >
                 <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                 Tambah Catatan
               </button>
               <button 
                  onClick={() => setShowReview(true)}
                  className="px-10 py-5 bg-secondary text-foreground border border-border rounded-2xl font-bold text-base hover:bg-muted transition-all flex items-center gap-3"
               >
                 <Sparkles size={20} className="text-primary" />
                 Bantu Analisis
               </button>
            </div>
          </div>

          <div className="w-full lg:w-[340px] shrink-0">
            <div className="p-8 rounded-[2.5rem] bg-secondary/20 border border-border/60 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Dana Darurat</span>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black font-mono leading-none">{bufferMonths.toFixed(1)}</span>
                    <span className="text-[10px] font-bold text-muted-foreground mb-0.5">Bulan</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-primary/10 text-primary">
                  <Wallet size={24} />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-muted-foreground">Kesehatan Cashflow</span>
                  <span className="text-primary">{Math.round(cashflowHealth * 100)}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden border border-border/40">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, cashflowHealth * 100))}%` }}
                    className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                  />
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed italic opacity-80">
                {bufferMonths > 3 
                  ? "Dana daruratmu cukup aman untuk 3 bulan ke depan." 
                  : "Coba kurangi pengeluaran untuk memperkuat dana darurat."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Accounts Horizontal Scroll */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Akun & Saldo</h3>
          <button 
            onClick={() => setActiveTab('accounts')}
            className="text-[10px] font-bold text-primary hover:underline transition-all"
          >
            Atur Semua
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {accountsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="min-w-[200px] h-[100px] bg-secondary/50 rounded-3xl animate-pulse border border-border" />
            ))
          ) : accounts.length === 0 ? (
            <div className="w-full p-8 rounded-3xl bg-secondary/30 border border-dashed border-border text-center">
              <p className="text-xs text-muted-foreground font-medium">Belum ada akun terdaftar.</p>
            </div>
          ) : (
            accounts.map((acc, i) => (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setActiveTab('accounts')}
                className="min-w-[220px] p-5 rounded-[28px] bg-card border border-border hover:border-primary/30 transition-all cursor-pointer group shadow-sm hover:shadow-xl hover:shadow-primary/5 shrink-0"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {acc.icon || '💰'}
                  </div>
                  <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest px-2 py-0.5 bg-secondary rounded-md">
                    {acc.type}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground/80 mb-1">{acc.name}</p>
                  <p className="text-base font-black font-mono tracking-tighter text-foreground">
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Chart */}
        <div className="glass-card space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                  <LineIcon size={18} />
                </div>
                <h3 className="text-sm font-bold">Tren Pengeluaran</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Saat Ini</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Lalu</span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-muted font-bold capitalize bg-secondary px-2 py-0.5 rounded-md">{timeFilter}</span>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.05}/>
                    <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'var(--muted-foreground)', fontSize: 10}} 
                  dy={10}
                />
                <YAxis hide domain={[0, 'dataMax + 100000']} />
                <Tooltip 
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card border border-border p-4 rounded-2xl shadow-xl space-y-3 min-w-[140px]">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">{label}</p>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-[10px] font-bold text-foreground opacity-60">Periode Ini:</span>
                              <span className="text-xs font-black text-primary font-mono">{formatCurrency(payload[0].value as number)}</span>
                            </div>
                            {payload[1] && (
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-[10px] font-bold text-muted-foreground opacity-60">Periode Lalu:</span>
                                <span className="text-xs font-bold text-muted-foreground font-mono">{formatCurrency(payload[1].value as number)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="prevExpense" 
                  stroke="var(--muted-foreground)" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  fillOpacity={1} 
                  fill="url(#colorPrev)" 
                  opacity={0.3}
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="var(--primary)" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorTrend)" 
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.isMax) {
                      return (
                        <g key={`max-${cx}`}>
                          <circle cx={cx} cy={cy} r={6} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
                          <rect x={cx - 30} y={cy - 30} width={60} height={20} rx={10} fill="var(--primary)" />
                          <text x={cx} y={cy - 16} textAnchor="middle" fill="var(--primary-foreground)" fontSize="8" fontWeight="bold">TERTINGGI</text>
                        </g>
                      );
                    }
                    if (payload.isMin) {
                      return (
                        <g key={`min-${cx}`}>
                          <circle cx={cx} cy={cy} r={4} fill="var(--warning)" stroke="var(--card)" strokeWidth={2} />
                        </g>
                      );
                    }
                    return null;
                  }}
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Expenses Summary (Progress Bars) */}
        <div className="glass-card space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <PieIcon size={18} />
              </div>
              <h3 className="text-sm font-bold">Ringkasan Pengeluaran (Top 3)</h3>
            </div>
            <button 
              onClick={() => setActiveTab('reports')}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              Laporan Detail
            </button>
          </div>
          
          <div className="space-y-6">
            {catData.length === 0 ? (
              <div className="py-12 text-center opacity-40">
                <p className="text-xs font-bold italic">Belum ada pengeluaran di filter ini.</p>
              </div>
            ) : (
              catData.slice(0, 3).map((item) => {
                const percentage = stats.expense > 0 ? (item.value / stats.expense) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{item.name}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black font-mono">{formatCurrency(item.value)}</span>
                        <span className="text-[9px] font-bold text-muted-foreground">{Math.round(percentage)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border/50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        style={{ backgroundColor: item.color }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
          { 
            label: 'Pemasukan Ini', 
            value: stats.income, 
            color: 'text-primary', 
            bg: 'bg-primary/10', 
            icon: TrendingUp,
            trend: incomeTrend,
            isCurrency: true
          },
          { 
            label: 'Pengeluaran Ini', 
            value: stats.expense, 
            color: 'text-destructive', 
            bg: 'bg-destructive/10', 
            icon: CreditCard,
            trend: -expenseTrend, 
            isCurrency: true
          },
          { 
            label: 'Cashflow Health', 
            value: `${Math.round(cashflowHealth * 100)}%`, 
            color: cashflowHealth > 0.2 ? 'text-primary' : 'text-warning', 
            bg: 'bg-secondary', 
            icon: Sparkles,
            trend: healthTrend * 100,
            isPercent: true 
          },
          { 
            label: 'Dana Darurat (Bulan)', 
            value: bufferMonths.toFixed(1), 
            color: bufferMonths > 3 ? 'text-primary' : 'text-destructive', 
            bg: 'bg-secondary', 
            icon: LineIcon,
            trend: bufferTrend,
            isRaw: true
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
            className="glass-card flex items-center justify-between group hover:border-primary/20 transition-all p-5"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <p className={cn("text-xl font-bold font-mono", stat.color)}>
                  {stat.isCurrency ? formatCurrency(stat.value as number) : stat.value}
                </p>
              </div>
              
              {/* Trend Indicator */}
              <div className="flex items-center gap-1 mt-1">
                {stat.trend !== 0 && (
                  <>
                    {stat.trend > 0 ? (
                      <ArrowUpRight size={10} className="text-primary" />
                    ) : (
                      <ArrowDownRight size={10} className="text-destructive" />
                    )}
                    <span className={cn(
                      "text-[9px] font-bold font-mono",
                      stat.trend > 0 ? "text-primary" : "text-destructive"
                    )}>
                      {Math.abs(stat.trend).toFixed(1)}% {stat.trend > 0 ? 'Naik' : 'Turun'}
                    </span>
                  </>
                )}
                {stat.trend === 0 && (
                  <span className="text-[9px] font-bold font-mono text-muted">Stabil</span>
                )}
              </div>
            </div>
            <div className={cn("p-3 rounded-xl group-hover:scale-110 transition-transform shadow-lg", stat.bg, stat.color)}>
              <stat.icon size={20} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions & Budget */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold">Transaksi Terbaru</h3>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'transactions' }))}
                className="text-[10px] uppercase font-bold text-primary hover:underline hover:text-primary/80 transition-colors"
              >
                Lihat Semua
              </button>
            </div>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <p className="text-center text-[10px] text-muted py-8 italic">Belum ada transaksi.</p>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between group p-2 hover:bg-foreground/5 rounded-xl transition-colors text-foreground">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                        tx.type === 'income' ? "bg-primary/10" : "bg-destructive/10"
                      )}>
                        {tx.type === 'income' ? '💰' : '🏷️'}
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight truncate max-w-[120px]">{tx.description}</p>
                        <p className="text-[10px] text-muted">{tx.category} • {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    <p className={cn(
                      "text-xs font-bold font-mono",
                      tx.type === 'income' ? "text-primary" : "text-destructive"
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Account Balances */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold">Saldo Akun</h3>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'accounts' }))}
                className="text-[10px] uppercase font-bold text-primary hover:underline hover:text-primary/80 transition-colors"
              >
                Atur
              </button>
            </div>
            <div className="space-y-4">
              {accountsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-muted" size={16} /></div>
              ) : accounts.length === 0 ? (
                <p className="text-center text-[10px] text-muted italic">Belum ada akun.</p>
              ) : (
                accounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3 text-foreground">
                      <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center text-sm">{acc.icon || '💰'}</div>
                      <span className="text-xs font-bold opacity-80">{acc.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-foreground tracking-tighter">{formatCurrency(acc.balance)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Budget Progress */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold">Ringkasan Anggaran</h3>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'budgets' }))}
                className="text-[10px] uppercase font-bold text-primary hover:underline hover:text-primary/80 transition-colors"
              >
                Atur
              </button>
            </div>
            <div className="space-y-5">
              {budgets.length === 0 ? (
                <p className="text-center text-[10px] text-muted py-8 italic">Belum ada anggaran.</p>
              ) : (
                budgets.slice(0, 3).map((budget) => {
                  const percentage = (budget.spent / budget.limit) * 100;
                  return (
                    <div key={budget.id} className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] md:text-xs">
                        <span className="font-bold flex items-center gap-2 text-foreground opacity-80 uppercase tracking-tighter">
                          <span role="img" aria-label={budget.category}>{budget.icon}</span> {budget.category}
                        </span>
                        <span className="text-muted font-mono">{formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}</span>
                      </div>
                      <div className="h-2 w-full bg-foreground/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentage, 100)}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full shadow-sm",
                            percentage > 80 ? "bg-destructive" : "bg-primary"
                          )}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

