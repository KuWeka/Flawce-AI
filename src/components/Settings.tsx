import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Tag, 
  Shield, 
  Palette, 
  Database, 
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Zap,
  Wallet,
  Settings as SettingsIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import SettingsProfile from './settings/SettingsProfile';
import SettingsCategories from './settings/SettingsCategories';
import SettingsAccounts from './settings/SettingsAccounts';
import SettingsSecurity from './settings/SettingsSecurity';
import SettingsAppearance from './settings/SettingsAppearance';
import SettingsData from './settings/SettingsData';
import SettingsAutoCategory from './settings/SettingsAutoCategory';

type SettingsTab = 'akun' | 'dompet' | 'kategori' | 'aturan' | 'keamanan' | 'tampilan' | 'data';

interface TabItem {
  id: SettingsTab;
  label: string;
  description: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { id: 'akun', label: 'Profil', description: 'Atur profil dan preferensi dasar', icon: User },
  { id: 'dompet', label: 'Kelola Akun', description: 'Atur dompet dan rekening', icon: Wallet },
  { id: 'kategori', label: 'Kategori', description: 'Kelola kategori transaksi', icon: Tag },
  { id: 'aturan', label: 'Aturan Otomatis', description: 'Otomasi kategori transaksi', icon: Zap },
  { id: 'keamanan', label: 'Keamanan', description: 'Proteksi PIN dan akses akun', icon: Shield },
  { id: 'tampilan', label: 'Tampilan', description: 'Kustomisasi tema dan gaya', icon: Palette },
  { id: 'data', label: 'Data Management', description: 'Ekspor, impor, dan hapus data', icon: Database },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('akun');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'akun': return <SettingsProfile onSuccess={handleSuccess} onError={handleError} />;
      case 'dompet': return <SettingsAccounts onSuccess={handleSuccess} onError={handleError} />;
      case 'kategori': return <SettingsCategories onSuccess={handleSuccess} onError={handleError} />;
      case 'aturan': return <SettingsAutoCategory />;
      case 'keamanan': return <SettingsSecurity />;
      case 'tampilan': return <SettingsAppearance />;
      case 'data': return <SettingsData onSuccess={handleSuccess} onError={handleError} />;
      default: return <SettingsProfile onSuccess={handleSuccess} onError={handleError} />;
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 min-h-screen">
      <header className="flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-2xl text-primary shadow-inner">
          <SettingsIcon size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground text-sm font-medium">Kelola pengalaman Flowce pribadimu.</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Tabs */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-24">
          <div className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3.5 p-4 rounded-2xl transition-all duration-300 group relative",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-all",
                    isActive ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-card border border-border group-hover:border-primary/30"
                  )}>
                    <Icon size={18} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold leading-none mb-1">{tab.label}</p>
                    <p className="text-[10px] text-muted-foreground font-medium line-clamp-1">{tab.description}</p>
                  </div>
                  <ChevronRight size={14} className={cn("transition-all opacity-40", isActive ? "translate-x-1 opacity-100" : "group-hover:translate-x-0.5")} />
                  
                  {isActive && (
                    <motion.div 
                      layoutId="settings-active"
                      className="absolute -left-1 w-1 h-6 bg-primary rounded-full hidden lg:block"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Tab Content */}
        <div className="flex-1 w-full">
          <div className="glass-card p-6 md:p-8 min-h-[500px] border-primary/5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                 {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-24 right-4 md:right-8 z-50 space-y-4 pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
           {successMsg && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-4 border-primary/30 bg-primary/10 text-primary shadow-2xl flex items-center gap-3 pointer-events-auto">
               <Sparkles size={18} />
               <p className="text-xs font-bold">{successMsg}</p>
             </motion.div>
           )}
           {errorMsg && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-4 border-destructive/30 bg-destructive/10 text-destructive shadow-2xl flex items-center gap-3 pointer-events-auto">
               <AlertTriangle size={18} />
               <p className="text-xs font-bold">{errorMsg}</p>
             </motion.div>
           )}
        </AnimatePresence>
      </div>
    </div>
  );
}
