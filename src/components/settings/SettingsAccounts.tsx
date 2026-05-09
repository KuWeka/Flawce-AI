import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet, Plus, Edit2, Trash2, CreditCard, Banknote, Landmark } from 'lucide-react';
import { useAccounts } from '../../lib/useAccounts';
import { Account } from '../../lib/types';
import { formatCurrency, cn } from '../../lib/utils';

export default function SettingsAccounts({ onSuccess, onError }: any) {
  const { accounts, loading, addAccount, updateAccount, deleteAccount } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'ewallet' | 'cash'>('bank');
  const [balance, setBalance] = useState<number>(0);
  const [icon, setIcon] = useState('🏦');

  const icons = ['🏦', '📱', '💵', '💳', '🐖', '🪙', '📈', '💎'];

  const resetForm = () => {
    setName('');
    setType('bank');
    setBalance(0);
    setIcon('🏦');
    setEditingAccount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { name, type, balance: Number(balance), icon };
      if (editingAccount) {
        await updateAccount(editingAccount.id, data);
        onSuccess('Akun berhasil diperbarui');
      } else {
        await addAccount(data);
        onSuccess('Akun baru berhasil ditambahkan');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      onError(error.message);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Kelola Akun</h2>
          <p className="text-sm text-muted-foreground mt-1">Tambahkan atau sesuaikan dompet dan rekening Anda</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="glass-card p-6 border-border/50 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-2xl">
                {acc.icon || '💰'}
              </div>
              <div>
                <h3 className="font-bold text-sm">{acc.name}</h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase">{acc.type}</p>
                <p className="text-xs font-bold mt-1">{formatCurrency(acc.balance)}</p>
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  setEditingAccount(acc);
                  setName(acc.name);
                  setType(acc.type);
                  setBalance(acc.balance);
                  setIcon(acc.icon || '🏦');
                  setIsModalOpen(true);
                }}
                className="p-2 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => { if(confirm('Hapus akun ini?')) deleteAccount(acc.id); }}
                className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.form 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={handleSubmit}
            className="relative w-full max-w-md bg-card border border-border p-8 rounded-[32px] shadow-2xl space-y-6"
          >
            <h3 className="text-xl font-bold">{editingAccount ? 'Edit Akun' : 'Tambah Akun Baru'}</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted ml-1">Nama Akun</label>
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Contoh: BCA, Gopay, Dompet"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted ml-1">Tipe</label>
                  <select 
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full bg-secondary border border-border rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="bank">Bank</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="cash">Tunai</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted ml-1">Saldo Awal</label>
                  <input 
                    type="number"
                    value={balance}
                    onChange={e => setBalance(Number(e.target.value))}
                    className="w-full bg-secondary border border-border rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted ml-1">Icon</label>
                <div className="flex flex-wrap gap-2">
                   {icons.map(i => (
                     <button 
                       key={i}
                       type="button"
                       onClick={() => setIcon(i)}
                       className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                         icon === i ? "bg-primary text-white scale-110 shadow-lg" : "bg-secondary hover:bg-muted"
                       )}
                     >
                       {i}
                     </button>
                   ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
               <button 
                type="submit"
                className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-98 transition-all"
               >
                 {editingAccount ? 'Simpan Perubahan' : 'Tambah Akun'}
               </button>
               <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-4 bg-secondary rounded-2xl font-bold"
               >
                 Batal
               </button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}
