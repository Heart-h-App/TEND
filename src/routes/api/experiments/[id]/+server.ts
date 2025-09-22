import { json } from '@sveltejs/kit';
import prisma from '$lib/server/db';
import { validateUserAccess } from '$lib/server/apiAuth';

export const PATCH = async ({ params, request, cookies }: any) => {
  const { id } = params;
  
  if (!id) {
    return json({ error: 'Experiment ID is required' }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const { rating } = body;
    
    // Validate rating is between 1-5
    if (rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating))) {
      return json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }
    
    // Get the experiment to check ownership
    const existingExperiment = await prisma.experiment.findUnique({
      where: { id }
    });
    
    if (!existingExperiment) {
      return json({ error: 'Experiment not found' }, { status: 404 });
    }
    
    // Validate user has access to this experiment
    try {
      await validateUserAccess(cookies, existingExperiment.ownerEmail);
    } catch (error: any) {
      return json({ error: error.message || 'Authentication failed' }, { status: error.status || 401 });
    }
    
    // Update the experiment with the new rating
    const updatedExperiment = await prisma.experiment.update({
      where: { id },
      data: { rating }
    });
    
    return json(updatedExperiment);
  } catch (error) {
    return json({ error: 'Failed to update experiment rating' }, { status: 500 });
  }
};
