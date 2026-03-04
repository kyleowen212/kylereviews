// app/api/upload/route.js
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Uploads go to /data/uploads (persistent volume).
// The Dockerfile symlinks /app/public/uploads -> /data/uploads so Next.js can serve them.
const UPLOAD_DIR = '/data/uploads';

export async function POST(req) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = path.extname(file.name) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Write file
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
