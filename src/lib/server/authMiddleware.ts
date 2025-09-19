import { redirect, type RequestEvent } from '@sveltejs/kit';
import { validateSession } from './auth';

export async function requireAuth(event: RequestEvent) {
  const sessionToken = event.cookies.get('session');
  
  if (!sessionToken) {
    throw redirect(302, `/?redirectTo=${event.url.pathname}`);
  }
  
  const user = await validateSession(sessionToken);
  
  if (!user) {
    // Clear invalid session cookie
    event.cookies.set('session', '', {
      path: '/',
      expires: new Date(0),
    });
    throw redirect(302, `/?redirectTo=${event.url.pathname}`);
  }
  
  return user;
}
