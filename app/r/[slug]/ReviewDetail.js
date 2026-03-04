'use client';
// app/r/[slug]/ReviewDetail.js
import ReactMarkdown from 'react-markdown';

export default function ReviewDetail({ review }) {
  const meta = typeof review.metadata === 'string' ? JSON.parse(review.metadata) : (review.metadata || {});
  const photos = typeof review.personalPhotos === 'string' ? JSON.parse(review.personalPhotos) : (review.personalPhotos || []);
  const metaEntries = Object.entries(meta).filter(([, v]) => v);
  const catSlug = review.category?.slug || '';

  return (
    <div className="min-h-screen bg-paper">
      <header style={{ borderBottom: '2px solid #2956a8' }} className="bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <a href="/" className="font-display text-xl text-ink hover:text-accent transition-colors">
            kyle<span className="text-accent">.reviews</span>
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-4">
          <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full cat-badge-${catSlug}`}>
            {review.category?.icon} {review.category?.name}
          </span>
          <span className="text-sm text-muted">
            {new Date(review.publishedAt || review.createdAt).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
          </span>
        </div>

        <h1 className="font-display text-4xl font-bold mb-4 leading-tight">{review.title}</h1>

        {metaEntries.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {metaEntries.map(([key, value]) => (
              <span key={key} className="text-sm bg-gray-100 px-3 py-1 rounded-lg text-ink/70">
                {value}
              </span>
            ))}
          </div>
        )}

        {review.coverImage && (
          <div className="mb-8">
            <img src={review.coverImage} alt={review.title}
              className="w-48 rounded-xl"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}

        <div className="prose prose-lg max-w-none mb-8">
          <ReactMarkdown>{review.body || ''}</ReactMarkdown>
        </div>

        {photos.length > 0 && (
          <div className="mb-8">
            <h3 className="font-display text-lg mb-3">Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((url, i) => (
                <img key={i} src={url} alt="" className="rounded-xl object-cover w-full aspect-square shadow-sm" />
              ))}
            </div>
          </div>
        )}

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

        <div className="pt-8 border-t border-border">
          <a href="/" className="text-accent hover:text-accent-light text-sm font-medium transition-colors">
            ← Back to all recommendations
          </a>
        </div>
      </main>
    </div>
  );
}
