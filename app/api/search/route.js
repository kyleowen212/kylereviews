// app/api/search/route.js
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { searchExternal, getExternalDetails, getTMDBSeasonDetails, getTMDBImages } from '../../../lib/external-apis';

export async function GET(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // Fetch season-specific details for a TV show
  if (action === 'season') {
    const tmdbId = searchParams.get('tmdbId');
    const season = searchParams.get('season');
    if (!tmdbId || !season) return NextResponse.json({ error: 'tmdbId and season required' }, { status: 400 });
    const details = await getTMDBSeasonDetails(tmdbId, season);
    return NextResponse.json(details || { error: 'Not found' });
  }

  // Fetch available backdrop images for a movie or TV show
  if (action === 'images') {
    const tmdbId = searchParams.get('tmdbId');
    const type = searchParams.get('type') || 'movie';
    if (!tmdbId) return NextResponse.json({ error: 'tmdbId required' }, { status: 400 });
    const images = await getTMDBImages(tmdbId, type);
    return NextResponse.json(images);
  }

  const query = searchParams.get('q');
  const category = searchParams.get('category');
  const externalId = searchParams.get('id');

  // If an ID is provided, get full details
  if (externalId && category) {
    const details = await getExternalDetails(externalId, category);
    return NextResponse.json(details || { error: 'Not found' });
  }

  // Otherwise, search
  if (!query || !category) {
    return NextResponse.json({ error: 'Query and category required' }, { status: 400 });
  }

  const results = await searchExternal(query, category);
  return NextResponse.json(results);
}
