import { json, error } from '@sveltejs/kit';
import prisma from '$lib/server/db';
import { validateUserAccess } from '$lib/server/apiAuth';

// Map UI string -> enum
const toEnum = (s: string) => (s === 'on track' ? 'on_track' : 'strained');
const fromEnum = (s: string) => (s === 'on_track' ? 'on track' : 'strained');

// POST /api/relationships  { ownerEmail, name, description, status, details }
export async function POST({ request, cookies }) {
  const body = await request.json();

  const ownerEmail = body?.ownerEmail?.trim().toLowerCase();
  const { name, description, status, details } = body ?? {};

  if (!ownerEmail || !name || !description || !status || !details) {
    throw error(400, 'Missing required fields');
  }
  
  // Validate user has access to this email
  await validateUserAccess(cookies, ownerEmail);

  // optional de-dupe (comment out if not desired)
  // const existing = await prisma.relationship.findFirst({ where: { ownerEmail, name } });
  // if (existing) return json({ error: 'Already exists', id: existing.id }, { status: 409 });

  const created = await prisma.relationship.create({
    data: {
      ownerEmail,
      name,
      description,
      status: toEnum(status), // "on_track" | "strained"
      details                  // { "+": "...", "∆": "...", "→": "..." }
    }
  });

  return json(created, { status: 201 });
}

// GET /api/relationships?ownerEmail=you@example.com
export async function GET({ url, cookies }) {
  const ownerEmail = url.searchParams.get('ownerEmail')?.trim().toLowerCase();
  if (!ownerEmail) throw error(400, 'ownerEmail required');
  
  // Validate user has access to this email
  await validateUserAccess(cookies, ownerEmail);

  const rows = await prisma.relationship.findMany({
    where: { ownerEmail },
    orderBy: { createdAt: 'desc' }
  });

  // Map enum back to UI string
  const out = rows.map((r: any) => ({
    id: r.id,
    ownerEmail: r.ownerEmail,
    name: r.name,
    description: r.description,
    status: fromEnum(r.status),
    details: r.details,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }));

  return json(out);
}
