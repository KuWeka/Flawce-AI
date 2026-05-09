/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatBot from './components/ChatBot';
import Logo from './components/Logo';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import Budgets from './components/Budgets';
import Accounts from './components/Accounts';
import Goals from './components/Goals';
import PinLock from './components/PinLock';
import Settings from './components/Settings';
import AuthScreen from './components/AuthScreen';
import SplashScreen from './components/SplashScreen';
import TransactionForm from './components/TransactionForm';
import { Menu, Plus, Sparkles, X, Activity } from 'lucide-react';
import { cn } from './lib/utils';
import { useAuth } from './lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPinUnlocked, setIsPinUnlocked] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  useEffect(() => {
    const pinActive = localStorage.getItem('pin_active') === 'true';
    const pinHash = localStorage.getItem('pin_hash');
    
    if (pinActive) {
      if (pinHash) {
        setIsPinUnlocked(false);
      } else {
        // Fix inconsistency: pin_active is true but hash is missing
        localStorage.setItem('pin_active', 'false');
        setIsPinUnlocked(true);
      }
    } else {
      setIsPinUnlocked(true);
    }

    // Auto-lock logic
    let inactivityTimer: ReturnType<typeof setTimeout>;
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes

    const lockApp = () => {
      const pinActive = localStorage.getItem('pin_active') === 'true';
      const pinHash = localStorage.getItem('pin_hash');
      if (pinActive && pinHash) {
        setIsPinUnlocked(false);
      }
    };

    const resetInactivityTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(lockApp, INACTIVITY_LIMIT);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastActive = localStorage.getItem('last_active_time');
        if (lastActive) {
          const elapsed = Date.now() - parseInt(lastActive);
          const pinActive = localStorage.getItem('pin_active') === 'true';
          const pinHash = localStorage.getItem('pin_hash');
          if (elapsed > INACTIVITY_LIMIT && pinActive && pinHash) {
            setIsPinUnlocked(false);
          }
        }
      } else {
        localStorage.setItem('last_active_time', Date.now().toString());
      }
    };

    // User interaction resets timer
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetInactivityTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, []);
  
  const userName = user?.displayName || "Pengguna";

  useEffect(() => {
    const handleTabChange = (e: CustomEvent) => {
      if (e.detail) setActiveTab(e.detail);
    };
    const handleOpenForm = (e: CustomEvent) => {
      setInitialTxData(e.detail || null);
      setIsFormOpen(true);
    };

    window.addEventListener('changeTab', handleTabChange);
    window.addEventListener('openTransactionForm', handleOpenForm as EventListener);

    return () => {
      window.removeEventListener('changeTab', handleTabChange);
      window.removeEventListener('openTransactionForm', handleOpenForm as EventListener);
    };
  }, []);

  const [initialTxData, setInitialTxData] = useState<Record<string, any> | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'chatbot':
        return <ChatBot />;
      case 'transactions':
        return <Transactions />;
      case 'reports':
        return <Reports />;
      case 'budgets':
        return <Budgets />;
      case 'accounts':
        return <Accounts />;
      case 'goals':
        return <Goals />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onComplete={handleSplashComplete} />
      ) : loading ? (
        <motion.div 
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="min-h-screen bg-background flex items-center justify-center transition-colors duration-300"
        >
          <div className="flex flex-col items-center gap-4">
            <Logo size={48} variant="dark" className="animate-pulse" />
            <p className="text-muted-foreground font-semibold animate-pulse text-sm">Flowing with Flowce...</p>
          </div>
        </motion.div>
      ) : !user ? (
        <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
          <AuthScreen />
        </motion.div>
      ) : !isPinUnlocked ? (
        <motion.div key="pin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
          <PinLock onUnlock={() => setIsPinUnlocked(true)} />
        </motion.div>
      ) : (
        <motion.div 
          key="app" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary transition-colors duration-300"
        >
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            userName={userName}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />

          <main className={cn(
            "transition-all duration-300 lg:pl-[280px] min-h-screen",
            "pb-24 lg:pb-8" // Add padding for mobile bottom nav
          )}>
            {/* Mobile Header */}
            <div className="lg:hidden p-4 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-30 border-b border-border">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-muted hover:text-foreground"
              >
                <Menu size={24} />
              </button>
              <Logo size={28} showText />
              <div className="w-10 h-10 rounded-full border border-primary/20 overflow-hidden shadow-lg">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} 
                  alt="avatar" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="container mx-auto p-3 md:p-10 max-w-7xl relative">
              {renderContent()}
            </div>
          </main>

          {/* Manual Entry Overlay Modal (for Editing) */}
          <AnimatePresence>
            {isFormOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsFormOpen(false)}
                  className="absolute inset-0 bg-background/60 backdrop-blur-md"
                />
                <TransactionForm 
                  initialData={initialTxData} 
                  onClose={() => {
                    setIsFormOpen(false);
                    setInitialTxData(null);
                  }} 
                />
              </div>
            )}
          </AnimatePresence>

          {/* Background Decor */}
          <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full animate-pulse [animation-delay:2s]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
