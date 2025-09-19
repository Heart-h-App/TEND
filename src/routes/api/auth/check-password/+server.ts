import { json } from '@sveltejs/kit';
import { userHasPassword } from '$lib/server/auth';

export async function POST({ request }) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    const hasPassword = await userHasPassword(email);
    
    return json({ hasPassword });
  } catch (error) {
    console.error('Password check error:', error);
    return json({ error: 'Password check failed' }, { status: 500 });
  }
}
