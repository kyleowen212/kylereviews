// app/api/backup/route.js
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { requireAuth } from '../../../lib/auth';

export async function GET(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [reviews, categories, suggestions, admin] = await Promise.all([
      prisma.review.findMany({ include: { category: true }, orderBy: { createdAt: 'desc' } }),
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.suggestion.findMany({ include: { category: true }, orderBy: { createdAt: 'desc' } }),
      prisma.admin.findMany({ select: { id: true, username: true, createdAt: true } }), // exclude password hash
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      stats: {
        reviews: reviews.length,
        categories: categories.length,
        suggestions: suggestions.length,
      },
      categories,
      reviews: reviews.map((r) => ({
        ...r,
        // Parse JSON fields for readability
        metadata: JSON.parse(r.metadata || '{}'),
        personalPhotos: JSON.parse(r.personalPhotos || '[]'),
      })),
      suggestions,
      admins: admin,
    };

    const json = JSON.stringify(backup, null, 2);
    const filename = `kyle-reviews-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Backup error:', err);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
