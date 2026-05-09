import React, { useState, useRef, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, Plus, Minus, PieChart, Wallet, MessageSquare, ChevronDown, Loader2, Mic, Camera, Check, Image as ImageIcon } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { ChatMessage, Transaction, Budget, Account } from '@/src/lib/types';
import { db } from '@/src/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '@/src/lib/AuthContext';
import { useCategories } from '@/src/lib/useCategories';
import { useCategoryRules } from '@/src/lib/useCategoryRules';
import { applyAutoCategory } from '@/src/lib/categoryUtils';
import { useAccounts } from '@/src/lib/useAccounts';
import TransactionForm from './TransactionForm';
import { chatWithAI, analyzeReceiptImage } from '@/src/services/geminiService';
import { createTransaction } from '@/src/services/transactionService';
import { correctSpeechText } from '@/src/lib/speechCorrections';
import Logo from './Logo';

export default function ChatBot() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const { rules } = useCategoryRules();
  const { accounts } = useAccounts();
  const [recordMode, setRecordMode] = useState<'ai' | 'manual'>('ai');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'bot',
      content: `Halo, ${user?.displayName || 'Eka'}! 👋 Saya Flowce AI, asisten keuangan pribadimu yang siap membantu kapan saja. Catat pengeluaran semudah ngobrol — cukup ketik seperti "keluar 50rb makan siang", dan saya akan langsung mencatatnya. Mau tahu kondisi keuanganmu? Tanya saja, misalnya "berapa pengeluaran makanku minggu ini?" — saya siap analisiskan! 💸`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 1. Read file as base64 for preview and API
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const previewUrl = reader.result as string;

      // 2. Add user message with image preview
      const imageMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: 'Menganalisis struk...',
        timestamp: new Date().toISOString(),
        image: previewUrl
      };
      setMessages(prev => [...prev, imageMsg]);
      setIsAnalyzing(true);

      try {
        const result = await analyzeReceiptImage(base64String, file.type);
        
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'bot',
          content: `Saya menemukan struk dari **${result.description}**, total **${formatCurrency(result.amount)}**. Apakah saya catat sebagai pengeluaran **${result.category}**?`,
          timestamp: new Date().toISOString()
        };

        // Add a field to the message to store result for confirmation
        (botMsg as any).receiptData = result;

        setMessages(prev => [...prev, botMsg]);
      } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'bot',
          content: 'Maaf, saya gagal membaca struk tersebut. Pastikan gambar jelas dan coba lagi.',
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmReceipt = (data: any) => {
    const event = new CustomEvent('openTransactionForm', { 
      detail: { 
        amount: data.amount,
        description: data.description,
        category: data.category,
        date: data.date,
        type: 'expense'
      } 
    });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'id-ID';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const corrected = correctSpeechText(transcript);
          setInput(prev => (prev ? `${prev} ${corrected}` : corrected));
        }
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      return () => {
        recognitionRef.current?.stop();
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Failed to stop recognition:', error);
      }
    } else {
      try {
        // Set state immediately to prevent double clicks while starting
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setIsListening(false);
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, recordMode]);

  const handleSend = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Fetch context data (longer history for better analysis)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const [txSnap, budgetSnap, allTxSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'transactions'), 
          where('userId', '==', user.uid),
          where('date', '>=', thirtyDaysAgo.toISOString()),
          limit(100)
        )),
        getDocs(query(collection(db, 'budgets'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'transactions'), where('userId', '==', user.uid)))
      ]);

      const recentTransactions = txSnap.docs
        .map(d => ({ ...d.data(), id: d.id } as Transaction))
        .sort((a, b) => b.date.localeCompare(a.date));
      
      const budgets = budgetSnap.docs.map(d => ({ ...d.data(), id: d.id } as Budget));
      
      const totalBalance = allTxSnap.docs.reduce((sum, d) => {
        const tx = d.data();
        return tx.type === 'income' ? sum + tx.amount : sum - tx.amount;
      }, 0);

      const result = await chatWithAI(input, {
        userName: user.displayName || 'User',
        balance: totalBalance,
        recentTransactions,
        budgets,
        categories: categories.map(c => c.name),
        accounts
      });

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: result.message,
        timestamp: new Date().toISOString()
      };

      if (result.success) {
        if (result.intent === 'record' && result.transactions && Array.isArray(result.transactions)) {
          for (const txData of result.transactions) {
            if (txData.type && txData.amount && txData.category) {
              // Priority: User Rules > AI parsing
              const autoCategory = applyAutoCategory(txData.description || '', rules);
              const txCategory = autoCategory || txData.category;
              
              const normalizedCategory = txCategory.charAt(0).toUpperCase() + txCategory.slice(1).toLowerCase();
              const accountId = txData.accountId || (accounts[0]?.id || 'default');

              await createTransaction({
                userId: user.uid,
                amount: Number(txData.amount),
                type: txData.type as 'income' | 'expense',
                category: normalizedCategory,
                description: txData.description || '',
                accountId,
                date: new Date().toISOString()
              }, user.uid);
            }
          }
        } else if (result.intent === 'create_account' && result.accountData) {
          const { name, balance, type, icon } = result.accountData;
          await addDoc(collection(db, 'accounts'), {
            userId: user.uid,
            name,
            balance: Number(balance),
            type: type || 'ewallet',
            icon: icon || '💰',
            isDefault: accounts.length === 0,
            createdAt: serverTimestamp()
          });
        } else if (result.intent === 'create_goal' && result.goalData) {
          const { name, targetAmount, deadline, currentAmount, icon } = result.goalData;
          await addDoc(collection(db, 'goals'), {
            userId: user.uid,
            name,
            targetAmount: Number(targetAmount),
            currentAmount: Number(currentAmount || 0),
            deadline: deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            icon: icon || '🎯',
            color: '#3b82f6',
            isCompleted: false,
            createdAt: serverTimestamp()
          });
        } else if (result.intent === 'create_category' && result.categoryData) {
          const { name, type, icon } = result.categoryData;
          await addDoc(collection(db, 'categories'), {
            userId: user.uid,
            name,
            type: type || 'expense',
            icon: icon || '📂',
            createdAt: serverTimestamp()
          });
        } else if (result.intent === 'create_budget' && result.budgetData) {
          const { category, amount, period } = result.budgetData;
          await addDoc(collection(db, 'budgets'), {
            userId: user.uid,
            category: category || 'Semua',
            limit: Number(amount),
            spent: 0,
            period: period || 'monthly',
            icon: '💰',
            month: new Date().toISOString().slice(0, 7), // YYYY-MM
            createdAt: serverTimestamp()
          });
        }
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'bot', 
        content: "Aduh, AI sedang lelah. Coba tanya lagi ya!", 
        timestamp: new Date().toISOString() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-105px)] md:h-[calc(100vh-140px)] flex flex-col items-center">
      <div className="w-full max-w-3xl flex-1 flex flex-col glass-card p-0 overflow-hidden relative shadow-2xl">
        <div className="p-4 border-b border-border bg-foreground/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo size={40} variant="solid" />
              <div>
                <h3 className="text-sm md:text-base font-bold text-foreground mb-0.5">Flowce AI</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Mode {recordMode.toUpperCase()} Aktif</span>
                </div>
              </div>
            </div>
            
            <div className="flex bg-secondary p-1 rounded-xl border border-border self-end md:self-center">
              <button
                onClick={() => setRecordMode('ai')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2",
                  recordMode === 'ai' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles size={12} /> AI
              </button>
              <button
                onClick={() => setRecordMode('manual')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2",
                  recordMode === 'manual' ? "bg-card shadow-lg border border-border text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Plus size={12} /> MANUAL
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          <AnimatePresence mode="wait">
            {recordMode === 'ai' ? (
              <motion.div 
                key="ai-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col max-w-[85%] md:max-w-[75%] space-y-1.5", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div className={cn(
                        "p-4 rounded-2xl text-sm md:text-base shadow-sm transition-all overflow-hidden",
                        msg.role === 'user' 
                          ? "bg-primary text-primary-foreground font-medium rounded-tr-none" 
                          : "bg-secondary border border-border text-foreground rounded-tl-none"
                      )}>
                        {msg.image && (
                          <div className="mb-3 rounded-xl overflow-hidden border border-white/20 shadow-md">
                            <img src={msg.image} alt="Receipt" className="w-full h-auto max-h-[200px] object-cover" />
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">
                          {msg.content.split('**').map((part, i) => i % 2 === 1 ? <b key={i}>{part}</b> : part)}
                        </div>
                        
                        {(msg as any).receiptData && (
                          <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                            <button 
                              onClick={() => confirmReceipt((msg as any).receiptData)}
                              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                            >
                              <Check size={14} /> Konfirmasi & Catat
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold px-1 opacity-60">
                        {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {isLoading && <div className="mr-auto bg-secondary px-4 py-2 rounded-full text-[10px] text-muted-foreground font-bold animate-pulse border border-border">Berpikir...</div>}
                  {isAnalyzing && <div className="mr-auto bg-secondary px-4 py-2 rounded-full text-[10px] text-muted-foreground font-bold animate-pulse border border-border">Menganalisis Struk...</div>}
                </div>

                <div className="p-4 md:p-8 bg-background border-t border-border">
                  <form onSubmit={handleSend} className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? "Mendengarkan..." : "Contoh: Keluar 50rb bayar listrik"}
                        className={cn(
                          "w-full bg-secondary border border-border rounded-2xl py-4.5 pl-6 pr-24 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-inner",
                          (isListening || isAnalyzing) && "border-primary/50 ring-2 ring-primary/10"
                        )}
                        disabled={isAnalyzing}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <input 
                          type="file" 
                          ref={cameraInputRef} 
                          onChange={handleImageCapture} 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                        />
                        <input 
                          type="file" 
                          ref={galleryInputRef} 
                          onChange={handleImageCapture} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                          disabled={isAnalyzing}
                          title="Ambil Foto Struk"
                        >
                          <Camera size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current?.click()}
                          className="p-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                          disabled={isAnalyzing}
                          title="Upload dari Galeri"
                        >
                          <ImageIcon size={20} />
                        </button>
                        
                        {recognitionRef.current && (
                          <button
                            type="button"
                            onClick={toggleListening}
                            className={cn(
                              "p-2.5 rounded-xl transition-all",
                              isListening 
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 animate-pulse" 
                                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                            )}
                            disabled={isAnalyzing}
                          >
                            <Mic size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                    <button type="submit" disabled={isLoading || isListening || isAnalyzing || !input.trim()} className="p-4.5 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50">
                      <Send size={22} />
                    </button>
                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="manual-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 h-full overflow-y-auto"
              >
                <div className="max-w-md mx-auto">
                  <TransactionForm 
                    onClose={() => setRecordMode('ai')} 
                    onSuccess={() => {
                      // Optionally switch back or show feedback
                    }}
                    isInline={true}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
