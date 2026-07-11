/* Local development server. On Vercel, api/index.js is used instead. */
require('dotenv').config();
const { app, isConfigured } = require('./app');
const store = require('../lib/store');
const { useBlob } = require('../lib/blob');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const key = process.env.ADMIN_KEY || 'change-me';
  const keyStatus = key === 'change-me'
    ? 'change-me (default — set ADMIN_KEY in .env)'
    : `custom, ${key.length} chars, starts with "${key.slice(0, 3)}…" (loaded from .env)`;
  console.log(`
  Angaza
  ─────────────────────────────
  URL:        http://localhost:${PORT}
  Catalogue:  ${store.useKV ? 'Vercel KV' : 'local JSON (dev)'}
  Files:      ${useBlob ? 'Vercel Blob' : 'local disk (dev)'}
  M-Pesa:     ${isConfigured() ? 'live (Daraja)' : 'sandbox-log'}
  Admin key:  ${keyStatus}
  Admin:      http://localhost:${PORT}/admin.html
  `);
});
