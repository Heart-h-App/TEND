import { json } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';

export async function GET({ cookies }) {
  try {
    const sessionToken = cookies.get('session');
    
    if (!sessionToken) {
      return json({ authenticated: false }, { status: 401 });
    }
    
    const user = await validateSession(sessionToken);
    
    if (!user) {
      // Clear invalid session cookie
      cookies.set('session', '', {
        path: '/',
        expires: new Date(0),
      });
      return json({ authenticated: false }, { status: 401 });
    }

    return json({
      id: user.id,
      email: user.email,
      authenticated: true
    });
  } catch (error) {
    console.error('Session validation error:', error);
    return json({ error: 'Session validation failed', authenticated: false }, { status: 500 });
  }
}
