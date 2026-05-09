import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Plus, Trash2, Edit2, X, Check, Search, ChevronRight } from 'lucide-react';
import { useCategoryRules } from '@/src/lib/useCategoryRules';
import { useCategories } from '@/src/lib/useCategories';
import { cn } from '@/src/lib/utils';
import { CategoryRule } from '@/src/lib/types';

export default function SettingsAutoCategory() {
  const { rules, loading, addRule, deleteRule, updateRule } = useCategoryRules();
  const { categories } = useCategories();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'both'>('expense');
  const [priority, setPriority] = useState(0);

  const resetForm = () => {
    setKeywords('');
    setCategory('');
    setType('expense');
    setPriority(0);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (rule: CategoryRule) => {
    setEditingId(rule.id);
    setKeywords(rule.keywords.join(', '));
    setCategory(rule.category);
    setType(rule.type);
    setPriority(rule.priority);
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords || !category) return;

    const keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k);
    const ruleData = {
      keywords: keywordsArray,
      category,
      type,
      priority: Number(priority)
    };

    if (editingId) {
      await updateRule(editingId, ruleData);
    } else {
      await addRule(ruleData);
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Aturan Kategori Otomatis</h2>
          <p className="text-xs text-muted-foreground">Kategorikan transaksi secara otomatis berdasarkan kata kunci deskripsi.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={cn(
            "p-3 rounded-xl transition-all shadow-lg active:scale-95",
            isAdding ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground shadow-primary/20"
          )}
        >
          {isAdding ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4 border-primary/20 mb-6 bg-primary/5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kata Kunci (Pisahkan dengan koma)</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input 
                    required
                    value={keywords}
                    onChange={e => setKeywords(e.target.value)}
                    placeholder="Contoh: gojek, grab, maxim"
                    className="w-full bg-background border border-border rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kategori Tujuan</label>
                  <select 
                    required
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    {categories
                      .filter(c => type === 'both' || c.type === 'both' || c.type === type)
                      .map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))
                    }
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipe Transaksi</label>
                  <div className="flex bg-background border border-border rounded-xl p-1">
                    {(['expense', 'income', 'both'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                          type === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {t === 'expense' ? 'Pengeluaran' : t === 'income' ? 'Pemasukan' : 'Keduanya'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prioritas:</label>
                  <input 
                    type="number" 
                    value={priority}
                    onChange={e => setPriority(Number(e.target.value))}
                    className="w-16 bg-background border border-border rounded-lg py-1 px-2 text-xs text-center outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={resetForm} className="px-6 py-2.5 rounded-xl text-xs font-bold text-muted-foreground">Batal</button>
                  <button type="submit" className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
                    <Check size={16} /> {editingId ? 'Update Rule' : 'Simpan Rule'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center opacity-50">
            <Zap className="animate-pulse mx-auto mb-2 text-primary" />
            <p className="text-xs font-bold">Memuat Aturan...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="py-20 glass-card border-dashed flex flex-col items-center justify-center opacity-40">
            <Zap size={48} className="mb-4" />
            <p className="text-sm font-bold">Belum ada aturan otomatis</p>
            <p className="text-[10px]">Klik tombol + untuk mulai otomasi kategorimu.</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="glass-card p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Zap size={18} />
                </div>
                <div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {rule.keywords.map((kw, idx) => (
                      <span key={idx} className="bg-secondary px-2 py-0.5 rounded text-[9px] font-bold text-foreground">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight size={12} className="text-muted-foreground" />
                    <span className="text-xs font-black uppercase text-primary tracking-widest">{rule.category}</span>
                    <span className="text-[8px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-bold uppercase tracking-tighter">
                      Priority {rule.priority}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(rule)}
                  className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => deleteRule(rule.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
