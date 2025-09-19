import { json } from '@sveltejs/kit';
import { createOrUpdateUserWithPassword, createSession } from '$lib/server/auth';

export async function POST({ request, cookies }) {
  try {
    const { email, password, confirmPassword } = await request.json();
    
    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return json({ error: 'Passwords do not match' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Create or update user with password
    const user = await createOrUpdateUserWithPassword(email, password);
    
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
    console.error('Registration error:', error);
    return json({ error: 'Registration failed' }, { status: 500 });
  }
}
