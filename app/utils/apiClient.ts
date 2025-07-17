import { User } from "firebase/auth";

// Utility function to make authenticated API requests
export async function makeAuthenticatedRequest(
  url: string, 
  options: RequestInit = {}, 
  user: User | null = null
): Promise<Response> {
  const headers = new Headers(options.headers);
  
  // Add auth token if user is logged in
  if (user) {
    try {
      const idToken = await user.getIdToken();
      headers.set('Authorization', `Bearer ${idToken}`);
    } catch (error) {
      console.error('Failed to get ID token:', error);
      // Continue without auth token
    }
  }
  
  // Add content-type if not present
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  const authenticatedOptions: RequestInit = {
    ...options,
    headers
  };
  
  return fetch(url, authenticatedOptions);
}

// Utility function to get user ID from current user
export function getUserId(user: User | null): string {
  return user?.uid || 'anonymous';
}

// Utility function to create user-specific SSE URL
export function createUserSpecificSSEUrl(baseUrl: string, executionId: string, user: User | null): string {
  const url = new URL(baseUrl);
  url.searchParams.set('executionId', executionId);
  if (user) {
    url.searchParams.set('userId', user.uid);
  }
  return url.toString();
}
