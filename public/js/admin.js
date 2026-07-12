/* ============================================================
   ANGAZA — Admin panel logic
   ============================================================ */

const API = '';
const KEY_STORE = 'jua_admin_key';

const LEVELS = [
  ['pp1','Pre-Primary 1'], ['pp2','Pre-Primary 2'],
  ['grade1','Grade 1'], ['grade2','Grade 2'], ['grade3','Grade 3'],
  ['grade4','Grade 4'], ['grade5','Grade 5'], ['grade6','Grade 6'], ['all','All levels'],
];
const TYPES = [
  ['workbook','Workbook','ic-book','#F4A623'],
  ['worksheet','Worksheet','ic-pencil','#2FAE66'],
  ['coloring','Colouring','ic-palette','#FF6B4A'],
  ['story','Story','ic-story','#7A5CD0'],
  ['flashcards','Flashcards','ic-flash','#12A5A0'],
  ['poster','Poster','ic-globe','#E5397E'],
  ['revision','Revision Question','ic-quiz','#E67E22'],
  ['audio','Audio lesson','ic-audio','#3A7BD5'],
  ['diy','DIY Package (legacy)','ic-diy','#E67E22'],
];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = (n) => `KES ${Number(n).toLocaleString('en-KE')}`;
const levelName = (id) => (LEVELS.find(l => l[0] === id)?.[1]) || id;
const typeMeta = (id) => TYPES.find(t => t[0] === id) || ['','', 'ic-book', '#F4A623'];
const coverGrad = (id) => {
  const map = { workbook:['#F4A623','#FF8C42'], coloring:['#FF6B4A','#FF9A6C'], worksheet:['#2FAE66','#5FD08A'], story:['#7A5CD0','#9E86E0'], poster:['#E5397E','#F26AA0'], flashcards:['#12A5A0','#3FC7C2'], audio:['#3A7BD5','#6FA8E8'], revision:['#E67E22','#F0A15A'], diy:['#E67E22','#F0A15A'] };
  const [a,b] = map[id] || ['#F4A623','#FF8C42'];
  return `linear-gradient(135deg,${a},${b})`;
};

let adminKey = sessionStorage.getItem(KEY_STORE) || '';
let products = [];
let orders = [];
let editingId = null;
let waConnected = false;

/* ---------------------------------------------------------- PDF -> cover image
   Parents should only ever see a cover thumbnail on the site, never the full
   PDF, before they pay. We render page 1 of any uploaded PDF to a PNG right
   here in the browser (via pdf.js from a CDN) and upload that as the cover —
   the actual PDF is only ever handed over after checkout / free-download. */
const PDFJS_VERSION = '4.0.269';
const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;
let _pdfjsLibPromise = null;
function getPdfjs() {
  if (!_pdfjsLibPromise) {
    _pdfjsLibPromise = import(`${PDFJS_BASE}/pdf.min.mjs`).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;
      return lib;
    });
  }
  return _pdfjsLibPromise;
}
const isPdf = (file) => file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''));

async function pdfCoverFile(file) {
  try {
    const pdfjsLib = await getPdfjs();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 900 / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
    if (!blob) return null;
    const name = (file.name || 'activity').replace(/\.[^./]+$/, '');
    return new File([blob], `${name}-cover.png`, { type: 'image/png' });
  } catch (e) {
    console.error('PDF cover generation failed:', e);
    return null;
  }
}

