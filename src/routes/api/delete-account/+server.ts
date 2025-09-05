import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE({ request }) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    const deletedRelationships = await prisma.relationship.deleteMany({
      where: { ownerEmail: email }
    });
    const deletedNorthStars = await prisma.northStar.deleteMany({
      where: { ownerEmail: email }
    });
    const deletedExperiments = await prisma.experiment.deleteMany({
      where: { ownerEmail: email }
    });
    const deletedUsers = await prisma.user.deleteMany({
      where: { email: email }
    });

    return json({ message: 'Account and all associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    return json({ error: `Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
