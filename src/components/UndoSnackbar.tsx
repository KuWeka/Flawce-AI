import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw } from 'lucide-react';
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
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw size={14} />
            Undo
          </button>
        </div>
        
        {/* Progress Bar Container */}
        <div className="absolute bottom-0 left-0 h-1 bg-primary/20 w-full" />
        
        {/* Animated Progress Bar */}
        <motion.div 
          className="absolute bottom-0 left-0 h-1 bg-primary origin-left"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: duration / 1000, ease: "linear" }}
          onAnimationComplete={() => {
            onConfirm();
          }}
        />
      </div>
    </motion.div>
  );
}
