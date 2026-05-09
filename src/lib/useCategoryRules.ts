import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from './firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { CategoryRule } from './types';
import { useAuth } from './AuthContext';

export function useCategoryRules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRules([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'categoryRules'),
      where('userId', '==', user.uid),
      orderBy('priority', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rs: CategoryRule[] = [];
      snapshot.forEach((doc) => {
        rs.push({ id: doc.id, ...doc.data() } as CategoryRule);
      });
      setRules(rs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching category rules:", error);
      handleFirestoreError(error, OperationType.LIST, 'categoryRules');
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addRule = async (rule: Omit<CategoryRule, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;
    try {
      return await addDoc(collection(db, 'categoryRules'), {
        ...rule,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categoryRules');
    }
  };

  const updateRule = async (id: string, rule: Partial<CategoryRule>) => {
    try {
      await updateDoc(doc(db, 'categoryRules', id), rule);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categoryRules/${id}`);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categoryRules', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categoryRules/${id}`);
    }
  };

  return {
    rules,
    loading,
    addRule,
    updateRule,
    deleteRule
  };
}
