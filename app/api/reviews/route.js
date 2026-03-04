// app/api/reviews/route.js
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { requireAuth } from '../../../lib/auth';
import { uniqueSlug } from '../../../lib/utils';

export async function GET(req) {
  const user = requireAuth(req);
  const { searchParams } = new URL(req.url);
  const includeUnpublished = searchParams.get('all') === 'true' && user;

  const reviews = await prisma.review.findMany({
    where: includeUnpublished ? {} : { published: true },
    include: { category: true, suggestion: true },
    orderBy: { publishedAt: 'desc' },
  });

  return NextResponse.json(reviews);
}

export async function POST(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();

  // Support backdating: if publishedAt is provided, use it; otherwise use now
  let publishedAt = null;
  if (data.published) {
    publishedAt = data.publishedAt ? new Date(data.publishedAt) : new Date();
  }

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
      publishedAt,
      suggestionId: data.suggestionId || null,
    },
    include: { category: true },
  });

  if (data.suggestionId) {
    await prisma.suggestion.update({
      where: { id: data.suggestionId },
      data: { status: 'accepted' },
    });
  }

  return NextResponse.json(review);
}

export async function PUT(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await req.json();
  const { id, ...updateData } = data;

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const update = {};
  if (updateData.title !== undefined) update.title = updateData.title;
  if (updateData.body !== undefined) update.body = updateData.body;
  if (updateData.categoryId !== undefined) update.categoryId = updateData.categoryId;
  if (updateData.metadata !== undefined) update.metadata = JSON.stringify(updateData.metadata);
  if (updateData.coverImage !== undefined) update.coverImage = updateData.coverImage;
  if (updateData.personalPhotos !== undefined) update.personalPhotos = JSON.stringify(updateData.personalPhotos);
  if (updateData.embedUrl !== undefined) update.embedUrl = updateData.embedUrl;
  if (updateData.embedType !== undefined) update.embedType = updateData.embedType;
  if (updateData.publishedAt !== undefined) update.publishedAt = updateData.publishedAt ? new Date(updateData.publishedAt) : null;
  if (updateData.published !== undefined) {
    update.published = updateData.published;
    // Only auto-set publishedAt if publishing for the first time and no explicit date
    if (updateData.published && !updateData.publishedAt && !update.publishedAt) {
      const existing = await prisma.review.findUnique({ where: { id } });
      if (!existing.publishedAt) update.publishedAt = new Date();
    }
  }

  const review = await prisma.review.update({
    where: { id },
    data: update,
    include: { category: true },
  });

  return NextResponse.json(review);
}

export async function DELETE(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
