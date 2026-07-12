/* ============================================================
   ANGAZA — Express app (shared by local server and Vercel function)
   ============================================================ */

const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const store = require('../lib/store');
const { saveFile, formatFor } = require('../lib/blob');
const { stkPush, isConfigured } = require('../lib/mpesa');
const { sendWhatsApp, sendDocument } = require('../lib/whatsapp');

const app = express();
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me';

app.use(cors());
app.use(express.json());
// Local dev serves the site; on Vercel the /public folder is served by the platform.
app.use(express.static(path.join(__dirname, '../public')));

/* ---------------------------------------------------------- uploads */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB (covers audio & DIY zips)
  fileFilter: (_req, file, cb) => {
    const ok = /pdf|image\/|audio\/|zip/.test(file.mimetype);
    cb(ok ? null : new Error('Allowed files: PDF, image, audio, or a ZIP for DIY kits.'), ok);
  },
});

const slug = (s) => String(s).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) return res.status(401).json({ error: 'Wrong admin key.' });
  next();
}

function buildProduct(body, files, existing = {}) {
  const isFree = body.isFree === 'true' || body.isFree === true;
  const featured = body.featured === 'true' || body.featured === true;
  const p = {
    ...existing,
    id: existing.id || slug(body.id || body.title),
    title: (body.title || existing.title || '').trim(),
    description: (body.description ?? existing.description ?? '').trim(),
    grade: body.grade || existing.grade || 'all',
    type: body.type || existing.type || 'worksheet',   // this is the CATEGORY
    isFree,
    featured,
    price: isFree ? 0 : Number(body.price || existing.price || 0),
    format: existing.format || 'pdf',
  };
  const oldPrice = Number(body.oldPrice || 0);
  if (!isFree && oldPrice > p.price) p.oldPrice = oldPrice; else delete p.oldPrice;

  const main = files?.file?.[0];
  const cover = files?.cover?.[0];
  if (main) { p.fileUrl = null; }  // set below after upload
  p.createdAt = existing.createdAt || new Date().toISOString();
  return { p, main, cover };
}

/* ---------------------------------------------------------- public catalogue */
app.get('/api/products', async (_req, res) => res.json(await store.getProducts()));

app.get('/api/products/:id', async (req, res) => {
  const p = (await store.getProducts()).find(x => x.id === req.params.id);
  return p ? res.json(p) : res.status(404).json({ error: 'Product not found' });
});

app.get('/api/freebies/:id', async (req, res) => {
  const p = (await store.getProducts()).find(x => x.id === req.params.id && x.isFree);
  return p ? res.json({ success: true, url: p.fileUrl || p.pdfUrl }) : res.status(404).json({ error: 'Freebie not found' });
});

/* ---------------------------------------------------------- checkout */
app.post('/api/checkout', async (req, res) => {
  const { name, phone, email, amount, items, mode, mpesaCode } = req.body || {};
  if (!name || !phone || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ success: false, error: 'Missing name, phone, or items.' });
  }
  const total = items.reduce((s, i) => s + Number(i.price || 0), 0);
  const reference = 'ANGAZA-' + Date.now().toString().slice(-6);

  // MANUAL: personal M-Pesa. Log the order + notify the owner. Delivery is done by hand.
  if (mode === 'manual' || !isConfigured()) {
    const order = {
      id: reference, name, phone, email: email || null, items, amount: amount || total,
      mpesaCode: mpesaCode || null, status: 'pending_verification',
      mpesa: { mode: 'manual' }, createdAt: new Date().toISOString(),
    };
    await store.addOrder(order);
    const owner = process.env.OWNER_PHONE;
    if (owner) {
      const list = items.map(i => `• ${i.title} (KES ${i.price})`).join('\n');
      await sendWhatsApp({ phone: owner,
        message: `*New Angaza order ${reference}*\n${name} · ${phone}\nM-Pesa code: ${mpesaCode || '—'}\n${list}\nTotal: KES ${amount || total}\n\nVerify the payment, then send the file(s).` });
    }
    return res.json({ success: true, reference, mode: 'manual' });
  }

  // STK: registered Paybill/Till via Daraja.
  try {
    const push = await stkPush({ phone, amount: amount || total, reference, description: 'Angaza activities' });
    const order = {
      id: reference, name, phone, email: email || null, items, amount: amount || total,
      status: push.ok ? 'awaiting_payment' : 'failed',
      mpesa: { mode: 'stk', checkoutRequestId: push.checkoutRequestId || null },
      createdAt: new Date().toISOString(),
    };
    await store.addOrder(order);
    return res.json({ success: push.ok, reference, message: push.message });
  } catch (e) {
    console.error('Checkout error:', e.response?.data || e.message);
    return res.status(502).json({ success: false, error: 'Could not reach M-Pesa. Please try WhatsApp checkout.' });
  }
});

app.post('/api/mpesa/callback', async (req, res) => {
  res.sendStatus(200);
  const cb = req.body?.Body?.stkCallback;
  if (cb?.ResultCode === 0) {
    // TODO: match cb.CheckoutRequestID to a saved order, mark paid, then deliver().
    console.log('Payment confirmed:', cb.CheckoutRequestID);
  }
});

