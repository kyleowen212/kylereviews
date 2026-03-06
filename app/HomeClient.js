'use client';
// app/HomeClient.js — v5: collapsible filters, ratings, truncated body, see more badge
import { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

function getRatingColor(rating) {
  if (rating >= 90) return 'bg-green-100 text-green-900';
  if (rating >= 75) return 'bg-green-50 text-green-800';
  if (rating >= 60) return 'bg-yellow-100 text-yellow-800';
  if (rating >= 40) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

// ─── Collapsible Filter Bar ───
function FilterBar({ categories, activeCategory, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const rowRef = useRef(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    if (el) setOverflows(el.scrollHeight > el.clientHeight + 4);
  }, [categories]);

  return (
    <div className="relative">
      <div ref={rowRef} className="flex flex-wrap gap-2 transition-all duration-300"
        style={{ maxHeight: expanded ? '500px' : '40px', overflow: 'hidden' }}>
        <button onClick={() => onSelect(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex-shrink-0 ${
            !activeCategory ? 'bg-accent text-white border-accent shadow-sm' : 'bg-white border-border hover:border-accent text-ink'
          }`}>
          All
        </button>
        {(categories || []).map((cat) => (
          <button key={cat.slug} onClick={() => onSelect(cat.slug === activeCategory ? null : cat.slug)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex-shrink-0 ${
              activeCategory === cat.slug ? 'bg-accent text-white border-accent shadow-sm' : 'bg-white border-border hover:border-accent text-ink'
            }`}>
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>
      {overflows && (
        <button onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-xs font-semibold text-accent hover:text-accent-light transition-colors">
          {expanded ? 'Show less ▲' : 'Show all categories ▼'}
        </button>
      )}
    </div>
  );
}

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
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md" style={{ borderBottom: '2px solid #2956a8' }}>
        <div className="max-w-6xl mx-auto px-4 py-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-3xl tracking-tight">kyle<span className="text-accent">.reviews</span></h1>
            <div className="flex items-center gap-5 text-sm">
              <a href="/suggest" className="text-muted hover:text-accent transition-colors font-medium">Suggest</a>
              <a href="/api/rss" className="flex items-center gap-1 text-muted hover:text-accent transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" />
                </svg>
                RSS
              </a>
            </div>
          </div>
          <FilterBar categories={categories} activeCategory={activeCategory} onSelect={setActiveCategory} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-10">
          <main className="flex-1 min-w-0 space-y-5">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-muted">
                <p className="font-display text-lg">No recommendations yet.</p>
                <p className="text-sm mt-1">Check back soon!</p>
              </div>
            ) : (
              filtered.map((review) => {
                const meta = typeof review.metadata === 'string' ? JSON.parse(review.metadata) : (review.metadata || {});
                return meta._postMode === 'full'
                  ? <FullPostCard key={review.id} review={review} meta={meta} />
                  : <QuickPostCard key={review.id} review={review} meta={meta} />;
              })
            )}
          </main>

          <aside className="hidden lg:block w-52 flex-shrink-0 space-y-8">
            <div className="bg-white rounded-xl border border-border p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent-light" />
              <p className="text-lg mb-2 mt-1">💡</p>
              <h3 className="font-display text-sm font-bold mb-1">Suggest something</h3>
              <p className="text-xs text-muted mb-3 leading-relaxed">Got a movie, book, album, or anything else I should check out?</p>
              <a href="/suggest" className="block text-center bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent-light transition-colors">Send a rec →</a>
            </div>
            {months.length > 0 && (
              <nav>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Timeline</p>
                <div className="relative pl-4 border-l-2 border-border">
                  {months.map((m) => (
                    <button key={m.key} onClick={() => document.getElementById(`review-${m.firstId}`)?.scrollIntoView({ behavior: 'smooth' })}
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

      <footer className="border-t border-border mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <span className="text-xs text-muted">© {new Date().getFullYear()} kyle.reviews</span>
          <span className="text-xs text-border">Built with care</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Quick Post Card ───
function QuickPostCard({ review, meta }) {
  const photos = typeof review.personalPhotos === 'string' ? JSON.parse(review.personalPhotos) : (review.personalPhotos || []);
  const metaEntries = Object.entries(meta).filter(([k, v]) => v && !k.startsWith('_'));
  const bodyText = (review.body || '').replace(/\r\n/g, '\n');
  const isLong = bodyText.length > 500;
  const badgeClass = `cat-badge-${review.category?.slug || ''}`;

  return (
    <article id={`review-${review.id}`} className="review-card bg-white rounded-xl border border-border overflow-hidden">
      <div className="flex gap-5 p-6">
        <div className="flex-shrink-0 w-28">
          {review.coverImage ? (
            <img src={review.coverImage} alt={review.title} className="w-full rounded-lg object-cover"
              style={{ aspectRatio: '2/3', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
              onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="w-full rounded-lg flex items-center justify-center bg-accent-wash" style={{ aspectRatio: '2/3' }}>
              <span className="text-3xl">{review.category?.icon}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>{review.category?.icon} {review.category?.name}</span>
            {review.rating != null && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getRatingColor(review.rating)}`}>{review.rating}</span>
            )}
            <span className="text-xs text-muted">{new Date(review.publishedAt || review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <a href={`/r/${review.slug}`}>
            <h2 className="font-display text-xl font-bold mb-2 hover:text-accent transition-colors leading-snug">{review.title}</h2>
          </a>
          {metaEntries.length > 0 && (
            <p className="text-sm text-muted mb-3">
              {metaEntries.map(([, v], i) => (<span key={i}>{v}{i < metaEntries.length - 1 && <span className="mx-1.5 text-border">·</span>}</span>))}
            </p>
          )}
          <div className="prose prose-sm max-w-none text-ink/80 leading-relaxed">
            {isLong ? (
              <ReactMarkdown components={{ p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p> }}>
                {bodyText.slice(0, 500).replace(/\s+\S*$/, '') + '...'}
              </ReactMarkdown>
            ) : (
              <ReactMarkdown components={{ p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p> }}>
                {bodyText}
              </ReactMarkdown>
            )}
          </div>
          {photos.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {photos.map((url, i) => (<img key={i} src={url} alt="" className="h-20 rounded-lg object-cover shadow-sm" />))}
            </div>
          )}
          {/* Inline embeds */}
          {review.embedUrl && review.embedType === 'youtube' && (
            <div className="mt-4 aspect-video rounded-lg overflow-hidden shadow-sm">
              <iframe src={review.embedUrl} className="w-full h-full" allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          )}
          {review.embedUrl && review.embedType === 'spotify' && (
            <div className="mt-4">
              <iframe src={review.embedUrl} width="100%" height="152" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="rounded-lg" />
            </div>
          )}
          {review.embedUrl && review.embedType === 'qobuz' && (
            <div className="mt-4">
              <iframe src={review.embedUrl} width="378" height="390" frameBorder="0"
                className="rounded-lg" allow="autoplay; encrypted-media" />
            </div>
          )}
          {review.embedUrl && review.embedType === 'apple-music' && (
            <div className="mt-4">
              <iframe src={review.embedUrl} width="100%" height="175" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="rounded-lg"
                sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" />
            </div>
          )}
          {isLong && (
            <a href={`/r/${review.slug}`}
              className="inline-block mt-3 text-xs bg-accent-wash text-accent px-2.5 py-1 rounded-lg font-medium hover:bg-accent/10 transition-colors">
              See more →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Full Post Card ───
function FullPostCard({ review, meta }) {
  const metaEntries = Object.entries(meta).filter(([k, v]) => v && !k.startsWith('_'));
  const badgeClass = `cat-badge-${review.category?.slug || ''}`;
  const bodyPreview = (review.body || '').split('\n').slice(0, 3).join('\n');
  const hasMore = (review.body || '').length > bodyPreview.length + 50;

  return (
    <article id={`review-${review.id}`} className="review-card bg-white rounded-xl border border-border overflow-hidden">
      {review.coverImage && (
        <a href={`/r/${review.slug}`}>
          <img src={review.coverImage} alt={review.title} className="w-full h-48 object-cover"
            onError={(e) => { e.target.style.display = 'none'; }} />
        </a>
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>{review.category?.icon} {review.category?.name}</span>
          <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">Article</span>
          {review.rating != null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getRatingColor(review.rating)}`}>{review.rating}</span>
          )}
          <span className="text-xs text-muted">{new Date(review.publishedAt || review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <a href={`/r/${review.slug}`}>
          <h2 className="font-display text-2xl font-bold mb-2 hover:text-accent transition-colors leading-snug">{review.title}</h2>
        </a>
        {metaEntries.length > 0 && (
          <p className="text-sm text-muted mb-3">
            {metaEntries.map(([, v], i) => (<span key={i}>{v}{i < metaEntries.length - 1 && <span className="mx-1.5 text-border">·</span>}</span>))}
          </p>
        )}
        <div className="prose prose-sm max-w-none text-ink/80 leading-relaxed">
          <ReactMarkdown
            components={{
              img: ({ src, alt }) => (
                <img src={src} alt={alt || ''} className="rounded-lg shadow-sm max-w-full my-2" style={{ maxHeight: '300px' }} />
              ),
            }}
          >
            {bodyPreview}
          </ReactMarkdown>
        </div>
        {/* Inline embeds */}
        {review.embedUrl && review.embedType === 'youtube' && (
          <div className="mt-4 aspect-video rounded-lg overflow-hidden shadow-sm">
            <iframe src={review.embedUrl} className="w-full h-full" allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
          </div>
        )}
        {review.embedUrl && review.embedType === 'spotify' && (
          <div className="mt-4">
            <iframe src={review.embedUrl} width="100%" height="152" frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="rounded-lg" />
          </div>
        )}
        {review.embedUrl && review.embedType === 'qobuz' && (
          <div className="mt-4">
            <iframe src={review.embedUrl} width="378" height="390" frameBorder="0"
              className="rounded-lg" allow="autoplay; encrypted-media" />
          </div>
        )}
        {review.embedUrl && review.embedType === 'apple-music' && (
          <div className="mt-4">
            <iframe src={review.embedUrl} width="100%" height="175" frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              className="rounded-lg"
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" />
          </div>
        )}
        {hasMore && (
          <a href={`/r/${review.slug}`}
            className="inline-block mt-3 text-accent text-sm font-medium hover:text-accent-light transition-colors">
            Continue reading →
          </a>
        )}
      </div>
    </article>
  );
}
