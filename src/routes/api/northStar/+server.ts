import { json, error } from '@sveltejs/kit';
import prisma from '$lib/server/db';
import { validateUserAccess } from '$lib/server/apiAuth';

// POST /api/northStar  { ownerEmail, haiku, north, east, south, west }
export async function POST({ request, cookies }) {
  const body = await request.json();

  const ownerEmail = body?.ownerEmail?.trim().toLowerCase();
  const { haiku, north, east, south, west } = body ?? {};

  if (!ownerEmail || !haiku || !north || !east || !south || !west) {
    throw error(400, 'Missing required fields');
  }
  
  // Validate user has access to this email
  await validateUserAccess(cookies, ownerEmail);

  // Upsert: update if exists, create if not (since ownerEmail is unique)
  const upserted = await prisma.northStar.upsert({
    where: { ownerEmail },
    update: {
      haiku,
      north,
      east,
      south,
      west,
      metaVersion: { increment: 1 }
    },
    create: {
      ownerEmail,
      haiku,
      north,
      east,
      south,
      west,
      metaVersion: 1
    }
  });

  return json(upserted, { status: 201 });
}

// GET /api/northStar?ownerEmail=you@example.com
export async function GET({ url, cookies }) {
  const ownerEmail = url.searchParams.get('ownerEmail')?.trim().toLowerCase();
  if (!ownerEmail) throw error(400, 'ownerEmail required');
  
  // Validate user has access to this email
  await validateUserAccess(cookies, ownerEmail);

  const northStar = await prisma.northStar.findUnique({
    where: { ownerEmail }
  });

  // Return array format to match your frontend expectation (data.length > 0)
  return json(northStar ? [northStar] : []);
}