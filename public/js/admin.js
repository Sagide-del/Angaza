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
  if (st) {
    const warn = st.files === 'local disk';
    $('#envBadge').textContent = `Files: ${st.files}${warn ? ' ⚠' : ''} · Catalogue: ${st.catalogue}`;
    $('#envBadge').title = warn ? 'Uploads will fail on Vercel — connect Supabase/Blob env vars and redeploy.' : '';
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
          <a class="mini" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
          ${o.status !== 'delivered' ? `<button class="mini done" data-deliver="${o.id}">Mark delivered</button>` : ''}
        </div>
      </div>`;
  }).join('');

  $$('[data-files]', wrap).forEach(b => b.addEventListener('click', () => showFiles(b.dataset.files)));
  $$('[data-deliver]', wrap).forEach(b => b.addEventListener('click', () => setStatus(b.dataset.deliver, 'delivered')));
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

$('#fFree').addEventListener('change', (e) => { $('#priceRow').style.display = e.target.checked ? 'none' : 'grid'; });
$('#fFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  $('#dropText').innerHTML = f ? `<span class="name">${f.name}</span>` : 'Tap to choose the activity file';
});
$('#fCover').addEventListener('change', (e) => {
  const f = e.target.files[0];
  $('#coverText').innerHTML = f ? `<span class="name">${f.name}</span>` : 'Tap to choose a cover image';
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
