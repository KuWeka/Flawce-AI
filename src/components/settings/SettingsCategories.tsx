import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Plus, Save, X, Edit2, Trash2, ChevronDown, ChevronUp, RotateCcw, Loader2 } from 'lucide-react';
import { useCategories } from '../../lib/useCategories';
import { Category } from '../../lib/types';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { seedDefaultCategories } from '../../lib/categoryUtils';
import { useAuth } from '../../lib/AuthContext';

interface SettingsCategoriesProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function SettingsCategories({ onSuccess, onError }: SettingsCategoriesProps) {
  const { user } = useAuth();
  const { categories, loading, addCategory, updateCategory, deleteCategory, reorderCategories } = useCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense' | 'both'>('expense');
  const [catIcon, setCatIcon] = useState('💰');
  const [expandedCats, setExpandedCats] = useState<string[]>([]);
  const [newSubCat, setNewSubCat] = useState({ name: '', icon: '📌' });
  const [addingSubCatTo, setAddingSubCatTo] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  const icons = ['💰', '🍔', '🚗', '🛍️', '🏠', '🎟️', '🏥', '🎓', '🎁', '🔌', '☕', '🥦', '⚡', '💻', '🎬', '🎮', '🏋️', '🧼', '👔', '🚇', '✈️', '🛌', '💡', '📶'];

  const resetForm = () => {
    setCatName('');
    setCatType('expense');
    setCatIcon('💰');
    setEditingCategory(null);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const catData = { name: catName, type: catType, icon: catIcon };
      if (editingCategory) {
        await updateCategory(editingCategory.id, catData);
      } else {
        await addCategory(catData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      onError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const handleMove = async (type: 'income' | 'expense' | 'both', index: number, direction: 'up' | 'down') => {
    const list = categories.filter(c => c.type === type || c.type === 'both');
    const otherList = categories.filter(c => c.type !== type && c.type !== 'both');
    
    if (direction === 'up' && index > 0) {
      const newList = [...list];
      [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
      await reorderCategories([...newList, ...otherList]);
    } else if (direction === 'down' && index < list.length - 1) {
      const newList = [...list];
      [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
      await reorderCategories([...newList, ...otherList]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Kategori</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Kelola kategori transaksi pengeluaran & pemasukan</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus size={20} />
        </button>
      </header>

      {/* Categories List by Type */}
      {(['expense', 'income'] as const).map(type => {
        const typeCats = categories.filter(c => c.type === type || c.type === 'both');
        return (
          <div key={type} className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
              Kategori {type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeCats.map((cat, idx) => (
                <CategoryCardRefactored 
                  key={cat.id} 
                  cat={cat} 
                  idx={idx} 
                  isFirst={idx === 0} 
                  isLast={idx === typeCats.length - 1}
                  onEdit={() => { setEditingCategory(cat); setCatName(cat.name); setCatType(cat.type); setCatIcon(cat.icon || '💰'); setIsModalOpen(true); }}
                  onDelete={() => { if(confirm('Hapus kategori ini?')) deleteCategory(cat.id); }}
                  onMove={(dir) => handleMove(type, idx, dir)}
                  isExpanded={expandedCats.includes(cat.id)}
                  onToggle={() => toggleExpand(cat.id)}
                  onUpdateSubCats={(subs) => updateCategory(cat.id, { subcategories: subs })}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.form 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onSubmit={handleCatSubmit}
            className="relative w-full max-w-md bg-card border border-border p-8 rounded-[32px] shadow-2xl space-y-6"
          >
            <h3 className="text-xl font-bold">{editingCategory ? 'Edit Kategori' : 'Kategori Baru'}</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted ml-1">Nama Kategori</label>
                <input 
                  value={catName} 
                  onChange={e => setCatName(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Nama kategori..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted ml-1">Tipe</label>
                <div className="flex gap-2">
                   {(['expense', 'income', 'both'] as const).map(t => (
                     <button
                       key={t}
                       type="button"
                       onClick={() => setCatType(t)}
                       className={cn(
                         "flex-1 py-3 rounded-xl text-xs font-bold border transition-all",
                         catType === t ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border"
                       )}
                     >
                       {t === 'expense' ? 'Pengeluaran' : t === 'income' ? 'Pemasukan' : 'Keduanya'}
                     </button>
                   ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-muted ml-1">Icon</label>
                <div className="flex flex-wrap gap-2">
                   {icons.map(i => (
                     <button 
                       key={i}
                       type="button"
                       onClick={() => setCatIcon(i)}
                       className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                         catIcon === i ? "bg-primary text-white scale-110 shadow-lg" : "bg-secondary hover:bg-muted"
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
                disabled={isSubmitting}
                className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2"
               >
                 {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                 {editingCategory ? 'Simpan Perubahan' : 'Buat Kategori'}
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
    </motion.div>
  );
}

// Internal reusable card
function CategoryCardRefactored({ cat, idx, isFirst, isLast, onEdit, onDelete, onMove, isExpanded, onToggle, onUpdateSubCats }: any) {
  return (
     <div className="glass-card p-4 border-border/50">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="text-2xl">{cat.icon}</span>
              <div>
                 <p className="text-sm font-bold">{cat.name}</p>
                 <p className="text-[10px] text-muted-foreground">{cat.subcategories?.length || 0} Sub</p>
              </div>
           </div>
           <div className="flex items-center gap-1">
              <button onClick={() => onMove('up')} disabled={isFirst} className="p-1 text-muted-foreground hover:text-primary disabled:opacity-0"><ChevronUp size={14}/></button>
              <button onClick={() => onMove('down')} disabled={isLast} className="p-1 text-muted-foreground hover:text-primary disabled:opacity-0"><ChevronDown size={14}/></button>
              <button onClick={onEdit} className="p-1 text-muted-foreground hover:text-primary"><Edit2 size={14}/></button>
              <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={14}/></button>
           </div>
        </div>
     </div>
  );
}
