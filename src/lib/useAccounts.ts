import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from './firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, increment, writeBatch, getDocs } from 'firebase/firestore';
import { Account, Transaction } from './types';
import { useAuth } from './AuthContext';

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'accounts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accs: Account[] = [];
      snapshot.forEach((doc) => {
        accs.push({ id: doc.id, ...doc.data() } as Account);
      });
      setAccounts(accs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching accounts:", error);
      handleFirestoreError(error, OperationType.LIST, 'accounts');
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addAccount = async (acc: Partial<Account>) => {
    if (!user) return;
    try {
      return await addDoc(collection(db, 'accounts'), {
        ...acc,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'accounts');
    }
  };

  const updateAccount = async (id: string, acc: Partial<Account>) => {
    try {
      await updateDoc(doc(db, 'accounts', id), acc);
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `accounts/${id}`);
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'accounts', id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `accounts/${id}`);
    }
  };

  return {
    accounts,
    loading,
    addAccount,
    updateAccount,
    deleteAccount
  };
}

export async function seedDefaultAccount(userId: string) {
  const accountsRef = collection(db, 'accounts');
  const q = query(accountsRef, where('userId', '==', userId));
  const snap = await getDocs(query(accountsRef, where('userId', '==', userId)));

  if (snap.empty) {
    await addDoc(accountsRef, {
      userId,
      name: 'Flowce Wallet',
      type: 'cash',
      balance: 0,
      icon: '💵',
      createdAt: serverTimestamp()
    });
    return true;
  }
  return false;
}
