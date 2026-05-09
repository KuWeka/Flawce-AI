import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction } from '@/src/lib/types';
import { useAuth } from '@/src/lib/AuthContext';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  parseISO
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
}

interface CalendarViewProps {
  transactions: Transaction[];
}

export default function CalendarView({ transactions }: CalendarViewProps) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const daysInGrid: CalendarDay[] = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  }).map(date => {
    const dayTxs = transactions.filter(tx => isSameDay(parseISO(tx.date), date));
    return {
      date,
      isCurrentMonth: isSameMonth(date, currentMonth),
      transactions: dayTxs,
      totalIncome: dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      totalExpense: dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    };
  });

  const monthIncome = transactions
    .filter(tx => isSameMonth(parseISO(tx.date), currentMonth) && tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const monthExpense = transactions
    .filter(tx => isSameMonth(parseISO(tx.date), currentMonth) && tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const selectedDayData = selectedDate 
    ? daysInGrid.find(d => isSameDay(d.date, selectedDate))
    : null;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 relative">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl text-primary shadow-inner">
            <CalendarIcon size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Kalender Kas</h1>
            <p className="text-muted-foreground text-sm font-medium">Visualisasi arus kas harianmu.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-secondary p-1 rounded-2xl border border-border/50 shadow-sm">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-3 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground active:scale-95"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-6 py-2 min-w-[150px] text-center">
              <span className="text-sm font-bold text-foreground capitalize tracking-wide">
                {format(currentMonth, 'MMMM yyyy', { locale: localeId })}
              </span>
            </div>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-3 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground active:scale-95"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex gap-4 p-4 glass-card bg-secondary/30 py-2">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Pemasukan</span>
              <span className="text-sm font-bold text-primary font-mono">{formatCurrency(monthIncome)}</span>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Pengeluaran</span>
              <span className="text-sm font-bold text-destructive font-mono">{formatCurrency(monthExpense)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar Grid */}
      <div className="glass-card p-4 sm:p-8">
        <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4 text-center">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
            <div key={day} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-4">
          {daysInGrid.map((day, idx) => {
            const isSel = selectedDate && isSameDay(day.date, selectedDate);
            const active = isToday(day.date);

            return (
              <motion.button
                key={day.date.toISOString()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.01 }}
                onClick={() => setSelectedDate(day.date)}
                className={cn(
                  "aspect-square rounded-2xl sm:rounded-3xl border flex flex-col items-center justify-center relative transition-all duration-300 group overflow-hidden",
                  !day.isCurrentMonth && "opacity-20",
                  active && "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5",
                  isSel ? "border-primary bg-primary/10 ring-4 ring-primary/5" : "border-border/50 hover:border-primary/30 bg-card/50",
                )}
              >
                <span className={cn(
                  "text-xs sm:text-sm font-bold transition-colors mb-1",
                  isSel ? "text-primary" : "text-foreground/80",
                  active && !isSel && "text-primary"
                )}>
                  {format(day.date, 'd')}
                </span>

                <div className="flex gap-1">
                  {day.totalIncome > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                  {day.totalExpense > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  )}
                </div>

                {/* Hover Details Preview */}
                {(day.totalIncome > 0 || day.totalExpense > 0) && (
                   <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                   </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Detail Overlay / Slide Panel */}
      <AnimatePresence>
        {selectedDate && selectedDayData && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 shadow-2xl overflow-y-auto"
            >
              <div className="p-8 space-y-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {format(selectedDate, 'EEEE, d MMMM', { locale: localeId })}
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Detail Transaksi Harian</p>
                  </div>
                  <button 
                    onClick={() => setSelectedDate(null)}
                    className="p-3 bg-secondary text-muted-foreground hover:text-foreground rounded-2xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Day Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-primary/5 border border-primary/20 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                      <ArrowUpRight size={14} /> Pemasukan
                    </div>
                    <div className="text-xl font-black font-mono text-primary">
                      {formatCurrency(selectedDayData.totalIncome)}
                    </div>
                  </div>
                  <div className="p-5 rounded-3xl bg-destructive/5 border border-destructive/20 space-y-2">
                    <div className="flex items-center gap-2 text-destructive font-black text-[10px] uppercase tracking-widest">
                      <ArrowDownRight size={14} /> Pengeluaran
                    </div>
                    <div className="text-xl font-black font-mono text-destructive">
                      {formatCurrency(selectedDayData.totalExpense)}
                    </div>
                  </div>
                </div>

                {/* Transaction List */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Daftar Transaksi</h3>
                     <span className="text-[10px] font-bold text-foreground/50">{selectedDayData.transactions.length} Item</span>
                  </div>

                  <div className="space-y-4">
                    {selectedDayData.transactions.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-border rounded-3xl opacity-50">
                        <Clock className="mx-auto mb-2 text-muted-foreground" size={24} />
                        <p className="text-xs font-bold text-muted-foreground">Tidak ada transaksi hari ini</p>
                      </div>
                    ) : (
                      selectedDayData.transactions.map((tx, i) => (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/30 border border-border/50 group hover:shadow-lg transition-all"
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform",
                            tx.type === 'income' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          )}>
                             {tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{tx.description}</p>
                            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{tx.category}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-sm font-black font-mono",
                              tx.type === 'income' ? "text-primary" : "text-destructive"
                            )}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => {
                      const event = new CustomEvent('openTransactionForm', { 
                        detail: { date: selectedDate?.toISOString() } 
                      });
                      window.dispatchEvent(event);
                    }}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
                  >
                    <Plus size={18} />
                    Catat Baru
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
