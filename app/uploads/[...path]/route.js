// app/uploads/[...path]/route.js
// Serves uploaded files from the persistent volume at /data/uploads
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = '/data/uploads';

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

export async function GET(req, { params }) {
  try {
    const filePath = Array.isArray(params.path) ? params.path.join('/') : params.path;

    // Prevent directory traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(UPLOAD_DIR, safePath);

    if (!fullPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check file exists
    await stat(fullPath);

    const buffer = await readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
