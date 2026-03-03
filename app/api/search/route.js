// app/api/search/route.js
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { searchExternal, getExternalDetails } from '../../../lib/external-apis';

// GET: Search external databases (admin only)
export async function GET(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
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
