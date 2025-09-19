import { json } from '@sveltejs/kit';
import prisma from '$lib/server/db';

// Using imported prisma client from db.ts

export async function POST({ request }) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    // Try to create user, but fail gracefully if email already exists
    try {
      const user = await prisma.user.create({
        data: { email }
      });
      return json({ id: user.id, email: user.email });
    } catch (error: any) {
      // If unique constraint violation (email already exists), return success silently
      if (error.code === 'P2002') {
        return json({ message: 'User already exists' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error saving user:', error);
    return json({ error: 'Failed to save user' }, { status: 500 });
  }
}
