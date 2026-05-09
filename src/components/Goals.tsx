import React, { useState, useEffect } from 'react';
import { Plus, Target, Calendar, CreditCard, X, Trash2, Save, Loader2, TrendingUp, AlertCircle, CheckCircle2, Trophy, Coins, Wallet } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn, formatCurrency } from '@/src/lib/utils';
import { db, OperationType, handleFirestoreError } from '@/src/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Goal, Account } from '@/src/lib/types';
import { useAuth } from '@/src/lib/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddFundsModalOpen, setIsAddFundsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#3b82f6');
  const [accountId, setAccountId] = useState('');
  const [amountToAdd, setAmountToAdd] = useState('');

  useEffect(() => {
    if (!user) return;

    // Fetch Goals
    const qGoals = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      const g: Goal[] = [];
      snapshot.forEach(doc => g.push({ ...doc.data(), id: doc.id } as Goal));
      setGoals(g.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'goals');
      setIsLoading(false);
    });

    // Fetch Accounts
    const qAccounts = query(collection(db, 'accounts'), where('userId', '==', user.uid));
    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      const a: Account[] = [];
      snapshot.forEach(doc => a.push({ ...doc.data(), id: doc.id } as Account));
      setAccounts(a);
      if (a.length > 0 && !accountId) {
        const defaultAcc = a.find(acc => acc.isDefault) || a[0];
        setAccountId(defaultAcc.id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
    });

    return () => {
      unsubGoals();
      unsubAccounts();
    };
  }, [user]);

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setDeadline('');
    setIcon('🎯');
    setColor('#3b82f6');
    setAccountId(accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '');
    setSelectedGoal(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const goalData = {
        name,
        targetAmount: Number(targetAmount),
        currentAmount: 0,
        deadline,
        icon,
        color,
        accountId,
        userId: user.uid,
        isCompleted: false,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'goals'), goalData);
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'goals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGoal || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newAmount = selectedGoal.currentAmount + Number(amountToAdd);
      const isCompleted = newAmount >= selectedGoal.targetAmount;

      await updateDoc(doc(db, 'goals', selectedGoal.id), {
        currentAmount: newAmount,
        isCompleted: isCompleted,
        updatedAt: serverTimestamp()
      });

      // Update account balance if accountId is present
      if (selectedGoal.accountId) {
        const account = accounts.find(a => a.id === selectedGoal.accountId);
        if (account) {
          await updateDoc(doc(db, 'accounts', account.id), {
            balance: account.balance - Number(amountToAdd)
          });
          
          // Log as transaction?
          await addDoc(collection(db, 'transactions'), {
            userId: user.uid,
            amount: Number(amountToAdd),
            type: 'expense',
            category: 'Tabungan',
            description: `Menabung untuk: ${selectedGoal.name}`,
            date: new Date().toISOString(),
            accountId: selectedGoal.accountId,
            createdAt: serverTimestamp()
          });
        }
      }

      if (isCompleted && !selectedGoal.isCompleted) {
        // Burst pertama - dari kiri dan kanan
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { x: 0.2, y: 0.6 }
        });
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { x: 0.8, y: 0.6 }
        });

        // Burst kedua setelah 0.5 detik - dari tengah ke atas
        setTimeout(() => {
          confetti({
            particleCount: 80,
            spread: 120,
            startVelocity: 45,
            origin: { x: 0.5, y: 0.7 }
          });
        }, 500);

        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5000);
      }

      setIsAddFundsModalOpen(false);
      setAmountToAdd('');
      setSelectedGoal(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `goals/${selectedGoal.id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!goalToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'goals', goalToDelete));
      setIsDeleteModalOpen(false);
      setGoalToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${goalToDelete}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const icons = ['🎯', '🏠', '🚗', '💍', '💻', '✈️', '🎓', '🏥', '💰', '🚲', '📱'];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];

  const [showCelebration, setShowCelebration] = useState(false);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-background/40 backdrop-blur-md pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 20 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full scale-150"
                />
                <div className="w-40 h-40 bg-primary/10 rounded-full border-4 border-primary flex items-center justify-center text-7xl shadow-2xl shadow-primary/20 relative z-10">
                  🏆
                </div>
              </div>
              <div className="text-center space-y-2 relative z-10">
                <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase">Target Tercapai!</h2>
                <p className="text-muted-foreground font-bold uppercase tracking-widest">Waktunya merayakan kesuksesanmu</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary shadow-inner">
            <Trophy size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
            <p className="text-muted-foreground text-sm font-medium">Wujudkan impianmu dengan menabung secara konsisten.</p>
          </div>
        </div>

        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Target Baru
        </button>
      </header>

      {/* Goal List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin shadow-lg shadow-primary/20" />
            <p className="text-xs text-muted-foreground font-semibold animate-pulse">Memuat target...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card bg-transparent border-dashed border-muted-foreground/20 opacity-60">
             <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
               <Target className="text-muted-foreground" size={32} />
             </div>
             <p className="text-sm font-bold text-foreground">Belum ada target keuangan</p>
             <p className="text-xs text-muted-foreground mt-1">Mulai rencanakan masa depanmu hari ini.</p>
          </div>
        ) : (
          goals.map((goal, i) => {
            const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const daysLeft = differenceInDays(parseISO(goal.deadline), new Date());
            const isLate = daysLeft < 0 && !goal.isCompleted;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card flex flex-col justify-between group hover:border-primary/30 transition-all relative border-border/50 overflow-hidden p-5 sm:p-6"
              >
                {/* Completion Decoration */}
                {goal.isCompleted && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.05, scale: 1.5 }}
                    className="absolute -right-10 -top-10 w-48 h-48 bg-primary rounded-full pointer-events-none"
                  />
                )}

                <div className="space-y-4 sm:space-y-6 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div 
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-2xl sm:text-3xl shadow-inner transition-transform group-hover:scale-110 group-hover:-rotate-3"
                        style={{ borderColor: `${goal.color}30` }}
                      >
                        {goal.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground mb-1 truncate text-sm sm:text-base">{goal.name}</h3>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                           {goal.isCompleted ? (
                             <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none">
                               <CheckCircle2 size={10} /> Selesai
                             </span>
                           ) : isLate ? (
                             <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none">
                               <AlertCircle size={10} /> Telat
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none">
                               <TrendingUp size={10} /> On Track
                             </span>
                           )}
                           <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-[7px] sm:text-[8px] font-black uppercase tracking-widest leading-none">
                             {daysLeft >= 0 ? `${daysLeft}d` : 'Expired'}
                           </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setGoalToDelete(goal.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground font-mono">{Math.round(percentage)}%</span>
                    </div>
                    <div className="h-2 sm:h-3 w-full bg-secondary rounded-full overflow-hidden border border-border shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full shadow-lg"
                        style={{ backgroundColor: goal.color }}
                      />
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[7px] sm:text-[8px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1">Terkumpul</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-foreground leading-none">{formatCurrency(goal.currentAmount)}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[7px] sm:text-[8px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1">Target</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-foreground leading-none">{formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {!goal.isCompleted && (
                  <button 
                    onClick={() => {
                      setSelectedGoal(goal);
                      setIsAddFundsModalOpen(true);
                    }}
                    className="mt-6 sm:mt-8 w-full py-2.5 sm:py-3 rounded-xl border border-border bg-secondary/50 text-[10px] sm:text-xs font-bold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    Tambah Dana
                  </button>
                )}
                
                {goal.isCompleted && (
                  <div className="mt-6 sm:mt-8 w-full py-2.5 sm:py-3 rounded-xl bg-primary/10 text-primary text-[10px] sm:text-xs font-bold text-center border border-primary/20 flex items-center justify-center gap-2 animate-pulse">
                    <Trophy size={14} />
                    Tercapai!
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Goal Modal */}
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
                  <h2 className="text-xl font-bold text-foreground">Target Baru</h2>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Pasang target finansialmu</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Nama Target</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Dana Darurat, Cicilan Rumah"
                    className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-bold transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Target Dana (Rp)</label>
                    <input 
                      type="number" 
                      required
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-mono font-bold transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Deadline</label>
                    <input 
                      type="date" 
                      required
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-bold transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1 text-center block">Identitas Target</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap justify-center gap-2 p-3 border border-border rounded-2xl bg-secondary/30">
                      {icons.map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setIcon(e)}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center text-xl rounded-xl border transition-all",
                            icon === e ? "bg-primary/20 border-primary shadow-sm scale-110" : "bg-card border-border hover:border-primary/30"
                          )}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      {colors.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            color === c ? "border-foreground scale-110 shadow-lg" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Buat Target Sekarang'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Funds Modal */}
      <AnimatePresence>
        {isAddFundsModalOpen && selectedGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddFundsModalOpen(false);
                setSelectedGoal(null);
              }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card bg-background w-full max-w-sm relative z-10 p-8 border-border shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl" style={{ borderColor: selectedGoal.color, borderLeft: `3px solid ${selectedGoal.color}` }}>
                     {selectedGoal.icon}
                   </div>
                   <div>
                     <h2 className="text-base font-bold text-foreground">Tambah Dana</h2>
                     <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest truncate max-w-[150px]">{selectedGoal.name}</p>
                   </div>
                </div>
                <button onClick={() => {
                  setIsAddFundsModalOpen(false);
                  setSelectedGoal(null);
                }} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddFunds} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Ambil dari Akun</label>
                    <div className="grid grid-cols-1 gap-2">
                      {accounts.map(acc => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setAccountId(acc.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                            accountId === acc.id 
                              ? "bg-primary/5 border-primary text-primary" 
                              : "bg-background border-border text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{acc.icon}</span>
                            <span className="text-[10px] font-bold uppercase">{acc.name}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold opacity-60">{formatCurrency(acc.balance)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Nominal Tabungan (Rp)</label>
                    <input 
                      type="number" 
                      required
                      autoFocus
                      max={accounts.find(a => a.id === accountId)?.balance || 0}
                      value={amountToAdd}
                      onChange={(e) => setAmountToAdd(e.target.value)}
                      placeholder="0"
                      className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-mono font-bold transition-all"
                    />
                    {accountId && (
                      <p className="text-[9px] text-muted-foreground text-right italic">Sisa Saldo: {formatCurrency(accounts.find(a => a.id === accountId)?.balance || 0)}</p>
                    )}
                  </div>
                </div>

                <button 
                  disabled={isSubmitting || !amountToAdd || Number(amountToAdd) <= 0}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      <Save size={18} />
                      Tabung Sekarang
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-sm relative z-10 p-8 border-destructive/20 shadow-2xl"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive">
                  <AlertCircle size={32} />
                </div>
                
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">Hapus Target?</h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    Apakah kamu yakin ingin menghapus target ini? Seluruh progress menabung di target ini akan hilang.
                  </p>
                </div>

                <div className="flex gap-2 w-full pt-4">
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-secondary rounded-xl font-bold text-xs hover:bg-muted transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    disabled={isSubmitting}
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-3 bg-destructive text-destructive-foreground rounded-xl font-bold text-xs shadow-lg shadow-destructive/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Iya, Hapus'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
