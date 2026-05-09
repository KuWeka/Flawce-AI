import { Home, MessageSquare, PieChart, CreditCard, Wallet, Target, Settings, Plus, X, LogOut, Sun, Moon, Flag, LayoutGrid, Calendar } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/src/lib/AuthContext';
import { useTheme } from '@/src/lib/ThemeContext';
import Logo from './Logo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'transactions', label: 'Riwayat', icon: CreditCard },
  { id: 'chatbot', label: 'Asisten AI', icon: MessageSquare },
  { id: 'accounts', label: 'Kas & Bank', icon: Wallet },
  { id: 'goals', label: 'Impian', icon: Target },
  { id: 'budgets', label: 'Anggaran', icon: LayoutGrid },
  { id: 'reports', label: 'Laporan', icon: PieChart },
  { id: 'settings', label: 'Setelan', icon: Settings },
];

const BOTTOM_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'transactions', label: 'Riwayat', icon: CreditCard },
  { id: 'chatbot', label: 'Asisten AI', icon: MessageSquare },
  { id: 'reports', label: 'Laporan', icon: PieChart },
  { id: 'settings', label: 'Setelan', icon: Settings },
];

export default function Sidebar({ activeTab, setActiveTab, userName, isOpen, setIsOpen }: SidebarProps) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 w-[280px] md:w-[240px] lg:w-[280px] bg-background border-r border-foreground/5 z-50 transition-transform duration-300 transform md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Logo size={40} showText variant={theme === 'dark' ? 'dark' : 'light'} />
          </div>

          {/* User Profile & Balance */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shadow-inner">
                <img 
                  src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} 
                  alt="avatar" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <h3 className="font-heading font-bold text-foreground leading-tight truncate">{userName}</h3>
                <p className="text-[10px] text-[#ffffff] truncate">{user?.email}</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-muted">
                <X size={20} />
              </button>
            </div>
            
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-foreground/5 text-foreground hover:bg-foreground/10 transition-all text-sm font-medium"
            >
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
              <span>Mode {theme === 'dark' ? 'Terang' : 'Gelap'}</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group text-sm font-semibold relative",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon size={18} className={cn("transition-transform", isActive ? "text-primary dark:text-primary" : "text-muted-foreground group-hover:scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute left-1 w-1 h-6 bg-primary rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="pt-6 border-t border-border flex flex-col items-center">
            <div className="mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
               <Logo size={24} variant={theme === 'dark' ? 'dark' : 'light'} />
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-destructive transition-colors py-2 text-[10px] font-bold uppercase tracking-[0.2em]"
            >
              <LogOut size={14} />
              Keluar Sesi
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-xl border-t border-border flex items-center justify-around px-2 z-40 md:hidden pb-safe">
        {BOTTOM_NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 px-3 py-2 transition-all relative overflow-hidden",
                isActive ? "text-primary" : "text-muted-foreground/60"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="bottomNavGlow"
                  className="absolute -top-4 w-12 h-8 bg-primary/20 blur-xl rounded-full"
                />
              )}
              <div className={cn(
                "p-1.5 rounded-xl transition-all",
                isActive && "bg-primary/10"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.05em] transition-all",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.label === 'Dashboard' ? 'Home' : item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
