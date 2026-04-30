'use client';
// app/r/[...slug]/ReviewDetail.js — v6: spoilers, article banners, captions
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function getRatingColor(rating) {
  if (rating >= 90) return 'bg-green-100 text-green-900';
  if (rating >= 75) return 'bg-green-50 text-green-800';
  if (rating >= 60) return 'bg-yellow-100 text-yellow-800';
  if (rating >= 40) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

// ─── Spoiler Support ───
function SpoilerText({ children }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span onClick={() => setRevealed(!revealed)}
      className={`cursor-pointer rounded px-0.5 transition-all duration-200 ${revealed ? 'bg-transparent' : 'bg-ink/80 text-transparent select-none hover:bg-ink/60'}`}
      title={revealed ? 'Click to hide' : 'Click to reveal spoiler'}>
      {children}
    </span>
  );
}

function processSpoilers(text) {
  return (text || '').replace(/\|\|(.+?)\|\|/g, '%%SPOILER_START%%$1%%SPOILER_END%%');
}

function renderSpoilerChildren(children) {
  if (typeof children === 'string') {
    const parts = children.split(/(%%SPOILER_START%%.*?%%SPOILER_END%%)/g);
    if (parts.length === 1) return children;
    return parts.map((part, i) => {
      const match = part.match(/%%SPOILER_START%%(.+?)%%SPOILER_END%%/);
      if (match) return <SpoilerText key={i}>{match[1]}</SpoilerText>;
      return part;
    });
  }
  if (Array.isArray(children)) {
    return children.map((child) => {
      if (typeof child === 'string') return renderSpoilerChildren(child);
      return child;
    });
  }
  return children;
}

export default function ReviewDetail({ review }) {
  const meta = typeof review.metadata === 'string' ? JSON.parse(review.metadata) : (review.metadata || {});
  const photos = typeof review.personalPhotos === 'string' ? JSON.parse(review.personalPhotos) : (review.personalPhotos || []);
  const metaEntries = Object.entries(meta).filter(([k, v]) => v && !k.startsWith('_'));
  const catSlug = review.category?.slug || '';
  const isFullPost = meta._postMode === 'full';

  const processedBody = processSpoilers(
    (review.body || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n')
  );

  // Determine cover display mode:
  // - Articles (full posts): always full-width banner
  // - Movies/TV with backdrop: full-width banner
  // - Everything else: floated left
  const hasBackdrop = !!meta._backdrop;
  const showBanner = isFullPost || hasBackdrop;
  const bannerSrc = hasBackdrop ? meta._backdrop : review.coverImage;

  return (
    <div className="min-h-screen bg-paper">
      <header style={{ borderBottom: '2px solid #2956a8' }} className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <a href="/" className="font-display text-2xl text-ink hover:text-accent transition-colors">
            kyle<span className="text-accent">.reviews</span>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {/* Full-width banner for articles and movies/TV with backdrops */}
          {showBanner && bannerSrc && (
            <img src={bannerSrc} alt={review.title}
              className="w-full object-cover"
              style={{ maxHeight: '400px' }}
              onError={(e) => { e.target.style.display = 'none'; }} />
          )}

          <div className="p-8 md:p-10">
            {/* Category + date */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full cat-badge-${catSlug}`}>
                {review.category?.icon} {review.category?.name}
              </span>
              {isFullPost && <span className="text-xs bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">Article</span>}
              {review.rating != null && (
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${getRatingColor(review.rating)}`}>{review.rating}<span className="font-normal text-xs opacity-70">/100</span></span>
              )}
              <span className="text-sm text-muted">
                {new Date(review.publishedAt || review.createdAt).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl font-bold mb-4 leading-tight">{review.title}</h1>

            {/* Metadata */}
            {metaEntries.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {metaEntries.map(([key, value]) => (
                  <span key={key} className="text-sm bg-gray-100 px-3 py-1 rounded-lg text-ink/70">{value}</span>
                ))}
              </div>
            )}

            {/* Floated cover image — only for non-banner posts */}
            {!showBanner && review.coverImage && (
              <div className="mb-2">
                <img src={review.coverImage} alt={review.title}
                  className="rounded-xl float-left mr-6 mb-4"
                  style={{ width: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            )}

            {/* Body */}
            <div className="prose prose-lg max-w-none mb-8">
              <ReactMarkdown
                components={{
                  img: ({ src, alt }) => (
                    <figure className="my-6">
                      <img src={src} alt={alt || ''}
                        className="rounded-xl shadow-sm max-w-full"
                        style={{ maxHeight: '600px' }} />
                      {alt && <figcaption className="text-center text-sm text-muted mt-2">{alt}</figcaption>}
                    </figure>
                  ),
                  h2: ({ children }) => (
                    <h2 className="font-display text-2xl font-bold mt-8 mb-3">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="font-display text-xl font-bold mt-6 mb-2">{children}</h3>
                  ),
                  hr: () => (
                    <hr className="my-8 border-border" />
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-accent underline decoration-accent-wash underline-offset-2 hover:decoration-accent" target="_blank" rel="noopener noreferrer">{children}</a>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed">{renderSpoilerChildren(children)}</p>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-accent pl-4 my-6 italic text-ink/70">{children}</blockquote>
                  ),
                }}
              >
                {processedBody}
              </ReactMarkdown>
            </div>

            {/* Clear float */}
            <div style={{ clear: 'both' }} />

            {/* Gallery photos with captions (quick posts only) */}
            {!isFullPost && photos.length > 0 && (
              <div className="mb-8">
                <h3 className="font-display text-lg mb-3">Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo, i) => {
                    const url = typeof photo === 'string' ? photo : photo.url;
                    const caption = typeof photo === 'object' ? photo.caption : null;
                    return (
                      <figure key={i}>
                        <img src={url} alt={caption || ''} className="rounded-xl object-cover w-full aspect-square shadow-sm" />
                        {caption && <figcaption className="text-center text-xs text-muted mt-1">{caption}</figcaption>}
                      </figure>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Embeds */}
            {review.embedUrl && review.embedType === 'youtube' && (
              <div className="mb-8 aspect-video rounded-xl overflow-hidden shadow-sm">
                <iframe src={review.embedUrl} className="w-full h-full" allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            )}
            {review.embedUrl && review.embedType === 'spotify' && (
              <div className="mb-8">
                <iframe src={review.embedUrl} width="100%" height="352" frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  className="rounded-xl" />
              </div>
            )}
            {review.embedUrl && review.embedType === 'qobuz' && (
              <div className="mb-8">
                <iframe src={review.embedUrl} width="378" height="390" frameBorder="0"
                  className="rounded-xl" allow="autoplay; encrypted-media" />
              </div>
            )}
            {review.embedUrl && review.embedType === 'apple-music' && (
              <div className="mb-8">
                <iframe src={review.embedUrl} width="100%" height="450" frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  className="rounded-xl"
                  sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation" />
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        <div className="pt-6">
          <a href="/" className="text-accent hover:text-accent-light text-sm font-medium transition-colors">
            ← Back to all recommendations
          </a>
        </div>
      </main>
    </div>
  );
}
