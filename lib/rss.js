// lib/rss.js
const { Feed } = require('feed');

function generateRSSFeed(reviews, siteUrl = 'http://localhost:3000') {
  const feed = new Feed({
    title: 'Kyle.Reviews',
    description: 'Recommendations for movies, books, music, and more.',
    id: siteUrl,
    link: siteUrl,
    language: 'en',
    updated: reviews[0]?.publishedAt || new Date(),
    generator: 'Kyle.Reviews',
    feedLinks: {
      rss2: `${siteUrl}/api/rss`,
      atom: `${siteUrl}/api/rss?format=atom`,
    },
  });

  for (const review of reviews) {
    const metadata = JSON.parse(review.metadata || '{}');
    const metaHtml = Object.entries(metadata)
      .filter(([, v]) => v)
      .map(([k, v]) => `<strong>${k}:</strong> ${v}`)
      .join(' · ');

    const imageHtml = review.coverImage
      ? `<img src="${review.coverImage}" alt="${review.title}" style="max-width:300px;float:right;margin:0 0 16px 16px;" />`
      : '';

    feed.addItem({
      title: `${review.category?.icon || ''} ${review.title}`,
      id: `${siteUrl}/r/${review.slug}`,
      link: `${siteUrl}/r/${review.slug}`,
      description: review.body.slice(0, 200),
      content: `
        ${imageHtml}
        <p><em>${review.category?.name || ''}</em>${metaHtml ? ' · ' + metaHtml : ''}</p>
        ${review.body.split('\n').map((p) => `<p>${p}</p>`).join('')}
      `.trim(),
      date: review.publishedAt || review.createdAt,
      category: review.category ? [{ name: review.category.name }] : [],
    });
  }

  return feed;
}

module.exports = { generateRSSFeed };
