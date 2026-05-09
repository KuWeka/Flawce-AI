import React from 'react';
import { motion } from 'motion/react';
import { Palette, Sun, Moon, Check } from 'lucide-react';
import { useTheme } from '../../lib/ThemeContext';
import { cn } from '../../lib/utils';

export default function SettingsAppearance() {
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();

  const accents = [
    { name: 'Emerald', value: '#00D09C' },
    { name: 'Blue', value: '#4A90E2' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F5A623' },
    { name: 'Pink', value: '#FF6B6B' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-2xl font-bold text-foreground">Tampilan</h2>
        <p className="text-sm text-muted-foreground mt-1 font-medium">Kustomisasi bagaimana Flowce terlihat untukmu</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6 md:p-8 border-border/50 space-y-6">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Palette size={18} className="text-primary" />
            Mode Tema
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => theme !== 'light' && toggleTheme()}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3",
                theme === 'light' ? "bg-primary/5 border-primary" : "bg-secondary/30 border-border"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-orange-500">
                 <Sun size={20} />
              </div>
              <span className="text-xs font-black uppercase">Terang</span>
              {theme === 'light' && <Check size={14} className="text-primary" />}
            </button>
            <button 
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3",
                theme === 'dark' ? "bg-primary/5 border-primary" : "bg-secondary/30 border-border"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-[#020617] border border-border/50 shadow-sm flex items-center justify-center text-blue-400">
                 <Moon size={20} />
              </div>
              <span className="text-xs font-black uppercase">Gelap</span>
              {theme === 'dark' && <Check size={14} className="text-primary" />}
            </button>
          </div>
        </div>

        <div className="glass-card p-6 md:p-8 border-border/50 space-y-6">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Check size={18} className="text-primary" />
            Warna Aksen
          </h3>
          <div className="grid grid-cols-5 gap-3">
             {accents.map(color => (
                <button
                   key={color.name}
                   onClick={() => setAccentColor(color.value)}
                   className={cn(
                      "group relative aspect-square rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden",
                      accentColor === color.value ? "border-primary" : "border-border hover:border-border/80"
                   )}
                >
                   <div className="absolute inset-0 transition-transform group-hover:scale-110" style={{ backgroundColor: color.value }} />
                   {accentColor === color.value && (
                      <div className="relative z-10 w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                         <Check size={14} className="text-white" />
                      </div>
                   )}
                </button>
             ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
