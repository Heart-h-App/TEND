import { json } from '@sveltejs/kit';
import { invalidateSession } from '$lib/server/auth';

export async function POST({ cookies }) {
  try {
    const sessionToken = cookies.get('session');
    
    if (sessionToken) {
      await invalidateSession(sessionToken);
    }
    
    // Clear the session cookie
    cookies.set('session', '', {
      path: '/',
      expires: new Date(0),
    });

    return json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return json({ error: 'Logout failed' }, { status: 500 });
  }
}
