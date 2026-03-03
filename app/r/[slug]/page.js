// app/r/[slug]/page.js
// Individual review detail page
import { prisma } from '../../../lib/prisma';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const review = await prisma.review.findUnique({
    where: { slug: params.slug },
    include: { category: true },
  });
  if (!review) return { title: 'Not Found' };
  return {
    title: `${review.title} — Kyle.Reviews`,
    description: review.body.slice(0, 160),
  };
}

export default async function ReviewPage({ params }) {
  const review = await prisma.review.findUnique({
    where: { slug: params.slug },
    include: { category: true },
  });

  if (!review || !review.published) notFound();

  const metadata = JSON.parse(review.metadata || '{}');
  const metaEntries = Object.entries(metadata).filter(([, v]) => v);
  const personalPhotos = JSON.parse(review.personalPhotos || '[]');

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <a href="/" className="font-display text-xl text-ink hover:text-accent transition-colors">
            Kyle.Reviews
          </a>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-4">
          <span>{review.category?.icon}</span>
          <span className="text-sm font-medium text-muted uppercase tracking-wide">
            {review.category?.name}
          </span>
          <span className="text-sm text-muted">
            ·{' '}
            {new Date(review.publishedAt || review.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <h1 className="font-display text-4xl md:text-5xl mb-6">{review.title}</h1>

        {/* Cover + metadata row */}
        <div className="flex gap-6 mb-8">
          {review.coverImage && (
            <img
              src={review.coverImage}
              alt={review.title}
              className="w-40 rounded-lg shadow-md object-cover"
            />
          )}
          {metaEntries.length > 0 && (
            <div className="space-y-2">
              {metaEntries.map(([key, value]) => (
                <div key={key}>
                  <span className="text-sm font-medium text-muted uppercase tracking-wide">
                    {key}
                  </span>
                  <p className="text-ink">{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Review body */}
        <div className="text-lg leading-relaxed whitespace-pre-line mb-8">{review.body}</div>

        {/* Embedded media */}
        {review.embedUrl && review.embedType === 'youtube' && (
          <div className="embed-container mb-8">
            <iframe
              src={review.embedUrl}
              title={`${review.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {review.embedUrl && (review.embedType === 'qobuz' || review.embedType === 'spotify') && (
          <div className="embed-music mb-8">
            <iframe
              src={review.embedUrl}
              title={`${review.title} player`}
              allow="autoplay; encrypted-media"
            />
          </div>
        )}

        {/* Personal photos */}
        {personalPhotos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {personalPhotos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`Photo ${i + 1}`}
                className="w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        {/* Suggestion credit */}
        {review.suggestionId && (
          <p className="text-sm text-muted italic border-t border-border pt-4">
            This was suggested by a reader. Thanks for the recommendation!
          </p>
        )}
      </article>
    </div>
  );
}
