import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Loader2, Wallet, CreditCard, Landmark, Banknote, Sparkles } from 'lucide-react';
import { useAccounts } from '@/src/lib/useAccounts';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Account } from '@/src/lib/types';

export default function Accounts() {
  const { accounts, loading, addAccount, updateAccount, deleteAccount } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('cash');
  const [balance, setBalance] = useState('');
  const [icon, setIcon] = useState('💵');
  const [color, setColor] = useState('#2dd4bf');
  const [isDefault, setIsDefault] = useState(false);

  const icons = ['💵', '💳', '🏦', '📱', '💰', '👛', '🐖', '🏢', '💹', '🛒', '🍔', '🚗', '✈️'];
  const colors = ['#2dd4bf', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#6366f1'];
  
  const accountTypes: { id: Account['type'], label: string, icon: any }[] = [
    { id: 'cash', label: 'Tunai', icon: Banknote },
    { id: 'bank', label: 'Bank', icon: Landmark },
    { id: 'ewallet', label: 'E-Wallet', icon: Wallet },
    { id: 'credit', label: 'Kartu Kredit', icon: CreditCard },
  ];

  const resetForm = () => {
    setName('');
    setType('cash');
    setBalance('');
    setIcon('💵');
    setColor('#2dd4bf');
    setIsDefault(false);
    setEditingAccount(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setBalance(acc.balance.toString());
    setIcon(acc.icon || '💵');
    setColor(acc.color || '#2dd4bf');
    setIsDefault(acc.isDefault || false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const accData = { 
        name, 
        type, 
        balance: parseFloat(balance) || 0,
        icon,
        color,
        isDefault
      };
      
      if (editingAccount) {
        await updateAccount(editingAccount.id, accData);
      } else {
        await addAccount(accData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save account:", error);
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
      await deleteAccount(id);
      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete account:", error);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const totalBalance = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary shadow-inner">
            <Wallet size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kas & Bank</h1>
            <p className="text-muted-foreground text-sm font-medium">Kelola saldo dan transaksi dari berbagai rekening.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-secondary border border-border px-6 py-3 rounded-2xl flex flex-col justify-center shadow-sm">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] leading-none mb-1.5">Total Saldo Gabungan</span>
            <span className="text-xl font-bold font-mono text-primary tabular-nums">{formatCurrency(totalBalance)}</span>
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            Tambah
          </button>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin shadow-lg shadow-primary/20" />
          <p className="text-xs text-muted-foreground font-semibold animate-pulse">Memuat daftar akun...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="col-span-full py-20 text-center glass-card bg-transparent border-dashed border-muted-foreground/20 opacity-60">
           <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
             <Landmark className="text-muted-foreground" size={32} />
           </div>
           <p className="text-sm font-bold text-foreground">Belum ada akun terdaftar</p>
           <button onClick={openAddModal} className="text-primary text-xs mt-2 underline font-bold uppercase tracking-wider">Buat akun pertama kamu</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const TypeIcon = accountTypes.find(t => t.id === acc.type)?.icon || Wallet;
            return (
                <motion.div
                  key={acc.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card group transition-all flex flex-col justify-between p-6 h-full relative overflow-hidden border-border/50"
                  style={{ 
                    borderLeft: acc.isDefault ? `4px solid ${acc.color || 'var(--primary)'}` : undefined,
                    boxShadow: acc.isDefault ? `0 10px 30px -10px ${acc.color}20` : undefined
                  }}
                >
                  <div className="absolute -right-4 -top-4 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500" 
                    style={{ backgroundColor: `${acc.color || 'var(--primary)'}10` }}
                  />
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300"
                        style={{ borderColor: `${acc.color}30` }}
                      >
                        {acc.icon || '💰'}
                      </div>
                      <div className="flex items-center gap-2">
                        {acc.isDefault && (
                          <div className="bg-primary/10 text-primary p-1.5 rounded-lg" title="Default Account">
                            <Sparkles size={14} />
                          </div>
                        )}
                        <button 
                          onClick={() => openEditModal(acc)}
                          className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-90"
                        >
                          <Edit2 size={16} />
                        </button>
                      <button 
                        onClick={(e) => handleDelete(acc.id, e)}
                        className={cn(
                          "p-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-90",
                          deletingId === acc.id 
                            ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20" 
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        )}
                      >
                        <Trash2 size={16} />
                        {deletingId === acc.id && <span className="text-[10px] font-black uppercase tracking-wider">OK?</span>}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">{acc.name}</h3>
                    <div className="flex items-center gap-2 mb-8">
                       <div className="p-1 rounded-md bg-muted text-muted-foreground">
                         <TypeIcon size={12} />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">
                        {accountTypes.find(t => t.id === acc.type)?.label || acc.type}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-border/50">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] block mb-1">Saldo Saat Ini</span>
                  <p className="text-2xl font-bold font-mono text-foreground tabular-nums tracking-tight tracking-tighter">
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
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
                    <h2 className="text-xl font-bold text-foreground">{editingAccount ? 'Edit Akun' : 'Akun Baru'}</h2>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Atur sumber dana kamu</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Nama Akun</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Tabungan Utama"
                      className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-bold transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Tipe Akun</label>
                      <div className="relative">
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value as any)}
                          className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground appearance-none font-bold transition-all"
                        >
                          {accountTypes.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                          ))}
                        </select>
                        <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1">Saldo Awal (Rp)</label>
                      <input 
                        type="number" 
                        required
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        placeholder="0"
                        className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-mono font-bold transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-3">
                      <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-1 text-center block">Ikon & Warna</label>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap justify-center gap-2 p-2 border border-border rounded-xl bg-secondary/30">
                          {icons.map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setIcon(emoji)}
                              className={cn(
                                "w-10 h-10 flex items-center justify-center text-xl rounded-lg border transition-all",
                                icon === emoji ? "bg-primary/20 border-primary" : "bg-card border-border hover:border-primary/40"
                              )}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          {colors.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setColor(c)}
                              className={cn(
                                "w-8 h-8 rounded-full border-2 transition-all",
                                color === c ? "border-foreground scale-110" : "border-transparent"
                              )}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl border border-border">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-wider text-foreground">Set Sebagai Default</span>
                      <span className="text-[9px] text-muted-foreground">Pilih otomatis saat catat transaksi</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDefault(!isDefault)}
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-all duration-300",
                        isDefault ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm",
                        isDefault ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="pt-4">
                    <button 
                      disabled={isSubmitting || !name}
                      className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <>
                          <Save size={20} />
                          Simpan Akun
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
