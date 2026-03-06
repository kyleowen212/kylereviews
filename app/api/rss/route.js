// app/api/rss/route.js
export const dynamic = 'force-dynamic';
import { prisma } from '../../../lib/prisma';

function escapeXml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const siteUrl = process.env.SITE_URL || 'https://kyle.reviews';

  let reviews = [];
  try {
    reviews = await prisma.review.findMany({
      where: { published: true },
      include: { category: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
  } catch (err) {
    console.error('RSS fetch error:', err);
  }

  const items = reviews.map((review) => {
    const meta = typeof review.metadata === 'string' ? JSON.parse(review.metadata) : (review.metadata || {});
    const metaEntries = Object.entries(meta).filter(([k, v]) => v && !k.startsWith('_'));
    const metaStr = metaEntries.map(([, v]) => v).join(' · ');
    const pubDate = new Date(review.publishedAt || review.createdAt).toUTCString();
    const link = `${siteUrl}/r/${review.slug}`;

    return `    <item>
      <title>${escapeXml((review.category?.icon || '') + ' ' + review.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(metaStr || review.title)}</description>
      ${review.body ? `<content:encoded><![CDATA[${review.body}]]></content:encoded>` : ''}
      ${review.category ? `<category>${escapeXml(review.category.name)}</category>` : ''}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>kyle.reviews</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>Personal recommendations — movies, books, albums, and more.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(siteUrl + '/api/rss')}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
