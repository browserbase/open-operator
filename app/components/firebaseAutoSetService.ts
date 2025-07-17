import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface AutoSetData {
  homeAddress: string;
  officeAddress: string;
}

export const saveAutoSetDataToFirebase = async (autoSetData: AutoSetData, userId: string): Promise<void> => {
  try {
    const autoSetRef = doc(db, 'users', userId, 'settings', 'autoSet');
    await setDoc(autoSetRef, {
      ...autoSetData,
      updatedAt: new Date().toISOString()
    });
    console.log('Auto set data saved to Firebase successfully');
  } catch (error) {
    console.error('Error saving auto set data to Firebase:', error);
    throw error;
  }
};

export const getAutoSetDataFromFirebase = async (userId: string): Promise<AutoSetData | null> => {
  try {
    const autoSetRef = doc(db, 'users', userId, 'settings', 'autoSet');
    const docSnapshot = await getDoc(autoSetRef);
    
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      return {
        homeAddress: data.homeAddress || '',
        officeAddress: data.officeAddress || ''
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching auto set data from Firebase:', error);
    throw error;
  }
};
