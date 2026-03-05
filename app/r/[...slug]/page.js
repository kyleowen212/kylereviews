// app/r/[...slug]/page.js
import { prisma } from '../../../lib/prisma';
import { notFound } from 'next/navigation';
import ReviewDetail from './ReviewDetail';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }) {
  // params.slug is an array like ['movie', '2025', 'dune-part-two']
  const slugPath = Array.isArray(params.slug) ? params.slug.join('/') : params.slug;

  const review = await prisma.review.findFirst({
    where: { slug: slugPath, published: true },
    include: { category: true },
  });

  // Also try matching old-style slugs for backwards compatibility
  if (!review) {
    const oldReview = await prisma.review.findFirst({
      where: { slug: slugPath, published: true },
      include: { category: true },
    });
    if (!oldReview) return notFound();
  }

  if (!review) return notFound();

  const data = {
    ...review,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
    publishedAt: review.publishedAt?.toISOString() || null,
  };

  return <ReviewDetail review={data} />;
}
