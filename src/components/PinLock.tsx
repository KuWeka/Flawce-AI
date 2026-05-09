import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, Lock, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import Logo from './Logo';

interface PinLockProps {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [isError, setIsError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const hashPin = async (val: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(val);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleInput = (digit: string) => {
    if (showResetConfirm) return;
    if (pin.length < 6) {
      setIsError(false);
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (showResetConfirm) return;
    setPin(prev => prev.slice(0, -1));
    setIsError(false);
  };

  useEffect(() => {
    if (pin.length === 6) {
      verifyPin();
    }
  }, [pin]);

  const verifyPin = async () => {
    setIsVerifying(true);
    const storedHash = localStorage.getItem('pin_hash');
    const inputHash = await hashPin(pin);

    if (storedHash === inputHash) {
      setTimeout(() => {
        onUnlock();
      }, 300);
    } else {
      setIsError(true);
      setTimeout(() => {
        setPin('');
        setIsVerifying(false);
      }, 500);
    }
  };

  const handleResetPin = async () => {
    try {
      localStorage.removeItem('pin_hash');
      localStorage.removeItem('pin_active');
      localStorage.removeItem('last_active_time');
      await signOut(auth);
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.reload();
    }
  };

  const numpad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-[#020617] flex flex-col items-center justify-center p-4 md:p-6 text-center overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {!showResetConfirm ? (
          <motion.div 
            key="numpad"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-xs flex flex-col items-center space-y-4 md:space-y-10 lg:space-y-12"
          >
            <div className="text-center space-y-4 md:space-y-6">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center mb-2"
              >
                <Logo size={80} variant="dark" />
              </motion.div>
              <div className="flex flex-col items-center gap-1">
                 <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground uppercase tracking-[0.1em]">Flowce</h1>
                 <p className="text-[10px] md:text-sm text-muted-foreground font-black uppercase tracking-[0.3em] opacity-50">Track less. Flow more.</p>
              </div>
            </div>

            <div className="space-y-3 md:space-y-8 w-full flex flex-col items-center">
              <p className="text-[10px] md:text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">Masukkan PIN Anda</p>
              
              <motion.div 
                animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
                className="flex gap-2.5 md:gap-4"
              >
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "w-2.5 h-2.5 md:w-4 md:h-4 rounded-full border-2 transition-all duration-300",
                      pin.length > i 
                        ? (isError ? "bg-destructive border-destructive shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "bg-primary border-primary shadow-[0_0_15px_rgba(45,212,191,0.5)]")
                        : "border-border/50 bg-secondary/30"
                    )}
                  />
                ))}
              </motion.div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-6 w-full max-w-[260px] md:max-w-none">
              {numpad.map((key, i) => {
                if (key === '') return <div key={i} />;
                
                if (key === 'delete') {
                  return (
                    <button
                      key={i}
                      onClick={handleBackspace}
                      className="flex items-center justify-center p-4 md:p-6 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                    >
                      <Delete size={20} className="md:w-6 md:h-6" />
                    </button>
                  );
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleInput(key)}
                    disabled={pin.length >= 6 || isVerifying}
                    className="w-12 h-12 md:w-16 md:h-16 rounded-full glass-card border border-border/50 flex items-center justify-center text-base md:text-xl font-black text-foreground hover:bg-primary/10 hover:border-primary/30 active:scale-90 transition-all mx-auto"
                  >
                    {key}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-2 md:gap-4 mt-2 md:mt-8">
              <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                <ShieldCheck size={10} className="md:w-3 md:h-3" />
                <span>AES-256 Protected</span>
              </div>
              
              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                  <span>Lupa PIN?</span>
                </button>

                <button 
                  onClick={async () => {
                    try {
                      await signOut(auth);
                      window.location.reload();
                    } catch (error) {
                      console.error('Sign out error:', error);
                      window.location.reload();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
                >
                  <LogOut size={12} />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reset-confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-sm glass-card border-border/50 p-8 rounded-3xl space-y-6"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto">
              <ShieldCheck size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-black text-foreground tracking-tight uppercase">Setel Ulang PIN?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Anda akan dialihkan ke halaman login dan kunci PIN akan disetel ulang demi keamanan. Anda perlu masuk kembali dan mengatur PIN baru.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={handleResetPin}
                className="w-full py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Iya, Setel Ulang & Keluar
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-4 text-muted-foreground font-black uppercase tracking-widest text-[10px] hover:text-foreground transition-colors"
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
