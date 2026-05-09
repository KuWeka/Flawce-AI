import { useState, useEffect } from 'react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import { Download, TrendingUp, TrendingDown, Calendar, Clock, FileDown, FileSpreadsheet, ChevronDown, Filter, ChevronRight, ArrowRight, X } from 'lucide-react';
import { cn, formatCurrency } from '@/src/lib/utils';
import { db } from '@/src/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '@/src/lib/AuthContext';
import { Transaction } from '@/src/lib/types';
import { motion, AnimatePresence } from 'motion/react';
import { exportTransactionsToCSV, exportTransactionsToPDF, exportTransactionsToDOCX, exportTransactionsToExcel } from '@/src/services/exportService';
import { useAccounts } from '@/src/lib/useAccounts';
import { startOfMonth, endOfMonth, eachWeekOfInterval, isWithinInterval, startOfWeek, endOfWeek, format, isSameMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import Skeleton from './ui/Skeleton';

type ReportTab = 'Harian' | 'Bulanan' | 'Tahunan' | 'Kategori';

const COLORS = [
  'var(--chart-1)', 
  'var(--chart-2)', 
  'var(--chart-3)', 
  'var(--chart-4)', 
  'var(--chart-5)',
  'var(--primary)',
  'var(--warning)'
];

export default function Reports() {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const [activeTab, setActiveTab] = useState<ReportTab>('Bulanan');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach(doc => txs.push({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(txs);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Filter by Account
    if (selectedAccountId !== 'all') {
      filtered = filtered.filter(tx => tx.accountId === selectedAccountId);
    }

    // Filter by Date Range (Custom)
    if (startDate && endDate) {
      filtered = filtered.filter(tx => {
        const d = tx.date;
        return d >= startDate && d <= endDate;
      });
    } else {
      const now = new Date();
      if (activeTab === 'Harian') {
        filtered = filtered.filter(tx => new Date(tx.date).toDateString() === now.toDateString());
      } else if (activeTab === 'Bulanan') {
        filtered = filtered.filter(tx => {
          const d = new Date(tx.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
      } else if (activeTab === 'Tahunan') {
        filtered = filtered.filter(tx => new Date(tx.date).getFullYear() === now.getFullYear());
      }
    }

    return filtered;
  };

  const filteredTxs = getFilteredTransactions();

  const getCategoryData = () => {
    const categories: Record<string, number> = {};
    filteredTxs.forEach(tx => {
      if (tx.type === 'expense') {
        categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
      }
    });

    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  };

  const categoryData = getCategoryData();
  const totalExpense = categoryData.reduce((acc, curr) => acc + curr.value, 0);

  const getDailyHourlyData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, expense: 0 }));
    filteredTxs.forEach(tx => {
      if (tx.type === 'expense') {
        const hour = new Date(tx.date).getHours();
        hours[hour].expense += tx.amount;
      }
    });
    return hours;
  };

  const getMonthlyComparisonData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const data = months.map(m => ({ name: m, income: 0, expense: 0 }));
    const now = new Date();
    
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d.getFullYear() === now.getFullYear()) {
        const monthIdx = d.getMonth();
        if (tx.type === 'income') data[monthIdx].income += tx.amount;
        else data[monthIdx].expense += tx.amount;
      }
    });
    return data;
  };

  const getTopInsights = () => {
    const incomeTxs = filteredTxs.filter(tx => tx.type === 'income');
    const expenseTxs = filteredTxs.filter(tx => tx.type === 'expense');

    const topIncome = incomeTxs.length > 0 ? incomeTxs.reduce((prev, current) => (prev.amount > current.amount) ? prev : current) : null;
    const topExpenseCat = categoryData.length > 0 ? categoryData[0] : null;

    return { topIncome, topExpenseCat };
  };

  const getWeeklyData = () => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

    return weeks.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekTxs = filteredTxs.filter(tx => {
        const d = new Date(tx.date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      });

      const income = weekTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = weekTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      return {
        name: `Mgg ${index + 1}`,
        range: `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM')}`,
        income,
        expense
      };
    });
  };

  const CustomTooltip = ({ active, payload, label, total }: any) => {
    if (active && payload && payload.length) {
      const income = payload.find((p: any) => p.name === 'Pemasukan')?.value || 0;
      const expense = payload.find((p: any) => p.name === 'Pengeluaran')?.value || 0;
      const percentage = (income > 0) ? Math.round((expense / income) * 100) : 0;

      return (
        <div className="bg-card border border-border/60 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">{label}</p>
          <div className="space-y-1.5">
            {payload.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
                  <span className="text-xs font-bold text-foreground">{p.name}</span>
                </div>
                <div className="text-right">
                   <p className="text-xs font-black font-mono">{formatCurrency(p.value)}</p>
                   {total && total > 0 && (
                     <p className="text-[9px] text-muted-foreground">{Math.round((p.value / total) * 100)}% dari total</p>
                   )}
                </div>
              </div>
            ))}
            {income > 0 && expense > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-[9px] text-muted-foreground font-medium">
                  Pengeluaran ini <span className="text-foreground font-bold">{percentage}%</span> dari total pemasukan bulan tersebut
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const { topIncome, topExpenseCat } = getTopInsights();
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showAccountFilter, setShowAccountFilter] = useState(false);

  // Yearly Summary Data
  const now = new Date();
  const currentYearTxs = transactions.filter(tx => new Date(tx.date).getFullYear() === now.getFullYear());
  const yearlyIncome = currentYearTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const yearlyExpense = currentYearTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const yearlyAvgExpense = yearlyExpense / 12;

  // Monthly Summary Data (Current Month)
  const monthlyIncome = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthlyBalance = monthlyIncome - monthlyExpense;

  const handleExport = async (type: 'pdf' | 'csv' | 'docx' | 'excel') => {
    if (transactions.length === 0) return;
    if (type === 'pdf') exportTransactionsToPDF(transactions);
    else if (type === 'docx') await exportTransactionsToDOCX(transactions);
    else if (type === 'excel') exportTransactionsToExcel(transactions);
    else exportTransactionsToCSV(transactions);
    setShowExportOptions(false);
  };

   return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Laporan Analisis</h1>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Analisis cerdas untuk strategi finansialmu.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <button 
                onClick={() => setShowAccountFilter(!showAccountFilter)}
                className="flex items-center justify-between gap-3 w-full sm:w-auto px-4 py-2.5 bg-secondary border border-border rounded-xl text-xs font-bold hover:bg-muted transition-all"
              >
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-primary" />
                  <span>{selectedAccountId === 'all' ? 'Semua Akun' : accounts.find(a => a.id === selectedAccountId)?.name || 'Pilih Akun'}</span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform opacity-60", showAccountFilter && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showAccountFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl"
                  >
                    <button 
                      onClick={() => { setSelectedAccountId('all'); setShowAccountFilter(false); }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        selectedAccountId === 'all' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      Semua Akun
                    </button>
                    <div className="my-1 h-px bg-border/50" />
                    {accounts.map(acc => (
                      <button 
                        key={acc.id}
                        onClick={() => { setSelectedAccountId(acc.id); setShowAccountFilter(false); }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all",
                          selectedAccountId === acc.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {acc.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-secondary border border-border rounded-2xl p-1 gap-1 shadow-sm">
               <div className="flex items-center flex-1 px-3 py-1.5 h-10 sm:h-auto">
                 <input 
                   type="date" 
                   value={startDate} 
                   onChange={(e) => setStartDate(e.target.value)}
                   className="bg-transparent border-none text-[10px] sm:text-xs font-bold text-foreground focus:ring-0 p-0 w-full"
                 />
               </div>
               <div className="hidden sm:block text-muted-foreground opacity-30 text-xs">→</div>
               <div className="flex items-center flex-1 px-3 py-1.5 h-10 sm:h-auto">
                 <input 
                   type="date" 
                   value={endDate} 
                   onChange={(e) => setEndDate(e.target.value)}
                   className="bg-transparent border-none text-[10px] sm:text-xs font-bold text-foreground focus:ring-0 p-0 w-full"
                 />
               </div>
               {(startDate || endDate) && (
                 <button 
                   onClick={() => { setStartDate(''); setEndDate(''); }}
                   className="p-2 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                 >
                   <X size={14} />
                 </button>
               )}
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-xs shadow-lg shadow-primary/10 hover:translate-y-[-1px] active:translate-y-[0px] transition-all"
            >
              <Download size={16} />
              Export
            </button>
          
            <AnimatePresence>
              {showExportOptions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-56 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 backdrop-blur-xl"
                >
                  <button 
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-3 w-full p-4 rounded-xl hover:bg-secondary transition-colors text-left group"
                  >
                    <div className="p-2 bg-destructive/10 text-destructive rounded-lg group-hover:rotate-12 transition-transform">
                      <FileDown size={18} />
                    </div>
                    <span className="text-xs font-bold text-foreground">Export PDF</span>
                  </button>
                  <button 
                    onClick={() => handleExport('docx')}
                    className="flex items-center gap-3 w-full p-4 rounded-xl hover:bg-secondary transition-colors text-left group"
                  >
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg group-hover:rotate-12 transition-transform">
                      <FileDown size={18} />
                    </div>
                    <span className="text-xs font-bold text-foreground">Export DOCX</span>
                  </button>
                  <button 
                    onClick={() => handleExport('excel')}
                    className="flex items-center gap-3 w-full p-4 rounded-xl hover:bg-secondary transition-colors text-left group"
                  >
                    <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:rotate-12 transition-transform">
                      <FileSpreadsheet size={18} />
                    </div>
                    <span className="text-xs font-bold text-foreground">Export EXCEL</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-secondary/50 p-1 rounded-2xl border border-border w-fit shadow-inner">
        {(['Harian', 'Bulanan', 'Tahunan', 'Kategori'] as ReportTab[]).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 md:px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-bold transition-all",
              activeTab === tab ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-8 h-[400px] flex flex-col gap-6">
            <Skeleton className="w-48 h-5 rounded-lg" />
            <Skeleton className="flex-1 w-full rounded-2xl" />
          </div>
          <div className="glass-card p-8 h-[400px] flex flex-col gap-6">
            <Skeleton className="w-48 h-5 rounded-lg" />
            <div className="flex items-center gap-4">
              <Skeleton className="w-1/2 h-40 rounded-full" />
              <div className="flex-1 space-y-4">
                 <Skeleton className="w-full h-8 rounded-xl" />
                 <Skeleton className="w-full h-8 rounded-xl" />
                 <Skeleton className="w-full h-8 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 contents">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Insight Chart */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold text-foreground">
              {activeTab === 'Harian' ? 'Aktivitas Pengeluaran Hari Ini' : 'Pengeluaran per Kategori'}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-muted font-bold font-mono">
              {activeTab === 'Harian' ? <Clock size={12} /> : <Calendar size={12} />}
              {activeTab}
            </div>
          </div>

          {activeTab === 'Harian' ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getDailyHourlyData()}>
                  <defs>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted-foreground/10" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--muted-foreground)', fontSize: 10}} />
                  <YAxis hide />
                  <Tooltip 
                    content={<CustomTooltip />}
                  />
                  <Area type="monotone" dataKey="expense" stroke="var(--destructive)" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                <div className="h-[250px] w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                        onClick={(data) => setSelectedCategory(data.name === selectedCategory ? null : data.name)}
                        className="cursor-pointer"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" opacity={selectedCategory && selectedCategory !== entry.name ? 0.3 : 1} transition="all 0.3s" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip total={totalExpense} />} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-4 w-full">
                  {categoryData.length === 0 ? (
                    <p className="text-center text-xs text-muted italic py-10">Tidak ada pengeluaran.</p>
                  ) : (
                    categoryData.slice(0, 5).map((cat) => (
                      <button 
                        key={cat.name} 
                        onClick={() => setSelectedCategory(cat.name === selectedCategory ? null : cat.name)}
                        className={cn(
                          "flex items-center justify-between w-full p-2 rounded-xl transition-all",
                          selectedCategory === cat.name ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-secondary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-xs font-bold text-foreground">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold font-mono text-foreground">{formatCurrency(cat.value)}</p>
                          <p className="text-[10px] text-muted">{Math.round((cat.value / totalExpense) * 100)}%</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <AnimatePresence>
                {selectedCategory && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full bg-secondary/30 rounded-3xl border border-border p-6 overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ArrowRight size={12} className="text-primary" /> Pengeluaran: {selectedCategory}
                      </h4>
                      <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Tutup</button>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                      {filteredTxs.filter(tx => tx.category === selectedCategory && tx.type === 'expense').map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-card rounded-2xl border border-border shadow-sm">
                          <div>
                            <p className="text-xs font-bold text-foreground">{tx.description}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(tx.date), 'dd MMM yyyy')}</p>
                          </div>
                          <p className="text-xs font-black font-mono text-destructive">-{formatCurrency(tx.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Comparison or Secondary Chart */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">
              {activeTab === 'Bulanan' ? 'Aliran Kas Mingguan' : 'Pemasukan vs Pengeluaran Bulanan'}
            </h3>
            <div className="text-[10px] text-muted font-bold font-mono uppercase tracking-widest">
              {activeTab === 'Bulanan' ? format(new Date(), 'MMMM', { locale: id }) : format(new Date(), 'yyyy')}
            </div>
          </div>

          {/* Quick Summary Cards per Tab */}
          <div className="grid grid-cols-3 gap-2 mb-8">
            {activeTab === 'Bulanan' ? (
              <>
                <motion.div whileHover={{ y: -3 }} className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <p className="text-[8px] font-black uppercase text-primary/60 mb-1">Income</p>
                  <p className="text-[11px] font-black font-mono text-primary truncate">{formatCurrency(monthlyIncome)}</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                  <p className="text-[8px] font-black uppercase text-destructive/60 mb-1">Expense</p>
                  <p className="text-[11px] font-black font-mono text-destructive truncate">{formatCurrency(monthlyExpense)}</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className={cn("p-3 border rounded-xl", monthlyBalance >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                  <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Balance</p>
                  <p className={cn("text-[11px] font-black font-mono truncate", monthlyBalance >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {monthlyBalance >= 0 ? '+' : ''}{formatCurrency(monthlyBalance)}
                  </p>
                </motion.div>
              </>
            ) : (
              <>
                <motion.div whileHover={{ y: -3 }} className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <p className="text-[8px] font-black uppercase text-primary/60 mb-1">Yearly Income</p>
                  <p className="text-[11px] font-black font-mono text-primary truncate">{formatCurrency(yearlyIncome)}</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                  <p className="text-[8px] font-black uppercase text-destructive/60 mb-1">Yearly Expense</p>
                  <p className="text-[11px] font-black font-mono text-destructive truncate">{formatCurrency(yearlyExpense)}</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="p-3 bg-secondary border border-border rounded-xl">
                  <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">Avg / Month</p>
                  <p className="text-[11px] font-black font-mono text-foreground truncate">{formatCurrency(yearlyAvgExpense)}</p>
                </motion.div>
              </>
            )}
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeTab === 'Bulanan' ? getWeeklyData() : getMonthlyComparisonData()}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'currentColor', className: 'opacity-5' }} 
                  content={<CustomTooltip />}
                />
                <Bar dataKey="income" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Pemasukan" barSize={16} />
                <Bar dataKey="expense" fill="var(--destructive)" radius={[4, 4, 0, 0]} name="Pengeluaran" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] font-bold text-muted-foreground">Pemasukan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-[10px] font-bold text-muted-foreground">Pengeluaran</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card bg-primary/5 border-primary/20 flex gap-4 p-5 items-center shadow-lg hover:shadow-xl transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Pemasukan</h4>
            <p className="text-lg font-black font-mono text-primary">
              {formatCurrency(filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))}
            </p>
          </div>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card bg-destructive/5 border-destructive/20 flex gap-4 p-5 items-center shadow-lg hover:shadow-xl transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0">
            <TrendingDown size={24} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Pengeluaran</h4>
            <p className="text-lg font-black font-mono text-destructive">
              {formatCurrency(filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
            </p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card bg-secondary/50 border-border flex gap-4 p-5 items-center shadow-lg hover:shadow-xl transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-foreground flex-shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Rata-rata / Bulan</h4>
            <p className="text-lg font-black font-mono text-foreground/80">
              {formatCurrency(
                filteredTxs.length > 0 
                ? (filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) / 1) 
                : 0
              )}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card bg-primary/5 border-primary/20 flex gap-6 items-center shadow-lg hover:shadow-xl transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <TrendingUp size={32} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground mb-1">Pemasukan Tertinggi</h4>
            {topIncome ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Terbesar adalah <span className="text-primary font-bold">{topIncome.description}</span> ({topIncome.category}) sebesar <span className="text-primary font-bold">{formatCurrency(topIncome.amount)}</span>.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Belum ada data pemasukan.</p>
            )}
          </div>
        </motion.div>
        
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card bg-destructive/5 border-destructive/20 flex gap-6 items-center shadow-lg hover:shadow-xl transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive flex-shrink-0">
            <TrendingDown size={32} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground mb-1">Kategori Pengeluaran Utama</h4>
            {topExpenseCat ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Kamu paling banyak menghabiskan di <span className="text-destructive font-bold">{topExpenseCat.name}</span> dengan total <span className="text-destructive font-bold">{formatCurrency(topExpenseCat.value)}</span>.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Belum ada data pengeluaran.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Daily Breakdown for 'Harian' tab */}
      {activeTab === 'Harian' && filteredTxs.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card shadow-xl"
        >
          <h3 className="text-sm font-bold mb-6 italic text-muted">Detail Transaksi Hari Ini</h3>
          <div className="divide-y divide-border">
            {filteredTxs.map(tx => (
              <div key={tx.id} className="py-4 flex items-center justify-between first:pt-0 last:pb-0 group hover:bg-secondary px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn("w-2 h-2 rounded-full", tx.type === 'income' ? "bg-primary" : "bg-destructive")} />
                  <div>
                    <p className="text-xs font-bold text-foreground">{tx.description}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {tx.category}</p>
                  </div>
                </div>
                <p className={cn("text-xs font-mono font-bold", tx.type === 'income' ? "text-primary" : "text-destructive")}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      </div>
    )}
    </div>
  );
}
