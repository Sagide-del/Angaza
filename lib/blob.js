/* ============================================================
   File storage for PDFs, images, audio, and DIY (zip) kits.
   Priority order:
   - Supabase Storage (if SUPABASE_URL + SUPABASE_SERVICE_KEY set) -> public URLs.
   - Vercel Blob (if BLOB_READ_WRITE_TOKEN set)                    -> public URLs.
   - Locally / neither configured                                 -> public/assets/uploads/.

   Supabase uses the private *service role* key here, on the server only —
   never the public/anon key. That keeps uploads gated behind the existing
   ADMIN_KEY-protected routes instead of exposing a write-capable key to
   the browser.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  SUPABASE_BUCKET = 'content',
} = process.env;

const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const localDir = path.join(__dirname, '../public/assets/uploads');

const slug = (s) => String(s).toLowerCase().trim()
  .replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

// mimetype -> our format bucket
function formatFor(mime = '') {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('zip')) return 'diy';
  return 'file';
}

async function saveFile(originalName, buffer, contentType) {
  const name = slug(originalName || 'file');
  const unique = `${Date.now()}-${name}`;

  if (useSupabase) {
    const objectPath = `jua/${unique}`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`;
    await axios.post(uploadUrl, buffer, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': contentType || 'application/octet-stream',
        'x-upsert': 'true',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
  }

  if (useBlob) {
    const { put } = require('@vercel/blob');
    const res = await put(`jua/${unique}`, buffer, { access: 'public', contentType });
    return res.url;
  }

  fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, unique), buffer);
  return `/assets/uploads/${unique}`;
}

module.exports = { saveFile, formatFor, useBlob, useSupabase };
