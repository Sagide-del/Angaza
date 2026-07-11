/* ============================================================
   File storage for PDFs, images, audio, and DIY (zip) kits.
   - On Vercel with Blob enabled -> Vercel Blob (public URLs).
   - Locally / no Blob           -> public/assets/uploads/.
   ============================================================ */

const fs = require('fs');
const path = require('path');

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
  if (useBlob) {
    const { put } = require('@vercel/blob');
    const res = await put(`jua/${Date.now()}-${name}`, buffer, { access: 'public', contentType });
    return res.url;
  }
  fs.mkdirSync(localDir, { recursive: true });
  const unique = `${Date.now()}-${name}`;
  fs.writeFileSync(path.join(localDir, unique), buffer);
  return `/assets/uploads/${unique}`;
}

module.exports = { saveFile, formatFor, useBlob };
