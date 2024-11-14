import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, type Firestore, setDoc } from 'firebase/firestore';

export interface UserCategory {
  id: string;
  name: string;
  userId: string;
  createdAt: number;
  updatedAt?: string;
}

const getFirestore = (): Firestore => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
};

export const categoriesService = {
  async createCategory(userId: string, name: string): Promise<UserCategory> {
    const firestore = getFirestore();
    const categoryData = {
      name,
      userId,
      createdAt: Date.now()
    };

    const docRef = await addDoc(collection(firestore, 'categories'), categoryData);
    
    return {
      id: docRef.id,
      ...categoryData
    };
  },

  async getUserCategories(userId: string): Promise<UserCategory[]> {
    const firestore = getFirestore();
    const q = query(
      collection(firestore, 'categories'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserCategory));
  },

  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    const firestore = getFirestore();
    const categoryRef = doc(firestore, `users/${userId}/categories/${categoryId}`);
    await deleteDoc(categoryRef);
  },

  async updateCategory(
    userId: string, 
    categoryId: string, 
    name: string
  ): Promise<UserCategory> {
    const firestore = getFirestore();
    const categoryRef = doc(firestore, `users/${userId}/categories/${categoryId}`);
    
    const updatedCategory: UserCategory = {
      id: categoryId,
      name,
      userId,
      createdAt: Date.now(),
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(categoryRef, updatedCategory, { merge: true });
    return updatedCategory;
  }
}; 