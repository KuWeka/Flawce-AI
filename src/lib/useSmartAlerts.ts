import { useState, useEffect, useMemo } from 'react';
import { Transaction, Budget, Goal } from './types';

export interface Alert {
  id: string;
  type: 'budget' | 'spending' | 'goal' | 'income';
  level: 'red' | 'yellow' | 'blue';
  message: string;
  dismissKey: string;
}

interface SmartAlertsProps {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
}

export function useSmartAlerts({ transactions, budgets, goals }: SmartAlertsProps) {
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([]);

  useEffect(() => {
    // Load dismissed keys from localStorage
    const saved = localStorage.getItem('dismissed_alerts');
    const lastReset = localStorage.getItem('alerts_last_reset');
    const today = new Date().toISOString().split('T')[0];

    if (lastReset !== today) {
      // New day, clear dismissals
      localStorage.removeItem('dismissed_alerts');
      localStorage.setItem('alerts_last_reset', today);
      setDismissedKeys([]);
    } else if (saved) {
      setDismissedKeys(JSON.parse(saved));
    }
  }, []);

  const alerts = useMemo(() => {
    const activeAlerts: Alert[] = [];
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    const dayOfMonth = today.getDate();

    // 1. Budget Alerts (RED)
    budgets.forEach(budget => {
      if (budget.month === currentMonth && budget.limit > 0) {
        const remaining = budget.limit - budget.spent;
        const percentRemaining = (remaining / budget.limit) * 100;
        
        if (percentRemaining < 20 && remaining > 0) {
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          const daysLeft = daysInMonth - dayOfMonth;
          
          activeAlerts.push({
            id: `budget-${budget.id}`,
            type: 'budget',
            level: 'red',
            message: `Budget ${budget.category} tinggal Rp${remaining.toLocaleString('id-ID')} (${Math.round(percentRemaining)}%). Masih ${daysLeft} hari di bulan ini.`,
            dismissKey: `dismiss-budget-${budget.id}-${currentMonth}`
          });
        } else if (remaining <= 0) {
          activeAlerts.push({
            id: `budget-over-${budget.id}`,
            type: 'budget',
            level: 'red',
            message: `Budget ${budget.category} sudah terlampaui! (Habis Rp${budget.spent.toLocaleString('id-ID')})`,
            dismissKey: `dismiss-budget-over-${budget.id}-${currentMonth}`
          });
        }
      }
    });

    // 2. Spending Spike (YELLOW)
    if (transactions.length > 0) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const expensesLast7Days = transactions
        .filter(t => t.type === 'expense' && new Date(t.date) >= oneWeekAgo)
        .reduce((sum, t) => sum + t.amount, 0);
        
      const expensesWeekBefore = transactions
        .filter(t => t.type === 'expense' && new Date(t.date) >= twoWeeksAgo && new Date(t.date) < oneWeekAgo)
        .reduce((sum, t) => sum + t.amount, 0);

      if (expensesWeekBefore > 0) {
        const spikeRatio = expensesLast7Days / expensesWeekBefore;
        if (spikeRatio > 1.3) {
          activeAlerts.push({
            id: 'spending-spike',
            type: 'spending',
            level: 'yellow',
            message: `Pengeluaran minggu ini Rp${expensesLast7Days.toLocaleString('id-ID')}, ${Math.round((spikeRatio - 1) * 100)}% lebih tinggi dari minggu lalu.`,
            dismissKey: `dismiss-spike-${currentMonth}-${dayOfMonth}`
          });
        }
      }
    }

    // 3. Goal Deadline (BLUE)
    goals.forEach(goal => {
      if (!goal.isCompleted && goal.deadline) {
        const deadlineDate = new Date(goal.deadline);
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const progress = (goal.currentAmount / goal.targetAmount) * 100;

        if (diffDays < 90 && progress < 50) {
          activeAlerts.push({
            id: `goal-${goal.id}`,
            type: 'goal',
            level: 'blue',
            message: `Goal ${goal.name} deadline ${diffDays} hari lagi, baru tercapai ${Math.round(progress)}%.`,
            dismissKey: `dismiss-goal-${goal.id}`
          });
        }
      }
    });

    // 4. No Income (YELLOW)
    if (dayOfMonth > 10) {
      const incomeThisMonth = transactions.filter(t => 
        t.type === 'income' && t.date.startsWith(currentMonth)
      ).length;

      if (incomeThisMonth === 0) {
        activeAlerts.push({
          id: 'no-income',
          type: 'income',
          level: 'yellow',
          message: "Belum ada pemasukan yang dicatat bulan ini.",
          dismissKey: `dismiss-no-income-${currentMonth}`
        });
      }
    }

    return activeAlerts.filter(alert => !dismissedKeys.includes(alert.dismissKey));
  }, [transactions, budgets, goals, dismissedKeys]);

  const dismissAlert = (dismissKey: string) => {
    const updated = [...dismissedKeys, dismissKey];
    setDismissedKeys(updated);
    localStorage.setItem('dismissed_alerts', JSON.stringify(updated));
  };

  return { alerts, dismissAlert };
}
