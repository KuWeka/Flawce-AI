import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Database, Download, Trash2, FileText, Table as TableIcon, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db, OperationType, handleFirestoreError } from '../../lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { exportTransactionsToExcel, exportTransactionsToPDF } from '../../services/exportService';

interface SettingsDataProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function SettingsData({ onSuccess, onError }: SettingsDataProps) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ transactions: 0, budgets: 0, accounts: 0, goals: 0, categories: 0, categoryRules: 0 });
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const collections = ['transactions', 'budgets', 'accounts', 'goals', 'categories', 'categoryRules'];
      const results = await Promise.all(
        collections.map(async (col) => {
          const q = query(collection(db, col), where('userId', '==', user.uid));
          const snap = await getDocs(q);
          return snap.size;
        })
      );
      setStats({
        transactions: results[0],
        budgets: results[1],
        accounts: results[2],
        goals: results[3],
        categories: results[4],
        categoryRules: results[5]
      });
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!user) return;
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (format === 'xlsx') exportTransactionsToExcel(txs);
      else exportTransactionsToPDF(txs);
      onSuccess(`Data berhasil diekspor ke ${format.toUpperCase()}`);
    } catch (error: any) {
      onError(error.message);
    }
  };

  const handleDeleteAllData = async () => {
    if (!user || deleteConfirm !== 'HAPUS') return;
    setLoading(true);
    try {
      const collections = ['transactions', 'budgets', 'accounts', 'goals', 'categories', 'categoryRules'];
      const batch = writeBatch(db);
      
      for (const col of collections) {
        const q = query(collection(db, col), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        snap.forEach(d => batch.delete(d.ref));
      }
      
      // Delete user profile document too
      batch.delete(doc(db, 'users', user.uid));
      
      await batch.commit().catch(e => handleFirestoreError(e, OperationType.WRITE, 'all_collections_batch'));
      onSuccess("Seluruh data Anda telah dihapus secara permanen.");
      setTimeout(() => logout(), 2000);
    } catch (error: any) {
      console.error("Deletion error:", error);
      onError(error.message);
    } finally {
      setLoading(false);
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-2xl font-bold text-foreground">Data</h2>
        <p className="text-sm text-muted-foreground mt-1 font-medium">Kelola data transaksi dan preferensi Anda</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-border/50">
          <h3 className="text-sm font-bold mb-4">Statistik Data</h3>
          <div className="space-y-3">
             {Object.entries(stats).map(([key, val]) => (
                <div key={key} className="flex justify-between items-center text-xs">
                   <span className="text-muted-foreground capitalize">{key}</span>
                   <span className="font-bold">{val}</span>
                </div>
             ))}
          </div>
        </div>

        <div className="glass-card p-6 border-border/50 space-y-4">
          <h3 className="text-sm font-bold mb-2">Ekspor Data</h3>
          <button 
            onClick={() => handleExport('xlsx')}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 border border-border rounded-xl hover:border-primary/50 transition-all text-sm font-bold"
          >
            <div className="flex items-center gap-3">
              <TableIcon size={18} className="text-green-500" />
              <span>Ekspor ke Excel (.xlsx)</span>
            </div>
            <Download size={16} />
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            className="w-full flex items-center justify-between p-4 bg-secondary/50 border border-border rounded-xl hover:border-primary/50 transition-all text-sm font-bold"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-red-500" />
              <span>Ekspor ke PDF (.pdf)</span>
            </div>
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pt-10 border-t border-border">
        <div className="bg-destructive/5 border border-dashed border-destructive/20 rounded-3xl p-6 md:p-8">
           <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold tracking-tight">Danger Zone</h3>
           </div>
           <p className="text-xs text-muted-foreground mb-8 leading-relaxed max-w-2xl">
             Menghapus data akan menghilangkan seluruh catatan transaksi, anggaran, akun, dan preferensi Anda secara permanen. Tindakan ini tidak dapat dibatalkan. Pastikan Anda telah mengekspor data yang penting sebelumnya.
           </p>

           {!isDeleting ? (
             <button 
                onClick={() => setIsDeleting(true)}
                className="px-6 py-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-destructive hover:text-white transition-all shadow-sm"
             >
                Hapus Seluruh Data & Akun
             </button>
           ) : (
             <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                <p className="text-[10px] font-bold uppercase tracking-widest text-destructive">Ketik "HAPUS" untuk mengonfirmasi:</p>
                <div className="flex flex-col sm:flex-row gap-3">
                   <input 
                     autoFocus
                     value={deleteConfirm}
                     onChange={e => setDeleteConfirm(e.target.value)}
                     className="bg-background border border-destructive/30 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-destructive/20 outline-none"
                     placeholder="HAPUS"
                   />
                   <div className="flex gap-2">
                     <button 
                       onClick={handleDeleteAllData}
                       disabled={deleteConfirm !== 'HAPUS' || loading}
                       className="px-8 py-3 bg-destructive text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center gap-2"
                     >
                       {loading ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                       Konfirmasi Hapus
                     </button>
                     <button 
                        onClick={() => { setIsDeleting(false); setDeleteConfirm(''); }}
                        className="px-6 py-3 bg-secondary text-foreground rounded-xl text-xs font-bold"
                     >
                        Batal
                     </button>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
}