/* ---------------------------------------------------------- api */
async function api(path, { method = 'GET', body, isForm } = {}) {
  const headers = { 'x-admin-key': adminKey };
  if (!isForm) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method, headers, body: isForm ? body : (body ? JSON.stringify(body) : undefined),
    });
  } catch (netErr) {
    throw new Error('Could not reach the server. Is it running? (' + netErr.message + ')');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

/* ---------------------------------------------------------- auth */
async function tryLogin(key) {
  adminKey = key;
  await api('/api/admin/login', { method: 'POST' });
  sessionStorage.setItem(KEY_STORE, key);
  showDash();
}

function showDash() {
  $('#login').hidden = true;
  $('#dash').hidden = false;
  $('#envBadge').textContent = 'Signed in';
  loadSummary();
}
function showLogin() {
  sessionStorage.removeItem(KEY_STORE);
  adminKey = '';
  $('#dash').hidden = true;
  $('#login').hidden = false;
}

$('#loginBtn').addEventListener('click', doLogin);
$('#key').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
async function doLogin() {
  const key = $('#key').value.trim();
  $('#loginErr').textContent = '';
  if (!key) return;
  try { await tryLogin(key); }
  catch (e) { $('#loginErr').textContent = e.message; }
}
$('#logout').addEventListener('click', showLogin);

/* ---------------------------------------------------------- data */
async function loadSummary() {
  let data;
  try {
    data = await api('/api/admin/summary');
  } catch (e) {
    console.error('Failed to load admin summary:', e);
    return;
  }
  products = data.products;
  orders = data.orders || [];
  const st = data.storage;
  waConnected = st?.whatsapp === 'Connected';
  if (st) {
    const warn = st.files === 'local disk';
    const waWarn = !waConnected;
    $('#envBadge').textContent = `Files: ${st.files}${warn ? ' ⚠' : ''} · Catalogue: ${st.catalogue} · WhatsApp: ${st.whatsapp}${waWarn ? ' ⚠' : ''}`;
    $('#envBadge').title = [
      warn ? 'Uploads will fail on Vercel — connect Supabase/Blob env vars and redeploy.' : '',
      waWarn ? 'No WhatsApp Business API connected — "Send files" will not reach customers until you set WHATSAPP_PROVIDER (meta/twilio) and its keys, then redeploy. Use the WhatsApp button to deliver by hand until then.' : '',
    ].filter(Boolean).join(' ');
  }
  const s = data.stats;
  $('#sRevenue').textContent = money(s.revenue || 0);
  $('#sOrders').textContent = s.orders;
  $('#sPending').textContent = s.pending || 0;
  $('#sTotal').textContent = s.total;
  const badge = $('#ordersBadge');
  if (s.pending) { badge.hidden = false; badge.textContent = s.pending; } else { badge.hidden = true; }
  renderList();
  renderOrders();
  renderBestSellers(data.bestSellers || []);
}

/* ---------------------------------------------------------- view tabs */
$$('.view-tab').forEach(t => t.addEventListener('click', () => {
  $$('.view-tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  const v = t.dataset.view;
  $('#activitiesView').hidden = v !== 'activities';
  $('#ordersView').hidden = v !== 'orders';
}));

/* ---------------------------------------------------------- orders */
const STATUS = {
  pending_verification: { label: 'To fulfil', cls: 'pending' },
  awaiting_payment:     { label: 'Awaiting', cls: 'pending' },
  paid:                 { label: 'Paid', cls: 'paid' },
  delivered:            { label: 'Delivered', cls: 'delivered' },
  failed:               { label: 'Failed', cls: 'failed' },
  test_paid:            { label: 'Test', cls: 'paid' },
};

$('#orderSearch')?.addEventListener('input', renderOrders);

function renderOrders() {
  const wrap = $('#orderList');
  const q = ($('#orderSearch')?.value || '').trim().toLowerCase();
  const list = orders.filter(o => !q ||
    (`${o.name} ${o.phone} ${o.mpesaCode || ''}`).toLowerCase().includes(q));

  if (!list.length) {
    wrap.innerHTML = `<div class="list-empty">No orders yet. They'll appear here the moment a parent checks out.</div>`;
    return;
  }
  wrap.innerHTML = list.map(o => {
    const st = STATUS[o.status] || { label: o.status, cls: 'pending' };
    const items = (o.items || []).map(i => i.title).join(', ');
    const wa = `https://wa.me/${(o.phone || '').replace(/\D/g, '').replace(/^0/, '254')}?text=${encodeURIComponent('Habari ' + o.name + '! Here are your Angaza files. Asante!')}`;
    const sendLabel = waConnected ? 'Send files' : 'Send files ⚠';
    return `
      <div class="order-row" data-id="${o.id}">
        <div class="order-main">
          <div class="order-top">
            <b>${o.name}</b>
            <span class="status ${st.cls}">${st.label}</span>
          </div>
          <div class="order-meta">${o.phone} · ${money(o.amount || 0)} · code ${o.mpesaCode || '—'}</div>
          <div class="order-items">${items}</div>
          <div class="order-files" id="files-${o.id}"></div>
        </div>
        <div class="order-acts">
          <button class="mini" data-files="${o.id}">Get files</button>
          <a class="mini" href="${wa}" target="_blank" rel="noopener" title="Open a manual WhatsApp chat — you'll need to attach files yourself">Chat</a>
          ${o.status !== 'delivered' ? `<button class="mini${waConnected ? ' done' : ''}" data-deliver="${o.id}" title="${waConnected ? 'Sends the actual files as WhatsApp attachments automatically' : 'WhatsApp Business API not connected yet — see the banner above'}">${sendLabel}</button>` : ''}
        </div>
      </div>`;
  }).join('');

  $$('[data-files]', wrap).forEach(b => b.addEventListener('click', () => showFiles(b.dataset.files)));
  $$('[data-deliver]', wrap).forEach(b => b.addEventListener('click', () => sendOrderFiles(b.dataset.deliver, b)));
}

async function sendOrderFiles(id, btn) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    await api(`/api/admin/orders/${id}/deliver`, { method: 'POST' });
    toast('Files sent on WhatsApp');
    await loadSummary();
  } catch (e) {
    toast(e.message);
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function showFiles(id) {
  const box = $(`#files-${id}`);
  box.innerHTML = '<span style="font-size:12.5px;color:var(--muted)">Loading…</span>';
  try {
    const { files } = await api(`/api/admin/orders/${id}/files`);
    box.innerHTML = files.map(f => f.url
      ? `<a class="file-dl" href="${f.url}" download target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#ic-download"/></svg> ${f.title}</a>`
      : `<span class="file-dl missing">${f.title} — no file</span>`).join('');
  } catch (e) { box.innerHTML = `<span style="color:var(--coral)">${e.message}</span>`; }
}

async function setStatus(id, status) {
  try {
    await api(`/api/admin/orders/${id}/status`, { method: 'POST', body: { status } });
    toast('Order marked ' + status);
    await loadSummary();
    $$('.view-tab').forEach(x => x.classList.toggle('active', x.dataset.view === 'orders'));
    $('#activitiesView').hidden = true; $('#ordersView').hidden = false;
  } catch (e) { toast(e.message); }
}

function renderBestSellers(list) {
  const box = $('#bestSellers');
  if (!list.length) { box.innerHTML = `<p style="color:var(--muted);font-size:14px">No sales yet.</p>`; return; }
  box.innerHTML = list.map((b, i) => `
    <div class="bs-row"><span class="bs-rank">${i + 1}</span><span class="bs-title">${b.title}</span><span class="bs-n">${b.n}</span></div>`).join('');
}

/* ---------------------------------------------------------- form setup */
$('#fGrade').innerHTML = LEVELS.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
$('#fType').innerHTML = TYPES.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
$('#bGrade').innerHTML = LEVELS.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');
$('#bType').innerHTML = TYPES.map(([v,l]) => `<option value="${v}">${l}</option>`).join('');

$('#fFree').addEventListener('change', (e) => { $('#priceRow').style.display = e.target.checked ? 'none' : 'grid'; });
$('#fFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  $('#dropText').innerHTML = f ? `<span class="name">${f.name}</span>` : 'Tap to choose the activity file';
  if (f && isPdf(f) && !$('#fCover').files.length) {
    $('#coverText').textContent = 'Generating a cover from page 1…';
    const cover = await pdfCoverFile(f);
    if (cover) {
      const dt = new DataTransfer();
      dt.items.add(cover);
      $('#fCover').files = dt.files;
      $('#coverText').innerHTML = `<span class="name">${cover.name}</span> — auto-generated from page 1, choose to replace`;
    } else {
      $('#coverText').textContent = 'Tap to choose a cover image';
    }
  }
});
$('#fCover').addEventListener('change', (e) => {
  const f = e.target.files[0];
  $('#coverText').innerHTML = f ? `<span class="name">${f.name}</span>` : 'Tap to choose a cover image';
});

/* ---------------------------------------------------------- add mode: single vs bulk */
$$('.mode-tab').forEach(t => t.addEventListener('click', () => {
  $$('.mode-tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  const bulk = t.dataset.mode === 'bulk';
  $('#prodForm').hidden = bulk;
  $('#bulkForm').hidden = !bulk;
  $('#editing').hidden = true;
  if (bulk) { editingId = null; }
}));

/* ---------------------------------------------------------- bulk upload */
$('#bFree').addEventListener('change', (e) => { $('#bPriceRow').style.display = e.target.checked ? 'none' : 'block'; });
$('#bFiles').addEventListener('change', (e) => {
  const n = e.target.files.length;
  $('#bDropText').innerHTML = n ? `<span class="name">${n} file${n === 1 ? '' : 's'} selected</span>` : 'Tap to choose multiple files';
});

// Uploading several files in one request to our own server hits Vercel's
// 4.5MB body limit fast. So we try direct-to-Supabase uploads first (the
// server only hands out short-lived signed URLs — tiny JSON, no file bytes)
// and fall back to the old "proxy through our server" route if that's not
// available (e.g. Supabase isn't configured, so we're on local disk/Blob).
$('#bulkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#bulkMsg');
  const results = $('#bulkResults');
  msg.className = 'form-msg';
  msg.textContent = '';
  results.innerHTML = '';

  const fileList = [...$('#bFiles').files];
  if (!fileList.length) { msg.className = 'form-msg bad'; msg.textContent = 'Choose at least one file first.'; return; }

  const meta = {
    titlePrefix: $('#bTitlePrefix').value.trim(),
    grade: $('#bGrade').value,
    type: $('#bType').value,
    isFree: $('#bFree').checked,
    featured: $('#bFeatured').checked,
    price: Number($('#bPrice').value || 0),
  };

  const btn = $('#bulkBtn');
  btn.disabled = true;
  const label = $('#bulkLabel').textContent;

  let created = [];
  let failed = [];

  try {
    // Generate a page-1 cover for any PDFs up front — parents should only
    // ever see this thumbnail on the site, never the full file, pre-purchase.
    const covers = new Array(fileList.length).fill(null);
    for (let i = 0; i < fileList.length; i++) {
      if (isPdf(fileList[i])) {
        $('#bulkLabel').textContent = `Preparing cover ${i + 1}/${fileList.length}…`;
        covers[i] = await pdfCoverFile(fileList[i]);
      }
    }
    const coverEntries = covers.map((c, i) => (c ? { idx: i, file: c } : null)).filter(Boolean);

    let signData = null;
    try {
      signData = await api('/api/admin/uploads/sign', {
        method: 'POST',
        body: {
          files: [
            ...fileList.map(f => ({ name: f.name, type: f.type })),
            ...coverEntries.map(c => ({ name: c.file.name, type: c.file.type })),
          ],
        },
      });
    } catch { signData = null; } // not available -> fall back below

    if (signData?.signed) {
      const mainSigns = signData.signed.slice(0, fileList.length);
      const coverSigns = signData.signed.slice(fileList.length);
      mainSigns.forEach(s => { if (!s.ok) failed.push({ name: s.name, error: s.error }); });

      // Upload covers first (best-effort — a failed cover just falls back to a generic icon).
      const coverPublicUrlByIdx = {};
      for (let ci = 0; ci < coverEntries.length; ci++) {
        const sign = coverSigns[ci];
        const entry = coverEntries[ci];
        if (!sign || !sign.ok) continue;
        try {
          const putRes = await fetch(sign.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': sign.contentType || 'image/png', 'x-upsert': 'true' },
            body: entry.file,
          });
          if (putRes.ok) coverPublicUrlByIdx[entry.idx] = sign.publicUrl;
        } catch { /* non-fatal */ }
      }

      const uploaded = [];
      for (let i = 0; i < fileList.length; i++) {
        const sign = mainSigns[i];
        const file = fileList[i];
        if (!sign || !sign.ok) continue;
        $('#bulkLabel').textContent = `Uploading ${i + 1}/${fileList.length}…`;
        try {
          const putRes = await fetch(sign.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': sign.contentType || file.type || 'application/octet-stream', 'x-upsert': 'true' },
            body: file,
          });
          if (!putRes.ok) throw new Error(`Upload failed (HTTP ${putRes.status})`);
          uploaded.push({ name: file.name, publicUrl: sign.publicUrl, contentType: sign.contentType || file.type, coverPublicUrl: coverPublicUrlByIdx[i] || null });
        } catch (upErr) {
          failed.push({ name: file.name, error: upErr.message });
        }
      }

      if (uploaded.length) {
        $('#bulkLabel').textContent = 'Saving…';
        const fin = await api('/api/admin/products/bulk-finalize', { method: 'POST', body: { ...meta, items: uploaded } });
        created = fin.created || [];
      }
    } else {
      $('#bulkLabel').textContent = `Uploading ${fileList.length} file${fileList.length === 1 ? '' : 's'}…`;
      const fd = new FormData();
      fd.append('titlePrefix', meta.titlePrefix);
      fd.append('grade', meta.grade);
      fd.append('type', meta.type);
      fd.append('isFree', meta.isFree);
      fd.append('featured', meta.featured);
      fd.append('price', meta.price);
      fileList.forEach(f => fd.append('files', f));
      const data = await api('/api/admin/products/bulk', { method: 'POST', body: fd, isForm: true });
      created = data.created || [];
      failed = failed.concat(data.failed || []);
    }

    if (created.length) toast(`${created.length} activit${created.length === 1 ? 'y' : 'ies'} added`);
    results.innerHTML = [
      ...created.map(p => `<div class="bulk-row"><svg class="icon" aria-hidden="true"><use href="#ic-check"/></svg><span class="name">${p.title}</span></div>`),
      ...failed.map(f => `<div class="bulk-row err"><svg class="icon" aria-hidden="true"><use href="#ic-trash"/></svg><span class="name">${f.name} — ${f.error}</span></div>`),
    ].join('');
    if (!failed.length) { $('#bulkForm').reset(); $('#bDropText').textContent = 'Tap to choose multiple files'; $('#bPriceRow').style.display = 'block'; }
    await loadSummary();
  } catch (err) {
    msg.className = 'form-msg bad';
    msg.textContent = err.message;
  } finally {
    btn.disabled = false;
    $('#bulkLabel').textContent = label;
  }
});

