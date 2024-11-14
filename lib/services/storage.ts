import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, type FirebaseStorage } from 'firebase/storage';

const getStorage = (): FirebaseStorage => {
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }
  return storage;
};

export async function uploadCustomSound(
  audioBlob: Blob, 
  filename: string,
  userId: string
): Promise<string> {
  const firebaseStorage = getStorage();
  const customSoundsRef = ref(firebaseStorage, `custom-sounds/${userId}/${filename}`);
  
  try {
    // Upload the audio file
    const snapshot = await uploadBytes(customSoundsRef, audioBlob);
    
    // Get the download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading custom sound:', error);
    throw error;
  }
}

export async function deleteCustomSound(soundPath: string): Promise<void> {
  try {
    const firebaseStorage = getStorage();
    const soundRef = ref(firebaseStorage, soundPath);
    await deleteObject(soundRef);
  } catch (error) {
    console.error('Error deleting custom sound:', error);
    throw error;
  }
} 