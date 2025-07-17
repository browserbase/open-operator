import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    // Try to initialize with service account
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    console.log('Service account env var exists:', !!serviceAccount);
    console.log('Service account starts with {:', serviceAccount?.trim().startsWith('{'));
    
    if (serviceAccount && serviceAccount.trim().startsWith('{')) {
      try {
        // Clean up the service account string - remove any extra quotes or escaping
        let cleanServiceAccount = serviceAccount.trim();
        
        // Remove outer quotes if present
        if (cleanServiceAccount.startsWith('"') && cleanServiceAccount.endsWith('"')) {
          cleanServiceAccount = cleanServiceAccount.slice(1, -1);
        }
        
        // Unescape any escaped quotes
        cleanServiceAccount = cleanServiceAccount.replace(/\\"/g, '"');
        
        console.log('Attempting to parse cleaned service account...');
        console.log('Clean service account first 200 chars:', cleanServiceAccount.substring(0, 200));
        const parsedServiceAccount = JSON.parse(cleanServiceAccount);
        console.log('Parsed service account, project_id:', parsedServiceAccount.project_id);
        
        initializeApp({
          credential: cert(parsedServiceAccount),
          projectId: parsedServiceAccount.project_id
        });
        console.log('Firebase Admin initialized with service account and project ID:', parsedServiceAccount.project_id);
      } catch (parseError) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', parseError);
        console.log('First 100 chars of service account:', serviceAccount.substring(0, 100));
        
        // Try to initialize with just project ID if we can extract it
        const projectIdMatch = serviceAccount.match(/"project_id":\s*"([^"]+)"/);
        if (projectIdMatch) {
          const projectId = projectIdMatch[1];
          console.log('Extracted project ID:', projectId);
          initializeApp({ projectId });
          console.log('Firebase Admin initialized with extracted project ID');
        } else {
          // Initialize without credentials for development
          initializeApp();
          console.warn('Firebase Admin initialized without credentials - auth features may be limited');
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
