// app/r/[slug]/page.js
import { prisma } from '../../../lib/prisma';
import { notFound } from 'next/navigation';
import ReviewDetail from './ReviewDetail';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }) {
  const review = await prisma.review.findFirst({
    where: { slug: params.slug, published: true },
    include: { category: true },
  });

  if (!review) return notFound();

  // Serialize for client component
  const data = {
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    publishedAt: review.publishedAt?.toISOString() || null,
  };

  return <ReviewDetail review={data} />;
}
