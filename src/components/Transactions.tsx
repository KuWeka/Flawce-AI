import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Trash2, Edit2 } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { db } from '@/src/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Account } from '@/src/lib/types';
import { useAuth } from '@/src/lib/AuthContext';
import { useAccounts } from '@/src/lib/useAccounts';
import Skeleton from './ui/Skeleton';
import { deleteTransaction } from '@/src/services/transactionService';
import UndoSnackbar from './UndoSnackbar';
import CalendarView from './CalendarView';
import { LayoutList, Calendar as CalendarModeIcon } from 'lucide-react';

export default function Transactions() {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState('Semua');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  // Undo Logic
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach(doc => txs.push({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(txs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleTriggerDelete = (tx: Transaction) => {
    setTxToDelete(tx);
    setShowUndo(true);
  };

  const handleConfirmDelete = React.useCallback(async () => {
    if (!txToDelete || !user) return;
    
    // Optimistically hide the snackbar and clear selection
    const itemToDelete = { ...txToDelete };
    setTxToDelete(null);
    setShowUndo(false);

    try {
      await deleteTransaction(itemToDelete, user.uid);
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      // In a real app, we might want to alert the user that the delete failed
      // and potentially restore the item to the list if we were doing optimistic UI on the list too
    }
  }, [txToDelete, user]);

  const handleUndoDelete = React.useCallback(() => {
    setTxToDelete(null);
    setShowUndo(false);
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    // Hide the pending delete item from UI
    if (showUndo && txToDelete && tx.id === txToDelete.id) return false;
    
    const txDate = new Date(tx.date);
    const matchesFilter = filter === 'Semua' || (filter === 'Pemasukan' && tx.type === 'income') || (filter === 'Pengeluaran' && tx.type === 'expense');
    const matchesSearch = 
      tx.description.toLowerCase().includes(search.toLowerCase()) || 
      tx.category.toLowerCase().includes(search.toLowerCase()) ||
      tx.amount.toString().includes(search);
    
    let matchesDate = true;
    if (dateRange.start) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && txDate >= start;
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && txDate <= end;
    }

    return matchesFilter && matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold">Riwayat Transaksi</h1>
          <p className="text-muted">Semua catatan keuangan kamu dalam satu feed.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* View Toggle */}
          <div className="bg-secondary p-1 rounded-xl border border-border flex gap-1 mr-2">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutList size={18} />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'calendar' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <CalendarModeIcon size={18} />
            </button>
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..." 
              className="w-full bg-secondary border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
               "p-2.5 rounded-xl border transition-all shadow-sm flex items-center justify-center",
               showFilters 
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                : "bg-secondary border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <Filter size={18} />
          </button>
        </div>
      </header>

      {viewMode === 'list' ? (
        <>
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-foreground/5">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted ml-1">Rentang Tanggal</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={e => setDateRange({...dateRange, start: e.target.value})}
                        className="flex-1 bg-secondary border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                      />
                      <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">ke</span>
                      <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={e => setDateRange({...dateRange, end: e.target.value})}
                        className="flex-1 bg-secondary border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Kategori Tipe</label>
                    <div className="flex gap-2">
                      {['Semua', 'Pemasukan', 'Pengeluaran'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setFilter(p)}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-xs font-bold transition-all border",
                            filter === p 
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                              : "bg-secondary border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button 
                      onClick={() => { setDateRange({start: '', end: ''}); setFilter('Semua'); setSearch(''); }}
                      className="text-[10px] uppercase font-bold text-destructive hover:underline underline-offset-4"
                    >
                      Reset Filter
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transactions List */}
          <div className="space-y-8">
            {isLoading ? (
              <div className="space-y-6">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="glass-card p-6 flex items-center justify-between border-border/50 rounded-2xl">
                    <div className="flex items-center gap-6">
                      <Skeleton className="w-14 h-14 rounded-2xl" />
                      <div className="space-y-3">
                        <Skeleton className="w-40 h-5" />
                        <Skeleton className="w-28 h-3" />
                      </div>
                    </div>
                    <Skeleton className="w-24 h-8" />
                  </div>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-24 glass-card bg-transparent border-dashed flex flex-col items-center justify-center opacity-40 rounded-3xl">
                <CalendarModeIcon size={64} className="mb-6" />
                <p className="text-base font-bold">Tidak ada transaksi yang cocok</p>
                <p className="text-xs">Coba sesuaikan filter atau cari transaksi lain.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((tx: Transaction) => (
                  <TransactionItem 
                    key={tx.id} 
                    tx={tx} 
                    accounts={accounts} 
                    onDelete={handleTriggerDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <CalendarView transactions={filteredTransactions} />
      )}

      <AnimatePresence>
        {showUndo && txToDelete && (
          <UndoSnackbar 
            message={`Dihapus: ${txToDelete.description}`}
            onUndo={handleUndoDelete}
            onConfirm={handleConfirmDelete}
            duration={5000}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface TransactionItemProps {
  tx: Transaction;
  accounts: Account[];
  onDelete: (tx: Transaction) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ tx, accounts, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const account = accounts.find(a => a.id === tx.accountId);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isConfirming) {
      setIsConfirming(true);
      setTimeout(() => setIsConfirming(false), 3000);
      return;
    }
    onDelete(tx);
  };

  return (
    <div 
      className={cn(
        "glass-card p-6 transition-all overflow-hidden cursor-pointer group hover:bg-secondary/50 border-border rounded-[2rem]",
        isExpanded ? "ring-2 ring-primary/20 bg-secondary/80 translate-x-1 shadow-lg shadow-primary/5" : "",
        isConfirming ? "ring-2 ring-destructive/50 bg-destructive/5 border-destructive/20" : ""
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-all group-hover:scale-105",
            tx.type === 'income' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          )}>
            {tx.type === 'income' ? '💰' : '🏷️'}
          </div>
          <div>
            <h4 className="text-base font-bold leading-none mb-2 text-foreground transition-colors group-hover:text-primary">{tx.description}</h4>
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn(
                "text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest",
                tx.type === 'income' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              )}>{tx.category}</span>
              {account && (
                <span className="text-[10px] bg-blue-500/10 px-3 py-1 rounded-full text-blue-500 border border-blue-500/10 font-bold flex items-center gap-2">
                  <span>{account.icon || '💳'}</span>
                  <span>{account.name}</span>
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/60 font-medium">
                {new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • 
                {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className={cn(
            "text-lg font-bold font-mono transition-all tabular-nums",
            tx.type === 'income' ? "text-primary" : "text-destructive"
          )}>
            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pt-4 mt-4 border-t border-foreground/5 flex items-center justify-between"
          >
            <div className="flex gap-4">
               <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-tighter text-muted font-bold">Status</span>
                <span className="text-[10px] font-bold text-foreground">Berhasil Dicatat</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('openTransactionForm', { detail: tx }));
                }}
                className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-all hover:scale-105 active:scale-95"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={handleDeleteClick} 
                className={cn(
                  "px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg active:scale-95",
                  isConfirming 
                    ? "bg-destructive text-destructive-foreground scale-105 shadow-destructive/20" 
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                )}
              >
                <Trash2 size={16} />
                {isConfirming && <span className="text-[10px] font-black uppercase tracking-wider">Hapus?</span>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

