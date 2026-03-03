// app/api/reviews/route.js
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { requireAuth } from '../../../lib/auth';
import { uniqueSlug } from '../../../lib/utils';

// GET: List reviews (public: published only, admin: all)
export async function GET(req) {
  const user = requireAuth(req);
  const { searchParams } = new URL(req.url);
  const includeUnpublished = searchParams.get('all') === 'true' && user;

  const reviews = await prisma.review.findMany({
    where: includeUnpublished ? {} : { published: true },
    include: { category: true, suggestion: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(reviews);
}

// POST: Create new review (admin only)
export async function POST(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();

  const review = await prisma.review.create({
    data: {
      title: data.title,
      slug: uniqueSlug(data.title),
      categoryId: data.categoryId,
      body: data.body || '',
      metadata: JSON.stringify(data.metadata || {}),
      coverImage: data.coverImage || null,
      personalPhotos: JSON.stringify(data.personalPhotos || []),
      embedUrl: data.embedUrl || null,
      embedType: data.embedType || null,
      published: data.published || false,
      publishedAt: data.published ? new Date() : null,
      suggestionId: data.suggestionId || null,
    },
    include: { category: true },
  });

  // If promoting a suggestion, update its status
  if (data.suggestionId) {
    await prisma.suggestion.update({
      where: { id: data.suggestionId },
      data: { status: 'accepted' },
    });
  }

  return NextResponse.json(review);
}

// PUT: Update review (admin only)
export async function PUT(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  const { id, ...updateData } = data;

  const update = {};
  if (updateData.title !== undefined) update.title = updateData.title;
  if (updateData.body !== undefined) update.body = updateData.body;
  if (updateData.categoryId !== undefined) update.categoryId = updateData.categoryId;
  if (updateData.metadata !== undefined) update.metadata = JSON.stringify(updateData.metadata);
  if (updateData.coverImage !== undefined) update.coverImage = updateData.coverImage;
  if (updateData.personalPhotos !== undefined) update.personalPhotos = JSON.stringify(updateData.personalPhotos);
  if (updateData.embedUrl !== undefined) update.embedUrl = updateData.embedUrl;
  if (updateData.embedType !== undefined) update.embedType = updateData.embedType;
  if (updateData.published !== undefined) {
    update.published = updateData.published;
    if (updateData.published) update.publishedAt = new Date();
  }

  const review = await prisma.review.update({
    where: { id },
    data: update,
    include: { category: true },
  });

  return NextResponse.json(review);
}

// DELETE: Delete review (admin only)
export async function DELETE(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
