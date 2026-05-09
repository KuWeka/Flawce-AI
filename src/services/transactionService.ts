import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  increment, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { Transaction, Account, Budget } from '../lib/types';

/**
 * Finds a matching budget for a given category and date
 */
async function findMatchingBudget(userId: string, category: string, date: string): Promise<{ id: string, data: Budget } | null> {
  const month = date.slice(0, 7); // YYYY-MM
  const budgetsRef = collection(db, 'budgets');
  const q = query(
    budgetsRef,
    where('userId', '==', userId),
    where('category', '==', category),
    where('month', '==', month)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return null;
  
  return {
    id: snap.docs[0].id,
    data: snap.docs[0].data() as Budget
  };
}

/**
 * Creates a new transaction and updates account balance and budget spent atomically.
 */
export async function createTransaction(
  data: Omit<Transaction, 'id' | 'createdAt'>,
  userId: string
) {
  if (data.amount <= 0) throw new Error('Amount must be greater than 0');
  if (!data.category) throw new Error('Category is required');
  if (!data.accountId) throw new Error('Account is required');

  const batch = writeBatch(db);
  const txRef = doc(collection(db, 'transactions'));
  
  // 1. Create Transaction
  batch.set(txRef, {
    ...data,
    userId,
    createdAt: serverTimestamp()
  });

  // 2. Update Account Balance
  const accountRef = doc(db, 'accounts', data.accountId);
  const amountChange = data.type === 'income' ? data.amount : -data.amount;
  batch.update(accountRef, {
    balance: increment(amountChange)
  });

  // 3. Update Budget (if applicable)
  if (data.type === 'expense') {
    const budget = await findMatchingBudget(userId, data.category, data.date);
    if (budget) {
      batch.update(doc(db, 'budgets', budget.id), {
        spent: increment(data.amount)
      });
    }
  }

  await batch.commit();
  return txRef.id;
}

/**
 * Updates an existing transaction and adjusts account balance and budget spent accordingly.
 */
export async function updateTransaction(
  transactionId: string,
  oldData: Transaction,
  newData: Omit<Transaction, 'id' | 'createdAt'>,
  userId: string
) {
  const batch = writeBatch(db);
  const txRef = doc(db, 'transactions', transactionId);

  // 1. Update Transaction Document
  batch.update(txRef, {
    ...newData,
    updatedAt: serverTimestamp()
  });

  // 2. Adjust Account Balances
  // Reverse old balance
  const oldAccountRef = doc(db, 'accounts', oldData.accountId);
  const oldAmountReverse = oldData.type === 'income' ? -oldData.amount : oldData.amount;
  batch.update(oldAccountRef, {
    balance: increment(oldAmountReverse)
  });

  // Apply new balance
  const newAccountRef = doc(db, 'accounts', newData.accountId);
  const newAmountChange = newData.type === 'income' ? newData.amount : -newData.amount;
  batch.update(newAccountRef, {
    balance: increment(newAmountChange)
  });

  // 3. Adjust Budgets
  // Reverse old budget spent
  if (oldData.type === 'expense') {
    const oldBudget = await findMatchingBudget(userId, oldData.category, oldData.date);
    if (oldBudget) {
      batch.update(doc(db, 'budgets', oldBudget.id), {
        spent: increment(-oldData.amount)
      });
    }
  }

  // Apply new budget spent
  if (newData.type === 'expense') {
    const newBudget = await findMatchingBudget(userId, newData.category, newData.date);
    if (newBudget) {
      batch.update(doc(db, 'budgets', newBudget.id), {
        spent: increment(newData.amount)
      });
    }
  }

  await batch.commit();
}

/**
 * Deletes a transaction and reverts account balance and budget spent.
 */
export async function deleteTransaction(
  transaction: Transaction,
  userId: string
) {
  const batch = writeBatch(db);
  const txRef = doc(db, 'transactions', transaction.id);

  // 1. Delete Transaction Document
  batch.delete(txRef);

  // 2. Revert Account Balance
  const accountRef = doc(db, 'accounts', transaction.accountId);
  const amountReverse = transaction.type === 'income' ? -transaction.amount : transaction.amount;
  batch.update(accountRef, {
    balance: increment(amountReverse)
  });

  // 3. Revert Budget Spent
  if (transaction.type === 'expense') {
    const budget = await findMatchingBudget(userId, transaction.category, transaction.date);
    if (budget) {
      batch.update(doc(db, 'budgets', budget.id), {
        spent: increment(-transaction.amount)
      });
    }
  }

  await batch.commit();
}
