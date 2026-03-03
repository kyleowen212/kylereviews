// app/page.js
// Public home page: "Kyle.Reviews" with filterable feed + timeline
import { prisma } from '../lib/prisma';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

async function getReviews() {
  const reviews = await prisma.review.findMany({
    where: { published: true },
    include: { category: true },
    orderBy: { publishedAt: 'desc' },
  });
  return reviews.map((r) => ({
    ...r,
    metadata: JSON.parse(r.metadata || '{}'),
    personalPhotos: JSON.parse(r.personalPhotos || '[]'),
    publishedAt: r.publishedAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

async function getCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
}

export default async function HomePage() {
  const [reviews, categories] = await Promise.all([getReviews(), getCategories()]);

  return <HomeClient reviews={reviews} categories={categories} />;
}
