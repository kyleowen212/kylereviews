// lib/rss.js
const { Feed } = require('feed');

function generateRSSFeed(reviews, siteUrl = '') {
  const feed = new Feed({
    title: 'kyle.reviews',
    description: 'Personal recommendations — movies, books, albums, and more.',
    id: siteUrl || 'https://kyle.reviews',
    link: siteUrl || 'https://kyle.reviews',
    language: 'en',
    copyright: `© ${new Date().getFullYear()} kyle.reviews`,
  });

  for (const review of reviews) {
    const meta = typeof review.metadata === 'string' ? JSON.parse(review.metadata) : (review.metadata || {});
    const metaStr = Object.entries(meta).filter(([, v]) => v).map(([, v]) => v).join(' · ');

    feed.addItem({
      title: `${review.category?.icon || ''} ${review.title}`,
      id: `${siteUrl}/r/${review.slug}`,
      link: `${siteUrl}/r/${review.slug}`,
      description: metaStr || review.title,
      content: review.body || '',
      date: new Date(review.publishedAt || review.createdAt),
      image: review.coverImage || undefined,
    });
  }

  return feed;
}

module.exports = { generateRSSFeed };
