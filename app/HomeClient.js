'use client';
// app/HomeClient.js — Public feed with design refresh
import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

export default function HomeClient({ reviews: initialReviews, categories }) {
  const [activeCategory, setActiveCategory] = useState(null);

  const reviews = initialReviews || [];
  const filtered = activeCategory
    ? reviews.filter((r) => r.category?.slug === activeCategory)
    : reviews;

  const months = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const date = new Date(r.publishedAt || r.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!map.has(key)) map.set(key, { key, label, firstId: r.id });
    }
    return Array.from(map.values());
  }, [filtered]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md" style={{ borderBottom: '2px solid #2956a8' }}>
        <div className="max-w-6xl mx-auto px-4 py-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-1">
              <h1 className="font-display text-2xl tracking-tight">kyle<span className="text-accent">.reviews</span></h1>
            </div>
            <div className="flex items-center gap-5 text-sm">
              <a href="/suggest" className="text-muted hover:text-accent transition-colors font-medium">
                Suggest
              </a>
              <a href="/api/rss" className="flex items-center gap-1 text-muted hover:text-accent transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />
                </svg>
                RSS
              </a>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                !activeCategory
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-white border-border hover:border-accent text-ink'
              }`}
            >
              All
            </button>
            {(categories || []).map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug === activeCategory ? null : cat.slug)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  activeCategory === cat.slug
                    ? 'bg-accent text-white border-accent shadow-sm'
                    : 'bg-white border-border hover:border-accent text-ink'
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
        <div className="flex gap-10">
          {/* Feed */}
          <main className="flex-1 min-w-0 space-y-5">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted">
                <p className="font-display text-lg">No recommendations yet.</p>
                <p className="text-sm mt-1">Check back soon!</p>
              </div>
            ) : (
              filtered.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            )}
          </main>

          {/* Sidebar */}
          <aside className="hidden lg:block w-52 flex-shrink-0 space-y-8">
            {/* Suggest card */}
            <div className="bg-white rounded-xl border border-border p-5 relative overflow-hidden">
              {/* Subtle green accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent-light" />
              <p className="text-lg mb-2 mt-1">💡</p>
              <h3 className="font-display text-sm font-bold mb-1">Suggest something</h3>
              <p className="text-xs text-muted mb-3 leading-relaxed">Got a movie, book, album, or anything else I should check out?</p>
              <a href="/suggest"
                className="block text-center bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-light transition-colors">
                Send a rec →
              </a>
            </div>

            {/* Timeline */}
            {months.length > 0 && (
              <nav>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Timeline</p>
                <div className="relative pl-4 border-l-2 border-border">
                  {months.map((m) => (
                    <button key={m.key}
                      onClick={() => document.getElementById(`review-${m.firstId}`)?.scrollIntoView({ behavior: 'smooth' })}
                      className="block w-full text-left mb-3 relative group">
                      <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-border group-hover:bg-accent transition-colors" />
                      <span className="text-sm text-ink/70 group-hover:text-accent transition-colors">{m.label}</span>
                    </button>
                  ))}
                </div>
              </nav>
            )}
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <span className="text-xs text-muted">© {new Date().getFullYear()} kyle.reviews</span>
          <span className="text-xs text-border">Built with care</span>
        </div>
      </footer>
    </div>
  );
}

function ReviewCard({ review }) {
  const meta = typeof review.metadata === 'string' ? JSON.parse(review.metadata) : (review.metadata || {});
  const photos = typeof review.personalPhotos === 'string' ? JSON.parse(review.personalPhotos) : (review.personalPhotos || []);
  const metaEntries = Object.entries(meta).filter(([, v]) => v);
  const [expanded, setExpanded] = useState(false);
  const isLong = (review.body || '').length > 400;

  const catSlug = review.category?.slug || '';
  const badgeClass = `cat-badge-${catSlug}`;

  return (
    <article id={`review-${review.id}`}
      className="review-card bg-white rounded-xl border border-border overflow-hidden">
      <div className="flex gap-5 p-6">
        {/* Cover */}
        <div className="flex-shrink-0 w-28">
          {review.coverImage ? (
            <img src={review.coverImage} alt={review.title}
              className="w-full rounded-lg object-cover"
              style={{ aspectRatio: '2/3', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
              onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="w-full rounded-lg flex items-center justify-center bg-accent-wash"
              style={{ aspectRatio: '2/3' }}>
              <span className="text-3xl">{review.category?.icon}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Category + date */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
              {review.category?.icon} {review.category?.name}
            </span>
            <span className="text-xs text-muted">
              {new Date(review.publishedAt || review.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>

          {/* Title */}
          <a href={`/r/${review.slug}`}>
            <h2 className="font-display text-xl font-bold mb-2 hover:text-accent transition-colors leading-snug">
              {review.title}
            </h2>
          </a>

          {/* Metadata */}
          {metaEntries.length > 0 && (
            <p className="text-sm text-muted mb-3">
              {metaEntries.map(([, v], i) => (
                <span key={i}>
                  {v}{i < metaEntries.length - 1 && <span className="mx-1.5 text-border">·</span>}
                </span>
              ))}
            </p>
          )}

          {/* Body */}
          <div className="prose prose-sm max-w-none text-ink/80 leading-relaxed">
            {isLong && !expanded ? (
              <>
                <ReactMarkdown>{(review.body || '').slice(0, 400) + '...'}</ReactMarkdown>
                <button onClick={() => setExpanded(true)}
                  className="text-accent text-sm font-medium mt-1 hover:text-accent-light transition-colors">
                  Read more →
                </button>
              </>
            ) : (
              <ReactMarkdown>{review.body || ''}</ReactMarkdown>
            )}
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {photos.map((url, i) => (
                <img key={i} src={url} alt="" className="h-20 rounded-lg object-cover shadow-sm" />
              ))}
            </div>
          )}

          {/* Embed badge */}
          {review.embedType && (
            <span className="inline-block mt-3 text-xs bg-accent-wash text-accent px-2.5 py-1 rounded-lg font-medium">
              {review.embedType === 'youtube' && '▶ Trailer available'}
              {review.embedType === 'spotify' && '♫ Listen on Spotify'}
              {review.embedType === 'qobuz' && '♫ Listen on Qobuz'}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
