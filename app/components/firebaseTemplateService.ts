import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { FormTemplate } from './CaseForm';

export interface FirebaseTemplate extends FormTemplate {
  userId: string;
}

export const saveTemplateToFirebase = async (template: FormTemplate, userId: string): Promise<void> => {
  try {
    const templatesRef = collection(db, 'users', userId, 'templates');
    await addDoc(templatesRef, {
      ...template,
      userId,
      createdAt: new Date().toISOString()
    });
    console.log('Template saved to Firebase successfully');
  } catch (error) {
    console.error('Error saving template to Firebase:', error);
    throw error;
  }
};

export const getTemplatesFromFirebase = async (userId: string): Promise<FirebaseTemplate[]> => {
  try {
    const templatesRef = collection(db, 'users', userId, 'templates');
    const querySnapshot = await getDocs(templatesRef);
    
    const templates: FirebaseTemplate[] = [];
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      templates.push({
        id: docSnapshot.id,
        name: data.name,
        createdAt: data.createdAt,
        formData: data.formData,
        userId: data.userId
      } as FirebaseTemplate);
    });
    
    return templates;
  } catch (error) {
    console.error('Error fetching templates from Firebase:', error);
    throw error;
  }
};

export const deleteTemplateFromFirebase = async (templateId: string, userId: string): Promise<void> => {
  try {
    const templateRef = doc(db, 'users', userId, 'templates', templateId);
    await deleteDoc(templateRef);
    console.log('Template deleted from Firebase successfully');
  } catch (error) {
    console.error('Error deleting template from Firebase:', error);
    throw error;
  }
};
