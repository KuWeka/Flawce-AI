import React, { useState, useEffect } from 'react';
import { Plus, Target, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, Clock, X, Trash2, Save, Loader2 } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Budget, Transaction } from '@/src/lib/types';
import { useAuth } from '@/src/lib/AuthContext';
import { useCategories } from '@/src/lib/useCategories';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, format, isWithinInterval, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import Skeleton from './ui/Skeleton';

interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  monthlyTarget?: number;
  createdAt: FieldValue;
}

export default function Budgets() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Form State
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [icon, setIcon] = useState('💰');
  const [budgetPeriod, setBudgetPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [monthlyTarget, setMonthlyTarget] = useState('');

  useEffect(() => {
    if (!user) return;

    // Fetch user profile
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data as UserProfile);
        setMonthlyTarget(data.monthlyTarget?.toString() || '');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Fetch Budgets for selected period
    const qBudgets = query(
      collection(db, 'budgets'), 
      where('userId', '==', user.uid),
      where('period', '==', period)
    );
    
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      const b: Budget[] = [];
      snapshot.forEach(doc => b.push({ ...doc.data(), id: doc.id } as Budget));
      setBudgets(b);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'budgets');
      setIsLoading(false);
    });

    // Fetch Transactions to calculate spent on the fly
    // We could optimize this by only fetching transactions within the current period
    let start, end;
    if (period === 'daily') {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    } else if (period === 'weekly') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    const qTransactions = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      where('type', '==', 'expense'),
      where('date', '>=', start.toISOString()),
      where('date', '<=', end.toISOString())
    );

    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach(doc => txs.push({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubUser();
      unsubBudgets();
      unsubTransactions();
    };
  }, [user, period, currentDate]);

  const changePeriod = (direction: 'prev' | 'next') => {
    if (period === 'daily') {
      setCurrentDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
    } else if (period === 'weekly') {
      setCurrentDate(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
    } else {
      setCurrentDate(prev => addMonths(prev, direction === 'next' ? 1 : -1));
    }
  };

  const getPeriodLabel = () => {
    if (period === 'daily') {
      const today = startOfDay(new Date());
      const selected = startOfDay(currentDate);
      const diff = selected.getTime() - today.getTime();
      
      if (diff === 0) return 'Hari Ini';
      if (diff === -86400000) return 'Kemarin';
      if (diff === 86400000) return 'Besok';
      
      return format(currentDate, 'EEEE, d MMM yyyy', { locale: id });
    } else if (period === 'weekly') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy', { locale: id });
    }
  };

  const resetForm = () => {
    setCategory('');
    setLimit('');
    setIcon('💰');
    setBudgetPeriod(period);
    setEditingBudget(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setCategory(budget.category);
    setLimit(budget.limit.toString());
    setIcon(budget.icon);
    setBudgetPeriod(budget.period || 'monthly');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const budgetData = {
        category,
        limit: Number(limit),
        icon,
        userId: user.uid,
        period: budgetPeriod,
        month: format(currentDate, 'yyyy-MM'),
        updatedAt: serverTimestamp(),
      };

      if (editingBudget) {
        const budgetRef = doc(db, 'budgets', editingBudget.id);
        await updateDoc(budgetRef, budgetData);
      } else {
        await addDoc(collection(db, 'budgets'), {
          ...budgetData,
          spent: 0,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save budget:", error);
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        monthlyTarget: Number(monthlyTarget)
      });
      setIsTargetModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'budgets', id));
      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete budget:", error);
      handleFirestoreError(error, OperationType.DELETE, `budgets/${id}`);
    }
  };

  // Merge calculated spent from transactions into budgets
  const budgetsWithSpent = budgets.map(b => {
    const categorySpent = transactions
      .filter(tx => tx.category === b.category)
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { ...b, spent: categorySpent };
  });

  const totalLimit = budgetsWithSpent.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgetsWithSpent.reduce((acc, b) => acc + b.spent, 0);
  const globalTarget = userProfile?.monthlyTarget || 0;

  const icons = ['💰', '🍔', '🚗', '🛍️', '🏠', '🎟️', '🏥', '🎓', '🎁', '🔌', '☕', '🥦'];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary shadow-inner">
            <Target size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Anggaran</h1>
            <p className="text-muted-foreground text-sm font-medium">Atur limit per kategori dan pantau plafon bulanan.</p>
          </div>
        </div>

        {/* Period Switcher */}
        <div className="flex bg-secondary p-1 rounded-2xl border border-border/50 shadow-sm self-start lg:self-center">
          {(['daily', 'weekly', 'monthly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                period === p 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
            </button>
          ))}
        </div>

        {/* Navigator */}
        <div className="flex items-center bg-secondary p-1 rounded-2xl border border-border/50 shadow-sm">
          <button 
            onClick={() => changePeriod('prev')}
            className="p-3 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-6 py-2 min-w-[150px] text-center">
            <span className="text-sm font-bold text-foreground capitalize tracking-wide">{getPeriodLabel()}</span>
          </div>
          <button 
            onClick={() => changePeriod('next')}
            className="p-3 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsTargetModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-foreground border border-border rounded-2xl font-bold text-sm hover:bg-muted transition-all active:scale-95 shadow-sm"
          >
            <Target size={18} />
            Plafon
          </button>
          <button 
            onClick={openAddModal}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            Tambah
          </button>
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { 
            label: 'Total Plafon', 
            value: globalTarget, 
            icon: Target, 
            color: 'text-indigo-400',
            sub: 'Target Limit Global'
          },
          { 
            label: 'Total Ter-Alokasi', 
            value: totalLimit, 
            icon: ChevronRight, 
            color: totalLimit > globalTarget && globalTarget > 0 ? 'text-destructive' : 'text-blue-500',
            sub: 'Jumlah Limit Kategori'
          },
          { label: 'Terpakai', value: totalSpent, icon: Clock, color: 'text-warning', sub: 'Dari Transaksi' },
          { 
            label: 'Sisa Saldo Anggaran', 
            value: totalLimit - totalSpent, 
            icon: CheckCircle2, 
            color: 'text-primary',
            sub: 'Alokasi Belum Terpakai'
          },
        ].map((stat, i) => (
          <div key={i} className="glass-card flex flex-col gap-3 p-8 relative overflow-hidden group rounded-[2rem]">
            <div className={cn("absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-5 blur-xl transition-all group-hover:opacity-20", stat.color.replace('text-', 'bg-'))} />
            <stat.icon size={20} className={stat.color} />
            <div>
              <p className="text-[10px] uppercase font-bold text-muted">{stat.label}</p>
              <p className="text-[8px] text-muted -mt-0.5">{stat.sub}</p>
            </div>
            <p className="text-xl font-bold font-mono text-foreground mt-2 tabular-nums">
              {typeof stat.value === 'number' ? formatCurrency(stat.value) : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {isLoading ? (
          <>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="glass-card p-8 flex flex-col gap-6 border-border/50">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-16 h-3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="w-full h-2" />
                  <div className="flex justify-between">
                    <Skeleton className="w-16 h-3" />
                    <Skeleton className="w-16 h-3" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : budgetsWithSpent.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card bg-transparent border-dashed border-muted-foreground/20 opacity-60">
             <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
               <Target className="text-muted-foreground" size={32} />
             </div>
             <p className="text-sm font-bold text-foreground">Belum ada anggaran terdaftar</p>
             <p className="text-xs text-muted-foreground mt-1">Buat anggaran pertamamu untuk memantau pengeluaran.</p>
          </div>
        ) : (
          budgetsWithSpent.map((budget, i) => {
            const percentage = (budget.spent / budget.limit) * 100;
            let status = { label: 'Aman', color: 'bg-primary/10 text-primary', icon: '🟢' };
            
            if (percentage >= 100) {
              status = { label: 'Melebihi', color: 'bg-destructive/10 text-destructive', icon: '❌' };
            } else if (percentage >= 80) {
              status = { label: 'Hati-hati', color: 'bg-warning/10 text-warning', icon: '🟡' };
            }

            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => openEditModal(budget)}
                className="glass-card flex flex-col justify-between group hover:border-primary/30 transition-all cursor-pointer relative border-border/50"
              >
                <button 
                  onClick={(e) => handleDelete(budget.id, e)}
                  className={cn(
                    "absolute top-4 right-4 px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all z-20 shadow-lg",
                    deletingId === budget.id 
                      ? "bg-destructive text-destructive-foreground opacity-100 scale-105 shadow-destructive/20" 
                      : "text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                  )}
                >
                  <Trash2 size={14} />
                  {deletingId === budget.id && <span className="text-[10px] font-black uppercase tracking-wider">Hapus?</span>}
                </button>

                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                        {budget.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{budget.category}</h3>
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shadow-sm", status.color)}>
                           <span>{status.icon}</span> {status.label}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-muted-foreground">Terpakai</span>
                      <span className="text-foreground font-mono">{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden border border-border shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full shadow-[0_0_12px_rgba(0,0,0,0.1)]",
                          percentage >= 100 ? "bg-destructive" : percentage >= 80 ? "bg-warning" : "bg-primary"
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Terpakai</span>
                    <span className="text-xs font-bold font-mono text-foreground">{formatCurrency(budget.spent)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Limit</span>
                    <span className="text-xs font-bold font-mono text-foreground">{formatCurrency(budget.limit)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-card bg-background w-full max-w-md relative z-10 p-8 border-border shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{editingBudget ? 'Edit Anggaran' : 'Atur Anggaran'}</h2>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Kelola batasan pengeluaran</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Periode Anggaran</label>
                    <div className="flex bg-secondary p-1 rounded-xl border border-border gap-1">
                      {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBudgetPeriod(p)}
                          className={cn(
                            "flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                            budgetPeriod === p 
                              ? "bg-primary text-primary-foreground shadow-md" 
                              : "text-muted-foreground hover:text-foreground opacity-60"
                          )}
                        >
                          {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Pilih Kategori</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-2 border border-border rounded-2xl bg-secondary/30">
                      {categories.filter(c => c.type === 'expense' || c.type === 'both').length === 0 ? (
                        <div className="col-span-full py-6 text-center text-[10px] text-muted-foreground font-bold italic tracking-wider">
                          Belum ada kategori pengeluaran.
                        </div>
                      ) : categories.filter(c => c.type === 'expense' || c.type === 'both').map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategory(cat.name);
                            setIcon(cat.icon || '💰');
                          }}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left group/btn",
                            category === cat.name 
                              ? "bg-primary/10 border-primary shadow-md text-primary" 
                              : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                        >
                          <span className="text-xl group-hover/btn:scale-110 transition-transform">{cat.icon}</span>
                          <span className="text-[10px] font-bold uppercase truncate tracking-tight">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Limit Anggaran (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">Rp</span>
                      <input 
                        type="number" 
                        required
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        placeholder="0"
                        className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-mono font-bold transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      disabled={isSubmitting}
                      className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <Save size={20} />
                          Simpan Anggaran
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Target Global Modal */}
      <AnimatePresence>
        {isTargetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTargetModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card bg-background w-full max-w-sm relative z-10 p-8 border-border shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Plafon Bulanan</h2>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Target total belanja</p>
                </div>
                <button onClick={() => setIsTargetModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateTarget} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Target Pengeluaran Total (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">Rp</span>
                    <input 
                      type="number" 
                      required
                      value={monthlyTarget}
                      onChange={(e) => setMonthlyTarget(e.target.value)}
                      placeholder="0"
                      className="w-full bg-secondary border border-border rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-mono font-bold transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic ml-1">Batas maksimal pengeluaran seluruh akun dalam satu bulan.</p>
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Simpan Plafon'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

