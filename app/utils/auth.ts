import { NextRequest } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { credential } from "firebase-admin";

// Initialize Firebase Admin
let firebaseAdminInitialized = false;

function initializeFirebaseAdmin() {
  if (firebaseAdminInitialized || getApps().length > 0) {
    return;
  }

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        if (serviceAccount.type === 'service_account') {
          initializeApp({
            credential: credential.cert(serviceAccount),
          });
          console.log('Firebase Admin initialized with service account');
          firebaseAdminInitialized = true;
        } else {
          // Initialize without credentials for development
          initializeApp();
          console.warn('Firebase Admin initialized without credentials - auth features may be limited');
        }
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
        // Try to initialize without credentials
        try {
          initializeApp();
          console.warn('Firebase Admin initialized without credentials - auth features may be limited');
        } catch (fallbackError) {
          console.error('Complete Firebase Admin initialization failure:', fallbackError);
        }
      }
    } else {
      // Initialize without credentials for development
      initializeApp();
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not found or invalid, initialized without credentials - auth features may be limited');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    // Try one more time with minimal config
    try {
      initializeApp();
      console.log('Firebase Admin initialized with minimal config');
    } catch (fallbackError) {
      console.error('Complete Firebase Admin initialization failure:', fallbackError);
    }
  }
}

// Temporary solution: decode Firebase ID token manually (for development only)
// This is not secure for production - use Firebase Admin SDK in production
export function decodeFirebaseToken(idToken: string): { uid?: string; email?: string; } | null {
  try {
    // Firebase ID tokens are JWTs with 3 parts separated by dots
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode the payload (second part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(paddedPayload));
    
    return {
      uid: decoded.user_id || decoded.sub,
      email: decoded.email
    };
  } catch (error) {
    console.error('Error decoding Firebase token:', error);
    return null;
  }
}

// Development-only user ID extraction (fallback when Firebase Admin fails)
export async function getUserIdFromRequestFallback(request: NextRequest): Promise<string> {
  try {
    // Try to get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return 'anonymous';
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // First try Firebase Admin if available
    if (getApps().length > 0) {
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        return decodedToken.email || decodedToken.uid || 'anonymous';
      } catch (adminError) {
        console.warn('Firebase Admin verification failed, trying manual decode:', adminError);
      }
    }
    
    // Fallback to manual token decoding (development only)
    const decoded = decodeFirebaseToken(idToken);
    if (decoded) {
      console.log('Manually decoded token:', { uid: decoded.uid, email: decoded.email });
      return decoded.email || decoded.uid || 'anonymous';
    }
    
    return 'anonymous';
    
  } catch (error) {
    console.error('Error in getUserIdFromRequestFallback:', error);
    return 'anonymous';
  }
}

export async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  // Use the fallback method which handles both Firebase Admin and manual decoding
  return await getUserIdFromRequestFallback(request);
}

// Alternative method using session/cookie if needed
export async function getUserIdFromSession(request: NextRequest): Promise<string> {
  try {
    // Try to get user ID from a session cookie or other method
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) {
      // Verify session cookie with Firebase Admin
      const decodedClaims = await getAuth().verifySessionCookie(sessionCookie);
      return decodedClaims.uid;
    }
    
    return 'anonymous';
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    return 'anonymous';
  }
}

// Helper function to get full user info for debugging
export async function getUserInfoFromRequest(request: NextRequest): Promise<{ uid: string; email: string | null; userId: string }> {
  try {
    // Try to get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { uid: 'anonymous', email: null, userId: 'anonymous' };
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // First try Firebase Admin if available
    if (getApps().length > 0) {
      try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.email || decodedToken.uid || 'anonymous';
        return {
          uid: decodedToken.uid,
          email: decodedToken.email || null,
          userId: userId
        };
      } catch (adminError) {
        console.warn('Firebase Admin verification failed, trying manual decode:', adminError);
      }
    }
    
    // Fallback to manual token decoding
    const decoded = decodeFirebaseToken(idToken);
    if (decoded) {
      const userId = decoded.email || decoded.uid || 'anonymous';
      return {
        uid: decoded.uid || 'anonymous',
        email: decoded.email || null,
        userId: userId
      };
    }
    
    return { uid: 'anonymous', email: null, userId: 'anonymous' };
    
  } catch (error) {
    console.error('Error in getUserInfoFromRequest:', error);
    return { uid: 'anonymous', email: null, userId: 'anonymous' };
  }
}

// Initialize Firebase Admin on module load
initializeFirebaseAdmin();