import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { seedDefaultCategories } from './categoryUtils';
import { seedDefaultAccount } from './useAccounts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setupPhoneAuth: (phoneNumber: string, containerId: string) => Promise<ConfirmationResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initializeUser = async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log("Initializing new user...");
        // Create user profile
        await setDoc(userRef, {
          displayName: user.displayName || 'Pengguna',
          email: user.email || null,
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
        });

        // Seed default categories
        await seedDefaultCategories(user.uid);
        // Seed default account
        await seedDefaultAccount(user.uid);

        // Create some default budgets to get started
        const defaultBudgets = [
          { category: 'Makan', limit: 1000000, spent: 0, icon: '🍔' },
          { category: 'Transport', limit: 500000, spent: 0, icon: '🚗' },
          { category: 'Belanja', limit: 500000, spent: 0, icon: '🛍️' },
        ];

        for (const budget of defaultBudgets) {
          const budgetRef = doc(collection(db, 'budgets'));
          await setDoc(budgetRef, {
            ...budget,
            userId: user.uid,
            month: new Date().toISOString().substring(0, 7), // YYYY-MM
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      // We don't throw here to avoid blocking the whole app if one non-critical write fails
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        // Run init in background without blocking state transition
        initializeUser(user).catch(err => console.error("Init failed:", err));
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      // initializeUser will be triggered by onAuthStateChanged
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset failed:", error);
      throw error;
    }
  };

  const setupPhoneAuth = async (phoneNumber: string, containerId: string) => {
    try {
      const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        'size': 'invisible',
      });
      return await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    } catch (error) {
      console.error("Phone auth failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      registerWithEmail, 
      resetPassword,
      setupPhoneAuth,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
