import { json } from '@sveltejs/kit';
import { authenticateUser, createSession } from '$lib/server/auth';

export async function POST({ request, cookies }) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await authenticateUser(email, password);
    
    if (!user) {
      return json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Create a session
    const session = await createSession(user.id);
    
    // Set session cookie
    cookies.set('session', session.token, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return json({
      id: user.id,
      email: user.email,
      authenticated: true
    });
  } catch (error) {
    console.error('Login error:', error);
    return json({ error: 'Authentication failed' }, { status: 500 });
  }
}
