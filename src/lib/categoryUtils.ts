import { db } from './firebase';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { Category, CategoryRule } from './types';

export function applyAutoCategory(description: string, rules: CategoryRule[]): string | null {
  if (!description) return null;
  
  const lowerDesc = description.toLowerCase();
  
  // Rules are already sorted by priority in the hook, but let's be safe
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    const matched = rule.keywords.some(keyword => 
      lowerDesc.includes(keyword.toLowerCase())
    );
    
    if (matched) {
      return rule.category;
    }
  }
  
  return null;
}

export const DEFAULT_CATEGORIES = {
  expense: [
    { name: 'Makan', icon: '🍔', subcategories: [{ name: 'Sarapan', icon: '☕' }, { name: 'Makan Siang', icon: '🍛' }, { name: 'Makan Malam', icon: '🍽️' }, { name: 'Camilan', icon: '🍪' }] },
    { name: 'Transport', icon: '🚗', subcategories: [{ name: 'Bensin', icon: '⛽' }, { name: 'Parkir', icon: '🅿️' }, { name: 'Transport Umum', icon: '🚌' }, { name: 'Ojek Online', icon: '🛵' }] },
    { name: 'Belanja', icon: '🛍️', subcategories: [{ name: 'Kebutuhan Harian', icon: '🧼' }, { name: 'Pakaian', icon: '👕' }, { name: 'Elektronik', icon: '📱' }] },
    { name: 'Tagihan', icon: '🔌', subcategories: [{ name: 'Listrik', icon: '⚡' }, { name: 'Air', icon: '🚰' }, { name: 'Internet', icon: '🌐' }, { name: 'Pulsa', icon: '📲' }] },
    { name: 'Hiburan', icon: '🎟️', subcategories: [{ name: 'Film', icon: '🎬' }, { name: 'Game', icon: '🎮' }, { name: 'Liburan', icon: '✈️' }] },
    { name: 'Kesehatan', icon: '🏥', subcategories: [{ name: 'Obat', icon: '💊' }, { name: 'Dokter', icon: '🩺' }] },
    { name: 'Lainnya', icon: '📦', subcategories: [] }
  ],
  income: [
    { name: 'Gaji', icon: '💰', subcategories: [] },
    { name: 'Bonus', icon: '🎁', subcategories: [] },
    { name: 'Investasi', icon: '📈', subcategories: [] },
    { name: 'Lainnya', icon: '💵', subcategories: [] }
  ]
};

export async function seedDefaultCategories(userId: string) {
  const categoriesRef = collection(db, 'categories');
  const q = query(categoriesRef, where('userId', '==', userId));
  const snap = await getDocs(q);

  if (snap.empty) {
    const batch = writeBatch(db);
    
    // Seed Expenses
    DEFAULT_CATEGORIES.expense.forEach((cat, index) => {
      const newDocRef = doc(categoriesRef);
      batch.set(newDocRef, {
        userId,
        name: cat.name,
        icon: cat.icon,
        type: 'expense',
        subcategories: cat.subcategories || [],
        order: index,
        createdAt: serverTimestamp()
      });
    });

    // Seed Incomes
    DEFAULT_CATEGORIES.income.forEach((cat, index) => {
      const newDocRef = doc(categoriesRef);
      batch.set(newDocRef, {
        userId,
        name: cat.name,
        icon: cat.icon,
        type: 'income',
        subcategories: cat.subcategories || [],
        order: index,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
    return true;
  }
  return false;
}
