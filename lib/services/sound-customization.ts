import { db } from '@/lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  type Firestore,
  deleteDoc
} from 'firebase/firestore';
import type { Sound, SoundCustomizationSettings, CustomizableSound } from '@/lib/types';

const COLLECTION_NAME = 'sound-customizations';
const USER_SOUNDS_COLLECTION = 'user-sounds';

const getFirestore = (): Firestore => {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }
  return db;
};

export const soundCustomizationService = {
  async saveCustomization(
    soundId: string, 
    settings: SoundCustomizationSettings,
    userId?: string,
    originalSound?: Sound | CustomizableSound,
    customName?: string
  ) {
    if (!userId) return false;
    
    try {
      const firestore = getFirestore();
      
      // Generate a unique ID for this saved sound
      const uniqueId = `${userId}_${soundId}_${Date.now()}`;
      const userSoundRef = doc(firestore, USER_SOUNDS_COLLECTION, uniqueId);
      
      // Create a new customized sound object
      const customizedSound: CustomizableSound = {
        ...(originalSound || {}),
        id: uniqueId,
        name: customName || originalSound?.name || 'Custom Sound',
        category: originalSound?.category || 'custom',
        path: originalSound?.path || '',
        customization: settings,
        categoryId: ('categoryId' in originalSound! ? originalSound.categoryId : undefined),
      };

      // Remove undefined values before saving to Firestore
      const cleanedSound = JSON.parse(JSON.stringify(customizedSound));

      // Save to user's sounds collection
      await setDoc(userSoundRef, {
        userId,
        soundId: uniqueId,
        originalSoundId: soundId,
        sound: cleanedSound,
        savedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Error saving sound customization:', error);
      return false;
    }
  },

  async getUserSavedSounds(userId: string): Promise<CustomizableSound[]> {
    try {
      const firestore = getFirestore();
      const q = query(
        collection(firestore, USER_SOUNDS_COLLECTION),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const sounds: CustomizableSound[] = [];
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.sound && data.sound.id && data.sound.path) {
          sounds.push(data.sound as CustomizableSound);
        } else {
          console.warn('Invalid sound data found:', data);
        }
      });
      
      return sounds;
    } catch (error) {
      console.error('Error getting user saved sounds:', error);
      return [];
    }
  },

  async getCustomization(soundId: string): Promise<SoundCustomizationSettings | null> {
    try {
      const firestore = getFirestore();
      const docRef = doc(firestore, COLLECTION_NAME, soundId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          volume: data.volume ?? 100,
          pitch: data.pitch ?? 0,
          speed: data.speed ?? 100,
          duration: data.duration ?? 100,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting sound customization:', error);
      return {
        volume: 100,
        pitch: 0,
        speed: 100,
        duration: 100,
      };
    }
  },

  async deleteCustomSound(soundId: string, userId: string): Promise<void> {
    if (!userId) return;

    try {
      const firestore = getFirestore();
      
      // Delete from user-sounds collection
      const soundRef = doc(firestore, USER_SOUNDS_COLLECTION, soundId);
      await deleteDoc(soundRef);
      
      // Delete from sound-customizations collection
      const customizationRef = doc(firestore, COLLECTION_NAME, soundId);
      await deleteDoc(customizationRef);
    } catch (error) {
      console.error('Error deleting sound:', error);
      throw error;
    }
  }
}; 