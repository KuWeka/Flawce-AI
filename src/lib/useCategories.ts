import { useState, useEffect } from 'react';
import { db, OperationType, handleFirestoreError } from './firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, writeBatch } from 'firebase/firestore';
import { Category } from './types';
import { useAuth } from './AuthContext';

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'categories'),
      where('userId', '==', user.uid),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const cats: Category[] = [];
      let needsMigration = snapshot.size > 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Category;
        if (data.order !== undefined) needsMigration = false;
        cats.push({ id: doc.id, ...data } as Category);
      });

      // Simple migration if no categories have 'order' field
      if (needsMigration) {
        const batch = writeBatch(db);
        cats.forEach((cat, index) => {
          batch.update(doc(db, 'categories', cat.id), { order: index });
        });
        await batch.commit();
      }

      setCategories(cats);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching categories:", error);
      handleFirestoreError(error, OperationType.LIST, 'categories');
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const addCategory = async (cat: Partial<Category>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'categories'), {
        ...cat,
        userId: user.uid,
        order: categories.length,
        createdAt: serverTimestamp()
      });
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const updateCategory = async (id: string, cat: Partial<Category>) => {
    try {
      await updateDoc(doc(db, 'categories', id), cat);
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const reorderCategories = async (newOrder: Category[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    newOrder.forEach((cat, index) => {
      batch.update(doc(db, 'categories', cat.id), { order: index });
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'categories/reorder');
    }
  };

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories
  };
}
