import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface UndoSnackbarProps {
  message: string;
  onUndo: () => void;
  onConfirm: () => void;
  duration?: number;
}

export default function UndoSnackbar({ 
  message, 
  onUndo, 
  onConfirm, 
  duration = 5000 
}: UndoSnackbarProps) {
  const [timeLeft, setTimeLeft] = useState(100);

  useEffect(() => {
    const interval = 50; // Update every 50ms for smoothness
    const step = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onConfirm();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration, onConfirm]);

  return (
    <motion.div
      initial={{ y: 100, x: '-50%', opacity: 0 }}
      animate={{ y: 0, x: '-50%', opacity: 1 }}
      exit={{ y: 100, x: '-50%', opacity: 0 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
    >
      <div className="glass-card bg-foreground text-background dark:bg-background dark:text-foreground p-4 shadow-2xl relative overflow-hidden border-none rounded-2xl">
        <div className="flex items-center justify-between gap-4 relative z-10">
          <p className="text-sm font-bold">{message}</p>
          <button 
            onClick={onUndo}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw size={14} />
            Undo
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-primary/30 w-full" />
        <motion.div 
          className="absolute bottom-0 left-0 h-1 bg-primary"
          style={{ width: `${timeLeft}%` }}
        />
      </div>
    </motion.div>
  );
}