function resetForm() {
  editingId = null;
  $('#prodForm').reset();
  $('#priceRow').style.display = 'grid';
  $('#dropText').textContent = 'Tap to choose the activity file';
  $('#coverText').textContent = 'Tap to choose a cover image';
  $('#formTitle').textContent = 'Add activity';
  $('#saveLabel').textContent = 'Add activity';
  $('#editing').hidden = true;
  $('#resetBtn').hidden = true;
  $('#formMsg').textContent = '';
}
$('#resetBtn').addEventListener('click', resetForm);

function fillForm(p) {
  $$('.mode-tab').forEach(x => x.classList.toggle('active', x.dataset.mode === 'single'));
  $('#prodForm').hidden = false;
  $('#bulkForm').hidden = true;
  editingId = p.id;
  $('#fId').value = p.id;
  $('#fTitle').value = p.title || '';
  $('#fDesc').value = p.description || '';
  $('#fGrade').value = p.grade || 'all';
  $('#fType').value = p.type || 'worksheet';
  $('#fFree').checked = !!p.isFree;
  $('#fFeatured').checked = !!p.featured;
  $('#priceRow').style.display = p.isFree ? 'none' : 'grid';
  $('#fPrice').value = p.isFree ? '' : (p.price || '');
  $('#fOld').value = p.oldPrice || '';
  const current = p.fileUrl || p.pdfUrl;
  $('#dropText').innerHTML = current ? `Current: <span class="name">${current.split('/').pop()}</span> — choose to replace` : 'Tap to choose the activity file';
  $('#coverText').innerHTML = p.preview ? `Current cover set — choose to replace` : 'Tap to choose a cover image';
  $('#formTitle').textContent = 'Edit activity';
  $('#saveLabel').textContent = 'Save changes';
  $('#editing').hidden = false;
  $('#resetBtn').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------------------------------------------------------- save */
$('#prodForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#formMsg');
  const btn = $('#saveBtn');
  msg.textContent = '';

  const title = $('#fTitle').value.trim();
  if (!title) return;

  const fd = new FormData();
  fd.append('title', title);
  fd.append('description', $('#fDesc').value.trim());
  fd.append('grade', $('#fGrade').value);
  fd.append('type', $('#fType').value);
  fd.append('isFree', $('#fFree').checked);
  fd.append('featured', $('#fFeatured').checked);
  fd.append('price', $('#fPrice').value || 0);
  fd.append('oldPrice', $('#fOld').value || 0);
  if (!editingId) fd.append('id', title);
  const file = $('#fFile').files[0];
  const cover = $('#fCover').files[0];
  if (file) fd.append('file', file);
  if (cover) fd.append('cover', cover);

  btn.disabled = true;
  const label = $('#saveLabel').textContent;
  $('#saveLabel').textContent = 'Saving…';

  try {
    if (editingId) {
      await api(`/api/admin/products/${editingId}`, { method: 'PUT', body: fd, isForm: true });
      toast('Activity updated');
    } else {
      await api('/api/admin/products', { method: 'POST', body: fd, isForm: true });
      toast('Activity added');
    }
    resetForm();
    await loadSummary();
  } catch (err) {
    msg.className = 'form-msg bad';
    msg.textContent = err.message;
  } finally {
    btn.disabled = false;
    $('#saveLabel').textContent = label;
  }
});

