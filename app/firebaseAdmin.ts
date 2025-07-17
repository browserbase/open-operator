import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log('🔥 Initializing Firebase Admin with service account...');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        
        initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
        
        console.log('✅ Firebase Admin initialized successfully');
      } else {
        console.log('⚠️  FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables');
        console.log('💡 To enable Firebase storage:');
        console.log('   1. Go to Firebase Console > Project Settings > Service Accounts');
        console.log('   2. Generate a new private key');
        console.log('   3. Add the JSON content to your .env file as FIREBASE_SERVICE_ACCOUNT_KEY');
        console.log('   4. Restart your development server');
        console.log('');
        console.log('🔄 Running in fallback mode - data will be stored in memory only');
        
        // Initialize with minimal config for development
        initializeApp({
          projectId: 'dfcs-webtools'
        });
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
      console.log('🔄 Running in fallback mode - data will be stored in memory only');
      
      // Try to initialize with minimal config
      try {
        initializeApp({
          projectId: 'dfcs-webtools'
        });
      } catch (fallbackError) {
        console.error('❌ Failed to initialize Firebase Admin in fallback mode:', fallbackError);
      }
    }
  }
  
  return getFirestore();
}

// Export the admin Firestore instance
export const adminDb = initializeFirebaseAdmin();
