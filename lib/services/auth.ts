import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();

export const authService = {
  signInWithGoogle: async () => {
    if (!auth) throw new Error('Firebase auth not initialized');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  },

  signOut: async () => {
    if (!auth) throw new Error('Firebase auth not initialized');
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  getCurrentUser: () => auth?.currentUser || null,

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    if (!auth) throw new Error('Firebase auth not initialized');
    return onAuthStateChanged(auth, callback);
  }
}; 