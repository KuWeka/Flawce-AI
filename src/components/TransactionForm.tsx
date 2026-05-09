import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, X, Check, Loader2, Wallet } from 'lucide-react';
import { db } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/src/lib/AuthContext';
import { useCategories } from '@/src/lib/useCategories';
import { useCategoryRules } from '@/src/lib/useCategoryRules';
import { applyAutoCategory } from '@/src/lib/categoryUtils';
import { useAccounts } from '@/src/lib/useAccounts';
import { cn } from '@/src/lib/utils';
import { Budget, Transaction } from '@/src/lib/types';
import { createTransaction, updateTransaction } from '@/src/services/transactionService';
import { ChevronDown } from 'lucide-react';

interface TransactionFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
  isInline?: boolean;
}

export default function TransactionForm({ onClose, onSuccess, initialData, isInline }: TransactionFormProps) {
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();
  const { rules } = useCategoryRules();
  const { accounts, loading: accountsLoading } = useAccounts();
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [accountId, setAccountId] = useState(initialData?.accountId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasUserOverridden, setHasUserOverridden] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // Auto-fill category based on description rules
  React.useEffect(() => {
    if (description && !hasUserOverridden && !initialData) {
      const suggested = applyAutoCategory(description, rules);
      if (suggested && suggested !== category) {
        setCategory(suggested);
        setAutoFilled(true);
      } else if (!suggested && autoFilled) {
        // If it was auto-filled but now no rule matches, maybe clear it? 
        // User says: "Kalau hasilnya tidak null DAN user belum pernah pilih kategori secara manual di sesi ini, set kategori otomatis"
        // So we only set if suggested is not null.
      }
    }
  }, [description, rules, hasUserOverridden, initialData]);

  // Set default account if none selected
  React.useEffect(() => {
    if (!accountId && accounts.length > 0) {
      const defaultAcc = accounts.find(a => a.isDefault) || accounts[0];
      setAccountId(defaultAcc.id);
    }
  }, [accounts, accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !category || !accountId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const numAmount = parseFloat(amount);
      const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

      const txData = {
        userId: user.uid,
        amount: numAmount,
        type,
        category: normalizedCategory,
        description,
        accountId,
        date: initialData?.date || new Date().toISOString(),
      };

      if (initialData?.id) {
        await updateTransaction(initialData.id, initialData as Transaction, txData, user.uid);
      } else {
        await createTransaction(txData, user.uid);
      }

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        if (!isInline) onClose();
        else {
          // Reset form if inline
          setAmount('');
          setCategory('');
          setDescription('');
          setShowSuccess(false);
        }
      }, 1500);
    } catch (error) {
      console.error("Failed to save transaction:", error);
      alert("Gagal menyimpan transaksi. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className={cn(
      "w-full max-w-md mx-auto relative overflow-hidden",
      !isInline && "glass-card p-6"
    )}>
      {(!isInline || initialData) && (
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <div className={cn("p-2 rounded-lg transition-colors", initialData ? "bg-blue-500/10" : "bg-primary/10")}>
              {initialData ? <Plus className="text-blue-500 rotate-45" size={20} /> : <Plus className="text-primary" size={20} />}
            </div>
            {initialData ? 'Edit Transaksi' : 'Catat Manual'}
          </h3>
          {!isInline && (
            <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Toggle */}
        <div className="flex bg-muted p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => { setType('expense'); setCategory(''); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
              type === 'expense' ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Minus size={16} /> Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => { setType('income'); setCategory(''); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
              type === 'income' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Plus size={16} /> Pemasukan
          </button>
        </div>

        {/* Amount */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">Jumlah (Rp)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">Rp</span>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl py-3 pl-10 pr-4 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Akun</label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl py-3 pl-10 pr-4 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 appearance-none transition-all"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                  {accounts.length === 0 && <option disabled>Tidak ada akun</option>}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={14} className="text-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-muted uppercase tracking-wider">Kategori</label>
            {autoFilled && (
              <span className="text-[9px] font-bold text-primary flex items-center gap-1 animate-in slide-in-from-right-1 duration-300">
                <Plus size={10} className="rotate-45" /> Terisi otomatis
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categoriesLoading ? (
              <div className="col-span-full py-4 text-center">
                <Loader2 className="animate-spin mx-auto text-muted" size={16} />
              </div>
            ) : categories.filter(c => c.type === type || c.type === 'both').length === 0 ? (
               <div className="col-span-full text-[10px] text-muted italic p-2 border border-dashed border-white/10 rounded-lg text-center">
                 Belum ada kategori.
               </div>
            ) : categories
              .filter(c => c.type === type || c.type === 'both')
              .map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.name);
                    setHasUserOverridden(true);
                    setAutoFilled(false);
                  }}
                  className={cn(
                    "py-2.5 px-3 rounded-lg text-[10px] font-bold border transition-all text-center uppercase tracking-tighter flex items-center justify-center gap-2",
                    category === cat.name 
                      ? "bg-primary/10 border-primary/50 text-primary shadow-sm" 
                      : "bg-secondary border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <span className="text-xs">{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase tracking-wider">Deskripsi (Opsional)</label>
          <input
            type="text"
            placeholder="Contoh: Makan Siang"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-secondary border border-border rounded-xl py-3 px-4 text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !amount || !category}
          className={cn(
            "w-full py-4 rounded-xl font-bold transition-all shadow-xl flex items-center justify-center gap-2",
            type === 'expense' ? "bg-destructive text-destructive-foreground shadow-destructive/20" : "bg-primary text-primary-foreground shadow-primary/20",
            (isSubmitting || !amount || !category) && "opacity-50 grayscale cursor-not-allowed transform-none"
          )}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>Simpan Transaksi</>
          )}
        </button>
      </form>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-50 rounded-2xl backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-primary/40"
            >
              <Check className="text-primary-foreground" size={32} strokeWidth={3} />
            </motion.div>
            <h4 className="text-xl font-bold text-foreground">Tersimpan!</h4>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isInline) return content;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      {content}
    </motion.div>
  );
}
