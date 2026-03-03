'use client';
// app/HomeClient.js
// Interactive home page with category filters and timeline sidebar
import { useState, useMemo, useRef } from 'react';

// ─────────────────────────────────────────────
// Embed Component
// ─────────────────────────────────────────────
function MediaEmbed({ embedUrl, embedType, title }) {
  if (!embedUrl) return null;

  if (embedType === 'youtube') {
    return (
      <div className="embed-container mt-4 rounded-lg overflow-hidden">
        <iframe
          src={embedUrl}
          title={`${title} trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (embedType === 'qobuz' || embedType === 'spotify') {
    return (
      <div className="embed-music mt-4 rounded-lg overflow-hidden">
        <iframe src={embedUrl} title={`${title} player`} allow="autoplay; encrypted-media" />
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────
// Review Card
// ─────────────────────────────────────────────
function ReviewCard({ review }) {
  const meta = review.metadata || {};
  const metaEntries = Object.entries(meta).filter(([, v]) => v);

  return (
    <article className="review-card bg-white rounded-xl border border-border p-6 mb-6" id={`review-${review.id}`}>
      <div className="flex gap-5">
        {/* Cover image */}
        {review.coverImage && (
          <div className="flex-shrink-0 w-28 md:w-36">
            <img
              src={review.coverImage}
              alt={review.title}
              className="w-full rounded-lg shadow-sm object-cover"
              style={{ aspectRatio: review.category?.slug === 'book' ? '2/3' : '2/3' }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Category badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{review.category?.icon}</span>
            <span className="text-xs font-medium text-muted uppercase tracking-wide">
              {review.category?.name}
            </span>
            <span className="text-xs text-muted">
              ·{' '}
              {new Date(review.publishedAt || review.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Title */}
          <h2 className="font-display text-xl md:text-2xl mb-2">
            <a href={`/r/${review.slug}`} className="hover:text-accent transition-colors">
              {review.title}
            </a>
          </h2>

          {/* Metadata pills */}
          {metaEntries.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted mb-3">
              {metaEntries.map(([key, value]) => (
                <span key={key}>
                  <span className="font-medium text-ink/60">{key}:</span> {value}
                </span>
              ))}
            </div>
          )}

          {/* Review body */}
          <div className="text-[15px] leading-relaxed text-ink/80 whitespace-pre-line">
            {review.body}
          </div>

          {/* Personal photos */}
          {review.personalPhotos?.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {review.personalPhotos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`Photo ${i + 1}`}
                  className="h-24 rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Embedded media (full width below the card content) */}
      <MediaEmbed embedUrl={review.embedUrl} embedType={review.embedType} title={review.title} />
    </article>
  );
}

// ─────────────────────────────────────────────
// Timeline Sidebar
// ─────────────────────────────────────────────
function Timeline({ reviews, onScrollTo }) {
  // Group reviews by month/year
  const months = useMemo(() => {
    const map = new Map();
    for (const review of reviews) {
      const date = new Date(review.publishedAt || review.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!map.has(key)) {
        map.set(key, { key, label, count: 0, firstReviewId: review.id });
      }
      map.get(key).count++;
    }
    return Array.from(map.values());
  }, [reviews]);

  return (
    <nav className="sticky top-8">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Timeline</h3>
      <div className="relative pl-4 border-l-2 border-border">
        {months.map((month) => (
          <button
            key={month.key}
            onClick={() => onScrollTo(month.firstReviewId)}
            className="block w-full text-left mb-3 group relative"
          >
            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-border group-hover:bg-accent transition-colors" />
            <span className="text-sm font-medium text-ink/70 group-hover:text-accent transition-colors">
              {month.label}
            </span>
            <span className="text-xs text-muted ml-1">({month.count})</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────
export default function HomeClient({ reviews, categories }) {
  const [activeCategory, setActiveCategory] = useState(null);

  const filtered = activeCategory
    ? reviews.filter((r) => r.category?.slug === activeCategory)
    : reviews;

  const handleScrollTo = (reviewId) => {
    const el = document.getElementById(`review-${reviewId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-baseline justify-between mb-4">
            <h1 className="font-display text-3xl md:text-4xl text-ink">Kyle.Reviews</h1>
            <div className="flex items-center gap-4 text-sm text-muted">
              <a href="/suggest" className="hover:text-accent transition-colors">
                Suggest something
              </a>
              <a
                href="/api/rss"
                className="hover:text-accent transition-colors"
                title="RSS Feed"
              >
                RSS
              </a>
            </div>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`filter-pill px-3 py-1.5 rounded-full text-sm border border-border ${
                !activeCategory ? 'active' : 'bg-white text-ink/70'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug === activeCategory ? null : cat.slug)}
                className={`filter-pill px-3 py-1.5 rounded-full text-sm border border-border ${
                  activeCategory === cat.slug ? 'active' : 'bg-white text-ink/70'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Feed */}
          <main className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted">
                <p className="text-lg">No recommendations yet.</p>
                <p className="text-sm mt-1">Check back soon!</p>
              </div>
            ) : (
              filtered.map((review) => <ReviewCard key={review.id} review={review} />)
            )}
          </main>

          {/* Timeline sidebar (hidden on mobile) */}
          <aside className="hidden lg:block w-48 flex-shrink-0">
            <Timeline reviews={filtered} onScrollTo={handleScrollTo} />
          </aside>
        </div>
      </div>
    </div>
  );
}
