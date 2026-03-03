// app/api/suggestions/route.js
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { requireAuth } from '../../../lib/auth';

// GET: List suggestions (admin only)
export async function GET(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const suggestions = await prisma.suggestion.findMany({
    include: { category: true, review: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(suggestions);
}

// POST: Submit a suggestion (public)
export async function POST(req) {
  const data = await req.json();

  if (!data.name || !data.itemTitle) {
    return NextResponse.json({ error: 'Name and item title required' }, { status: 400 });
  }

  const suggestion = await prisma.suggestion.create({
    data: {
      name: data.name.slice(0, 100),
      itemTitle: data.itemTitle.slice(0, 200),
      categoryId: data.categoryId || null,
      message: (data.message || '').slice(0, 1000),
    },
  });

  return NextResponse.json(suggestion);
}

// PUT: Update suggestion status (admin only)
export async function PUT(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await req.json();
  const suggestion = await prisma.suggestion.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(suggestion);
}