async function deliver(order) {
  const products = await store.getProducts();
  const items = order.items.map(i => products.find(p => p.id === i.id)).filter(Boolean);

  // Intro message, then the actual file(s) as document attachments — not links.
  await sendWhatsApp({ phone: order.phone,
    message: `*Angaza — Bright Minds. Brighter Futures.*\n\nHello ${order.name}, your order is ready. Your file${items.length > 1 ? 's are' : ' is'} attached below.\nPrint on A4 and enjoy learning together. Reply here if you need anything.` });

  for (const p of items) {
    const url = p.fileUrl || p.pdfUrl;
    if (!url) continue;
    const ext = (url.split('.').pop() || 'pdf').split('?')[0];
    await sendDocument({ phone: order.phone, fileUrl: url,
      filename: `${p.title}.${ext}`, caption: p.title });
  }
  await store.updateOrder(order.id, { status: 'delivered', deliveredAt: new Date().toISOString() });
}

/* ---------------------------------------------------------- admin */
app.post('/api/admin/login', requireAdmin, (_req, res) => res.json({ success: true }));

app.get('/api/admin/summary', requireAdmin, async (_req, res) => {
  const products = await store.getProducts();
  const orders = await store.getOrders();

  const revenue = orders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const counts = {};
  orders.forEach(o => (o.items || []).forEach(i => { counts[i.title] = (counts[i.title] || 0) + 1; }));
  const bestSellers = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([title, n]) => ({ title, n }));

  res.json({
    products,
    orders: orders.slice().reverse(),
    storage: {
      catalogue: store.useKV ? 'Vercel KV' : 'local JSON',
      files: require('../lib/blob').useSupabase ? 'Supabase Storage'
           : require('../lib/blob').useBlob ? 'Vercel Blob' : 'local disk',
    },
    stats: {
      total: products.length,
      paid: products.filter(p => !p.isFree).length,
      free: products.filter(p => p.isFree).length,
      orders: orders.length,
      revenue,
      pending: orders.filter(o => o.status === 'pending_verification' || o.status === 'awaiting_payment').length,
    },
    bestSellers,
  });
});

// Update an order's status (e.g. mark delivered / paid)
app.post('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  const status = req.body?.status;
  const allowed = ['pending_verification', 'paid', 'delivered', 'failed', 'refunded'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const patch = { status };
  if (status === 'delivered') patch.deliveredAt = new Date().toISOString();
  const updated = await store.updateOrder(req.params.id, patch);
  return updated ? res.json({ success: true, order: updated }) : res.status(404).json({ error: 'Order not found.' });
});

// Fetch the actual file(s) for an order so the owner can forward them (manual mode)
app.get('/api/admin/orders/:id/files', requireAdmin, async (req, res) => {
  const orders = await store.getOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const products = await store.getProducts();
  const files = (order.items || []).map(i => {
    const p = products.find(x => x.id === i.id);
    return { title: i.title, url: p?.fileUrl || p?.pdfUrl || null };
  });
  res.json({ files });
});

const uploadFields = upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]);

app.post('/api/admin/products', requireAdmin, uploadFields, async (req, res) => {
  try {
    if (!req.body.title) return res.status(400).json({ error: 'A title is required.' });
    const products = await store.getProducts();
    const { p, main, cover } = buildProduct(req.body, req.files);
    if (products.find(x => x.id === p.id)) return res.status(409).json({ error: `An activity called "${p.title}" already exists.` });

    if (main) { p.fileUrl = await saveFile(main.originalname, main.buffer, main.mimetype); p.format = formatFor(main.mimetype); }
    if (cover) p.preview = await saveFile(cover.originalname, cover.buffer, cover.mimetype);
    else if (p.format === 'image') p.preview = p.fileUrl;

    products.push(p);
    await store.setProducts(products);
    res.json({ success: true, product: p });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/admin/products/:id', requireAdmin, uploadFields, async (req, res) => {
  try {
    const products = await store.getProducts();
    const i = products.findIndex(x => x.id === req.params.id);
    if (i === -1) return res.status(404).json({ error: 'Activity not found.' });
    const { p, main, cover } = buildProduct(req.body, req.files, products[i]);
    p.id = req.params.id;
    if (main) { p.fileUrl = await saveFile(main.originalname, main.buffer, main.mimetype); p.format = formatFor(main.mimetype); }
    else p.fileUrl = products[i].fileUrl || products[i].pdfUrl || null;
    if (cover) p.preview = await saveFile(cover.originalname, cover.buffer, cover.mimetype);
    else if (p.format === 'image' && main) p.preview = p.fileUrl;
    products[i] = p;
    await store.setProducts(products);
    res.json({ success: true, product: p });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  const products = await store.getProducts();
  const next = products.filter(x => x.id !== req.params.id);
  if (next.length === products.length) return res.status(404).json({ error: 'Activity not found.' });
  await store.setProducts(next);
  res.json({ success: true });
});

app.use((err, _req, res, _next) => { if (err) res.status(400).json({ error: err.message }); });

module.exports = { app, isConfigured };
