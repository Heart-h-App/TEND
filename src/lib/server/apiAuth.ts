import { error } from '@sveltejs/kit';
import { validateSession } from './auth';

/**
 * Validates a user's session from cookies and ensures they have access to the requested email data
 * @param cookies - Request cookies
 * @param requestedEmail - Email being requested in the API call
 * @returns The authenticated user if valid
 * @throws 401 error if not authenticated or 403 if trying to access another user's data
 */
export async function validateUserAccess(cookies: any, requestedEmail: string | null | undefined) {
  // Get session token from cookies
  const sessionToken = cookies.get('session');
  
  if (!sessionToken) {
    throw error(401, 'Authentication required');
  }
  
  // Validate the session
  const user = await validateSession(sessionToken);
  
  if (!user) {
    throw error(401, 'Invalid or expired session');
  }
  
  // If a specific email is being requested, ensure the user has access to it
  if (requestedEmail && user.email.toLowerCase() !== requestedEmail.toLowerCase()) {
    throw error(403, 'Access denied');
  }
  
  return user;
}
