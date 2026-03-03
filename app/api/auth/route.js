// app/api/auth/route.js
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { verifyLogin, requireAuth } from '../../../lib/auth';

export async function POST(req) {
  const { username, password } = await req.json();
  const token = await verifyLogin(username, password);

  if (!token) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete('admin_token');
  return res;
}

export async function GET(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, username: user.username });
}
