import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldCheck, Lock, ArrowLeft, Delete, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../lib/AuthContext';

export default function SettingsSecurity() {
  const [pinActive, setPinActive] = useState(localStorage.getItem('pin_active') === 'true');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'disable' | 'change'>('setup');
  const [pinStep, setPinStep] = useState<1 | 2>(1);
  const [tempPin, setTempPin] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hashPin = async (val: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(val);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleDigit = async (digit: string) => {
    const newPin = inputPin + digit;
    if (newPin.length > 6) return;
    setInputPin(newPin);
    setError(null);

    if (newPin.length === 6) {
      if (pinMode === 'setup') {
        if (pinStep === 1) {
          setTempPin(newPin);
          setInputPin('');
          setPinStep(2);
        } else {
          if (newPin === tempPin) {
             const hash = await hashPin(newPin);
             localStorage.setItem('pin_hash', hash);
             localStorage.setItem('pin_active', 'true');
             setPinActive(true);
             setIsModalOpen(false);
             resetModal();
          } else {
             setError('PIN tidak cocok');
             setInputPin('');
          }
        }
      } else if (pinMode === 'disable') {
         const hash = await hashPin(newPin);
         if (hash === localStorage.getItem('pin_hash')) {
            localStorage.removeItem('pin_active');
            localStorage.removeItem('pin_hash');
            setPinActive(false);
            setIsModalOpen(false);
            resetModal();
         } else {
            setError('PIN salah');
            setInputPin('');
         }
      }
    }
  };

  const resetModal = () => {
     setPinStep(1);
     setTempPin('');
     setInputPin('');
     setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-2xl font-bold text-foreground">Keamanan</h2>
        <p className="text-sm text-muted-foreground mt-1 font-medium">Lindungi data keuangan Anda dengan lapisan keamanan tambahan</p>
      </header>

      <div className="glass-card p-6 md:p-8 border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
               "p-3 rounded-2xl border transition-all",
               pinActive ? "bg-primary/10 border-primary text-primary" : "bg-secondary border-border text-muted-foreground"
            )}>
               <ShieldCheck size={24} />
            </div>
            <div>
               <h3 className="font-bold">Kunci PIN Aplikasi</h3>
               <p className="text-xs text-muted-foreground">Minta PIN setiap kali membuka atau kembali ke aplikasi</p>
            </div>
          </div>
          <button 
             onClick={() => {
                setPinMode(pinActive ? 'disable' : 'setup');
                setIsModalOpen(true);
             }}
             className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all",
                pinActive ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white" : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105"
             )}
          >
             {pinActive ? 'Matikan' : 'Aktifkan'}
          </button>
        </div>

        {pinActive && (
          <div className="mt-6 pt-6 border-t border-border/50 flex items-center justify-between">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground">
                <Shield size={12} />
                <span>PIN Aktif & Terenkripsi SHA-256</span>
             </div>
             <button 
               onClick={() => {
                  setPinMode('setup');
                  setIsModalOpen(true);
               }}
               className="text-[10px] font-black uppercase text-primary hover:underline"
             >
                Ganti PIN
             </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-border/50">
          <div className="flex items-center gap-3 text-primary mb-4">
            <ShieldAlert size={20} />
            <h3 className="text-sm font-bold">Tips Keamanan</h3>
          </div>
          <ul className="space-y-3">
            {[
              'Gunakan PIN yang unik dan tidak mudah ditebak.',
              'Jangan bagikan kredensial login Anda kepada siapapun.',
              'Pastikan Anda selalu logout jika menggunakan perangkat publik.',
              'Aktifkan Kunci PIN jika Anda sering meminjamkan perangkat.'
            ].map((tip, i) => (
              <li key={i} className="flex gap-3 items-start text-xs text-muted-foreground leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card p-6 border-border/50 bg-secondary/30">
            <h3 className="text-sm font-bold mb-4">Sesi Saat Ini</h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">ID Perangkat</span>
                  <span className="font-mono text-[10px] opacity-60">
                    {Math.random().toString(36).substring(7).toUpperCase()}
                  </span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Login Terakhir</span>
                  <span className="font-medium">Hari ini, {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
               <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Status Autentikasi</span>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase text-[8px] tracking-widest">
                    Terverifikasi
                  </span>
               </div>
            </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative z-10 w-full max-w-sm glass-card p-8 border-border/50 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                   <ShieldCheck size={32} />
                </div>
                <h2 className="text-xl font-bold mb-2 uppercase tracking-tight">
                   {pinMode === 'setup' ? (pinStep === 1 ? 'Atur PIN Baru' : 'Konfirmasi PIN') : 'Matikan PIN'}
                </h2>
                <div className="flex gap-4 mb-10">
                   {[...Array(6)].map((_, i) => (
                      <div key={i} className={cn("w-3 h-3 rounded-full border-2", inputPin.length > i ? "bg-primary border-primary" : "border-border")} />
                   ))}
                </div>
                <div className="grid grid-cols-3 gap-6 w-full max-w-xs">
                   {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((digit, i) => (
                      digit === '' ? <div key={i}/> :
                      <button key={i} onClick={() => digit === 'del' ? setInputPin(prev => prev.slice(0, -1)) : handleDigit(digit)} className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center font-bold text-lg hover:bg-primary/20 transition-all">
                         {digit === 'del' ? <Delete size={20}/> : digit}
                      </button>
                   ))}
                </div>
                {error && <p className="mt-6 text-xs text-destructive font-bold">{error}</p>}
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
