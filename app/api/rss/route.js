// app/api/rss/route.js
export const dynamic = 'force-dynamic';
import { prisma } from '../../../lib/prisma';
import { generateRSSFeed } from '../../../lib/rss';

export async function GET(req) {
  const reviews = await prisma.review.findMany({
    where: { published: true },
    include: { category: true },
    orderBy: { publishedAt: 'desc' },
    take: 50,
  });

  const siteUrl = process.env.SITE_URL || '';
  const feed = generateRSSFeed(reviews, siteUrl);

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');

  if (format === 'atom') {
    return new Response(feed.atom1(), {
      headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
    });
  }

  return new Response(feed.rss2(), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
