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

// DELETE /api/relationships  { ownerEmail, name, description }
export async function DELETE({ request, cookies }) {
  const body = await request.json();

  const ownerEmail = body?.ownerEmail?.trim().toLowerCase();
  const { name, description } = body ?? {};

  if (!ownerEmail || !name || !description) {
    throw error(400, 'Missing required fields: ownerEmail, name, and description');
  }
  
  // Validate user has access to this email
  await validateUserAccess(cookies, ownerEmail);

  // Find and delete the relationship
  const relationship = await prisma.relationship.findFirst({
    where: {
      ownerEmail,
      name,
      description
    }
  });

  if (!relationship) {
    throw error(404, 'Relationship not found');
  }

  await prisma.relationship.delete({
    where: { id: relationship.id }
  });

  return json({ success: true, message: 'Relationship deleted successfully' });
}

// PATCH /api/relationships  { ownerEmail, oldName, oldDescription, name?, description?, status?, details? }
export async function PATCH({ request, cookies }) {
  const body = await request.json();

  const ownerEmail = body?.ownerEmail?.trim().toLowerCase();
  const { oldName, oldDescription, name, description, status, details } = body ?? {};

  if (!ownerEmail || !oldName || !oldDescription) {
    throw error(400, 'Missing required fields: ownerEmail, oldName, and oldDescription');
  }
  
  // Validate user has access to this email
  await validateUserAccess(cookies, ownerEmail);

  // Find the relationship
  const relationship = await prisma.relationship.findFirst({
    where: {
      ownerEmail,
      name: oldName,
      description: oldDescription
    }
  });

  if (!relationship) {
    throw error(404, 'Relationship not found');
  }

  // Build update data
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = toEnum(status);
  if (details !== undefined) updateData.details = details;

  // Update the relationship
  const updated = await prisma.relationship.update({
    where: { id: relationship.id },
    data: updateData
  });

  // Map enum back to UI string
  const result = {
    id: updated.id,
    ownerEmail: updated.ownerEmail,
    name: updated.name,
    description: updated.description,
    status: fromEnum(updated.status),
    details: updated.details,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt
  };

  return json(result);
}
