export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
  accountId: string;
  createdAt?: any;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'cash' | 'bank' | 'ewallet' | 'credit';
  balance: number;
  icon?: string;
  color?: string;
  isDefault?: boolean;
  createdAt?: any;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  spent: number;
  icon: string;
  month: string;
  period?: 'daily' | 'weekly' | 'monthly';
  createdAt?: any;
}

export interface SubCategory {
  name: string;
  icon?: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  type: 'income' | 'expense' | 'both';
  color?: string;
  subcategories?: SubCategory[];
  order?: number;
  createdAt?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
  image?: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  color: string;
  deadline: string;
  accountId?: string;
  isCompleted: boolean;
  createdAt: any;
}

export interface CategoryRule {
  id: string;
  userId: string;
  keywords: string[];
  category: string;
  type: 'income' | 'expense' | 'both';
  priority: number;
  createdAt: any;
}
