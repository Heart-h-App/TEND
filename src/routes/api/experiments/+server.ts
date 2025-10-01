import { json } from '@sveltejs/kit';
import prisma from '$lib/server/db';
import type { RequestHandler } from './$types';
import { validateUserAccess } from '$lib/server/apiAuth';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const ownerEmail = url.searchParams.get('ownerEmail');
  
  if (!ownerEmail) {
    return json({ error: 'ownerEmail parameter is required' }, { status: 400 });
  }
  
  try {
    // Validate user has access to this email
    await validateUserAccess(cookies, ownerEmail);
  } catch (error: any) {
    return json({ error: error.message || 'Authentication failed' }, { status: error.status || 401 });
  }

  try {
    const experiments = await prisma.experiment.findMany({
      where: {
        ownerEmail: ownerEmail
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return json(experiments);
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return json({ error: 'Failed to fetch experiments' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { ownerEmail, challenge, hypothesis, intervention, measure, learnings } = body;

    if (!ownerEmail || !challenge || !hypothesis || !intervention || !measure) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    try {
      // Validate user has access to this email
      await validateUserAccess(cookies, ownerEmail);
    } catch (error: any) {
      return json({ error: error.message || 'Authentication failed' }, { status: error.status || 401 });
    }

    const experiment = await prisma.experiment.create({
      data: {
        ownerEmail,
        challenge,
        hypothesis,
        intervention,
        measure,
        learnings: learnings || null
      }
    });

    return json(experiment);
  } catch (error) {
    console.error('Error creating experiment:', error);
    return json({ error: 'Failed to create experiment' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { experimentId, ownerEmail } = body;

    if (!experimentId || !ownerEmail) {
      return json({ error: 'Missing required fields: experimentId and ownerEmail' }, { status: 400 });
    }
    
    try {
      // Validate user has access to this email
      await validateUserAccess(cookies, ownerEmail);
    } catch (error: any) {
      return json({ error: error.message || 'Authentication failed' }, { status: error.status || 401 });
    }

    // Verify the experiment belongs to the user before deleting
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId }
    });

    if (!experiment) {
      return json({ error: 'Experiment not found' }, { status: 404 });
    }

    if (experiment.ownerEmail !== ownerEmail) {
      return json({ error: 'Unauthorized to delete this experiment' }, { status: 403 });
    }

    await prisma.experiment.delete({
      where: { id: experimentId }
    });

    return json({ success: true, message: 'Experiment deleted successfully' });
  } catch (error) {
    console.error('Error deleting experiment:', error);
    return json({ error: 'Failed to delete experiment' }, { status: 500 });
  }
};