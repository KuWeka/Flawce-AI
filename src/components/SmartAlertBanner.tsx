import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, X, TrendingUp, Target, CreditCard, ChevronRight } from 'lucide-react';
import { Alert } from '../lib/useSmartAlerts';
import { cn } from '../lib/utils';

interface SmartAlertBannerProps {
  alerts: Alert[];
  onDismiss: (dismissKey: string) => void;
}

export default function SmartAlertBanner({ alerts, onDismiss }: SmartAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-8">
      <AnimatePresence mode="popLayout">
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 shadow-sm group transition-all",
              alert.level === 'red' && "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400",
              alert.level === 'yellow' && "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
              alert.level === 'blue' && "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
            )}
          >
            {/* Background Pattern */}
            <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
              {alert.type === 'budget' && <CreditCard size={120} />}
              {alert.type === 'spending' && <TrendingUp size={120} />}
              {alert.type === 'goal' && <Target size={120} />}
            </div>

            <div className="flex gap-4 items-start relative z-10">
              <div className={cn(
                "p-2.5 rounded-xl shrink-0 shadow-inner",
                alert.level === 'red' && "bg-red-500 text-white",
                alert.level === 'yellow' && "bg-amber-500 text-white",
                alert.level === 'blue' && "bg-blue-500 text-white"
              )}>
                {alert.level === 'blue' ? <Info size={18} /> : <AlertTriangle size={18} />}
              </div>

              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                    {alert.type === 'budget' ? 'Budget Alert' : 
                     alert.type === 'spending' ? 'Anomali Pengeluaran' : 
                     alert.type === 'goal' ? 'Progress Goal' : 'Analisis Pemasukan'}
                  </span>
                </div>
                <p className="text-sm font-bold leading-relaxed pr-8">{alert.message}</p>
              </div>

              <button
                onClick={() => onDismiss(alert.dismissKey)}
                className="absolute right-3 top-3 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="mt-3 flex items-center justify-end">
               <button className="text-[10px] font-bold flex items-center gap-1 hover:underline underline-offset-2 opacity-80">
                 Detail Selengkapnya <ChevronRight size={10} />
               </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