/* ---------------------------------------------------------- list */
$('#listSearch').addEventListener('input', renderList);

function renderList() {
  const q = $('#listSearch').value.trim().toLowerCase();
  const list = products.filter(p => !q || (p.title + p.description).toLowerCase().includes(q));
  const wrap = $('#prodList');

  if (!list.length) {
    wrap.innerHTML = `<div class="list-empty">No activities yet. Add your first one on the left.</div>`;
    return;
  }

  wrap.innerHTML = list.map(p => {
    const [, , icon] = typeMeta(p.type);
    const hasFile = !!(p.fileUrl || p.pdfUrl);
    return `
      <div class="prod-row">
        <span class="swatch" style="background:${coverGrad(p.type)}">${p.preview ? `<img src="${p.preview}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : `<svg class="icon" aria-hidden="true"><use href="#${icon}"/></svg>`}</span>
        <div class="info">
          <h4>${p.title}</h4>
          <div class="meta">
            ${levelName(p.grade)} · ${typeMeta(p.type)[1]}
            ${p.featured ? '· <span style="color:var(--saffron)">★ Featured</span>' : ''}
            ${p.isFree ? '· <span class="free">Free</span>' : ''}
            ${hasFile ? '' : '· <span class="no-pdf">No file</span>'}
          </div>
        </div>
        <span class="price">${p.isFree ? 'Free' : money(p.price)}</span>
        <div class="acts">
          <button class="edit" data-edit="${p.id}" aria-label="Edit"><svg class="icon" aria-hidden="true"><use href="#ic-edit"/></svg></button>
          <button class="del" data-del="${p.id}" aria-label="Delete"><svg class="icon" aria-hidden="true"><use href="#ic-trash"/></svg></button>
        </div>
      </div>`;
  }).join('');

  $$('[data-edit]', wrap).forEach(b => b.addEventListener('click', () => {
    fillForm(products.find(p => p.id === b.dataset.edit));
  }));
  $$('[data-del]', wrap).forEach(b => b.addEventListener('click', () => remove(b.dataset.del)));
}

async function remove(id) {
  const p = products.find(x => x.id === id);
  if (!confirm(`Delete "${p?.title}"? This can't be undone.`)) return;
  try {
    await api(`/api/admin/products/${id}`, { method: 'DELETE' });
    toast('Activity deleted');
    if (editingId === id) resetForm();
    await loadSummary();
  } catch (e) {
    toast(e.message);
  }
}

/* ---------------------------------------------------------- toast */
let tt;
function toast(msg) {
  $('#toastMsg').textContent = msg;
  const t = $('#toast');
  t.classList.add('show');
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------------------------------------------------- boot */
(async function boot() {
  if (adminKey) {
    try { await tryLogin(adminKey); }
    catch { showLogin(); }
  }
})();
