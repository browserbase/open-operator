import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    try {
      // For development/testing, you can use a service account key
      // In production, you should use environment variables or Google Cloud authentication
      
      // Option 1: Use service account key (download from Firebase Console)
      // const serviceAccount = require('./path/to/serviceAccountKey.json');
      // initializeApp({
      //   credential: cert(serviceAccount),
      //   projectId: 'dfcs-webtools'
      // });
      
      // Option 2: Use environment variables (recommended for production)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        initializeApp({
          credential: cert(serviceAccount),
          projectId: 'dfcs-webtools'
        });
      } else {
        // Option 3: For local development without service account
        // This will use Application Default Credentials if available
        console.log('No Firebase service account found, initializing with default settings...');
        initializeApp({
          projectId: 'dfcs-webtools'
        });
      }
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      // Fallback initialization
      initializeApp({
        projectId: 'dfcs-webtools'
      });
    }
  }
  
  return getFirestore();
}

// Export the admin Firestore instance
export const adminDb = initializeFirebaseAdmin();
