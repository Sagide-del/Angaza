/* ============================================================
   ANGAZA — front-end app
   ============================================================ */

const API = ''; // same-origin ('' -> /api/...). Set to a full URL if the API is hosted elsewhere.
const CFG = window.ANGAZA_CONFIG || {};
const PAY = CFG.pay || { mode: 'manual', mpesaName: 'YOUR NAME', mpesaNumber: '07XX XXX XXX' };
const WHATSAPP = CFG.whatsapp || '2547XXXXXXXX';
const CURRENCY = CFG.currency || 'KES';

const LEVELS = [
  { id: 'pp1',     name: 'Pre-Primary 1', age: 'Ages 4–5',  chip: 'First steps',   color: '#F4A623', icon: 'ic-sprout' },
  { id: 'pp2',     name: 'Pre-Primary 2', age: 'Ages 5–6',  chip: 'Ready to write',color: '#FF6B4A', icon: 'ic-pencil' },
  { id: 'grade1',  name: 'Grade 1',       age: 'Ages 6–7',  chip: 'Reading time',  color: '#2FAE66', icon: 'ic-book' },
  { id: 'grade2',  name: 'Grade 2',       age: 'Ages 7–8',  chip: 'Word builder',  color: '#7A5CD0', icon: 'ic-blocks' },
  { id: 'grade3',  name: 'Grade 3',       age: 'Ages 8–9',  chip: 'Number whiz',   color: '#12A5A0', icon: 'ic-numbers' },
  { id: 'grade4',  name: 'Grade 4',       age: 'Ages 9–10', chip: 'Explorer',      color: '#1E2A44', icon: 'ic-globe' },
  { id: 'grade5',  name: 'Grade 5',       age: 'Ages 10–11',chip: 'Big thinker',   color: '#F4A623', icon: 'ic-bulb' },
  { id: 'grade6',  name: 'Grade 6',       age: 'Ages 11–12',chip: 'Ready for more',color: '#FF6B4A', icon: 'ic-rocket' },
];

const TYPES = [
  { id: 'workbook',   label: 'Workbooks',    icon: 'ic-book',    color: '#F4A623' },
  { id: 'worksheet',  label: 'Worksheets',   icon: 'ic-pencil',  color: '#2FAE66' },
  { id: 'coloring',   label: 'Colouring',    icon: 'ic-palette', color: '#FF6B4A' },
  { id: 'story',      label: 'Stories',      icon: 'ic-story',   color: '#7A5CD0' },
  { id: 'flashcards', label: 'Flashcards',   icon: 'ic-flash',   color: '#12A5A0' },
  { id: 'poster',     label: 'Posters',      icon: 'ic-globe',   color: '#E5397E' },
  { id: 'diy',        label: 'DIY Packages', icon: 'ic-diy',     color: '#E67E22' },
];

const FORMATS = {
  pdf:   { label: 'PDF',   icon: 'ic-printer' },
  image: { label: 'Image', icon: 'ic-globe' },
  audio: { label: 'Audio', icon: 'ic-audio' },
  diy:   { label: 'DIY',   icon: 'ic-diy' },
  file:  { label: 'File',  icon: 'ic-download' },
};

const state = { products: [], level: 'all', type: 'all', query: '', cart: [] };

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = (n) => `${CURRENCY} ${Number(n).toLocaleString('en-KE')}`;
const gradeLabel = (id) => (LEVELS.find(l => l.id === id)?.name) || id;
const typeMeta = (id) => TYPES.find(t => t.id === id) || { label: id, icon: 'ic-book', color: '#F4A623' };

/* ---------------------------------------------------------- data */
async function loadProducts() {
  try {
    const r = await fetch(`${API}/api/products`);
    if (!r.ok) throw new Error('api');
    state.products = await r.json();
  } catch {
    // static fallback so the site works without a running server
    const r = await fetch('data/products.json');
    state.products = await r.json();
  }
  renderLevels();
  renderFilters();
  renderFeatured();
  renderCategories();
  renderProducts();
  renderFree();
  $('#statCount').textContent = `${state.products.length}+`;
}

/* ---------------------------------------------------------- featured */
function renderFeatured() {
  const grid = $('#featuredGrid');
  if (!grid) return;
  let list = state.products.filter(p => p.featured && !p.isFree);
  if (list.length < 4) list = [...list, ...state.products.filter(p => !p.isFree && !p.featured)];
  list = list.slice(0, 4);
  grid.innerHTML = list.map(cardHTML).join('');
  wireCardButtons(grid);
}

/* ---------------------------------------------------------- categories */
function renderCategories() {
  const grid = $('#categoryGrid');
  if (!grid) return;
  grid.innerHTML = TYPES.map(t => `
      <button class="cat-card" data-cat="${t.id}" style="--c:${t.color}">
        <svg class="icon cat-icon" aria-hidden="true"><use href="#${t.icon}"/></svg>
        <h3>${t.label}</h3>
        <span class="go"><svg class="icon" aria-hidden="true"><use href="#ic-arrow"/></svg></span>
      </button>`).join('');
  $$('.cat-card', grid).forEach(b => b.addEventListener('click', () => {
    setType(b.dataset.cat);
    setLevel('all');
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
  }));
}

/* ---------------------------------------------------------- levels */
function renderLevels() {
  $('#levelGrid').innerHTML = LEVELS.map(l => `
    <a class="level" href="#shop" data-level="${l.id}">
      <span class="glyph" style="background:${l.color}22;color:${l.color}"><svg class="icon" aria-hidden="true"><use href="#${l.icon}"/></svg></span>
      <h3>${l.name}</h3>
      <div class="age">${l.age}</div>
      <span class="chip" style="background:${l.color}22">${l.chip}</span>
    </a>`).join('');

  $$('#levelGrid .level').forEach(a => a.addEventListener('click', () => {
    setLevel(a.dataset.level);
  }));
}

/* ---------------------------------------------------------- browse tabs */
$$('.browse-tab').forEach(t => t.addEventListener('click', () => {
  $$('.browse-tab').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-selected', 'false'); });
  t.classList.add('active');
  t.setAttribute('aria-selected', 'true');
  const panel = t.dataset.panel;
  $('#categoryGrid').hidden = panel !== 'category';
  $('#levelGrid').hidden = panel !== 'level';
}));

/* ---------------------------------------------------------- filters */
function renderFilters() {
  const lvl = ['all', ...LEVELS.map(l => l.id)];
  $('#levelChips').innerHTML = lvl.map(id => `
    <button class="filter-chip" data-level="${id}" aria-pressed="${id === state.level}">
      ${id === 'all' ? 'All levels' : gradeLabel(id)}
    </button>`).join('');

  const typ = ['all', ...TYPES.map(t => t.id)];
  $('#typeChips').innerHTML = typ.map(id => {
    const t = id === 'all' ? { label: 'All types', icon: 'ic-sun' } : typeMeta(id);
    return `<button class="filter-chip" data-type="${id}" aria-pressed="${id === state.type}">
      <svg class="icon" aria-hidden="true"><use href="#${t.icon}"/></svg> ${t.label}
    </button>`;
  }).join('');

  $$('#levelChips .filter-chip').forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));
  $$('#typeChips .filter-chip').forEach(b => b.addEventListener('click', () => setType(b.dataset.type)));
}

function setLevel(id) {
  state.level = id;
  $$('#levelChips .filter-chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.level === id));
  renderProducts();
}
function setType(id) {
  state.type = id;
  $$('#typeChips .filter-chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.type === id));
  renderProducts();
}

$('#search').addEventListener('input', (e) => { state.query = e.target.value.trim().toLowerCase(); renderProducts(); });

/* ---------------------------------------------------------- header shop dropdown */
function jumpToShop() {
  document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
}
$$('[data-nav-cat]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  setType(a.dataset.navCat);
  setLevel('all');
  jumpToShop();
}));
$$('[data-nav-level]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  setLevel(a.dataset.navLevel);
  jumpToShop();
}));

/* ---------------------------------------------------------- product cards */
function coverGradient(type) {
  // Neutral cream tile for auto-generated covers; real uploaded artwork overrides this.
  return 'linear-gradient(135deg, #FFF8E7 0%, #FDECB8 100%)';
}

function cardHTML(p) {
  const t = typeMeta(p.type);
  const hasDeal = p.oldPrice && p.oldPrice > p.price && !p.isFree;
  const fmt = FORMATS[p.format] || FORMATS.pdf;
  const cover = p.preview
    ? `<img class="preview" src="${p.preview}" alt="${p.title}" loading="lazy" />`
    : `<svg class="glyph" aria-hidden="true"><use href="#${t.icon}"/></svg>`;
  return `
    <article class="card" data-id="${p.id}">
      <div class="cover" style="background:${coverGradient(p.type)}">
        ${cover}
        <button class="peek" data-peek="${p.id}" aria-label="Preview ${p.title}"><svg class="icon" aria-hidden="true"><use href="#ic-zoom"/></svg></button>
        <div class="flags">
          ${p.isFree ? '<span class="flag free">Free</span>' : ''}
          ${hasDeal ? '<span class="flag deal">Deal</span>' : ''}
        </div>
        <span class="format"><svg class="icon" aria-hidden="true"><use href="#${fmt.icon}"/></svg> ${fmt.label}</span>
      </div>
      <div class="body">
        <div class="tags">
          <span class="tag grade">${gradeLabel(p.grade)}</span>
          <span class="tag type">${t.label}</span>
        </div>
        <h3>${p.title}</h3>
        <p class="desc">${p.description}</p>
        <div class="foot">
          ${p.isFree
            ? '<span class="price free">Free</span>'
            : `<span class="price">${hasDeal ? `<span class="was">${money(p.oldPrice)}</span>` : ''}${money(p.price)}</span>`}
          ${p.isFree
            ? `<button class="add get" data-get="${p.id}"><svg class="icon" aria-hidden="true"><use href="#ic-download"/></svg> Download</button>`
            : `<button class="add" data-add="${p.id}"><svg class="icon" aria-hidden="true"><use href="#ic-cart"/></svg> Add</button>`}
        </div>
      </div>
    </article>`;
}

function renderProducts() {
  const grid = $('#productGrid');
  let list = state.products.filter(p => !p.isFree);
  if (state.level !== 'all') list = list.filter(p => p.grade === state.level || p.grade === 'all');
  if (state.type  !== 'all') list = list.filter(p => p.type === state.type);
  if (state.query) list = list.filter(p =>
    (p.title + ' ' + p.description + ' ' + gradeLabel(p.grade)).toLowerCase().includes(state.query));

  $('#resultCount').textContent = `${list.length} activit${list.length === 1 ? 'y' : 'ies'}`;

  grid.innerHTML = list.length ? list.map(cardHTML).join('') : `
    <div class="empty">
      <svg class="icon" aria-hidden="true"><use href="#ic-search"/></svg>
      <p>No activities match that yet. Try another level or clear your search.</p>
    </div>`;
  wireCardButtons(grid);
}

function renderFree() {
  const grid = $('#freeGrid');
  const list = state.products.filter(p => p.isFree);
  grid.innerHTML = list.length ? list.map(cardHTML).join('') : `
    <div class="empty"><p>Free samples are on the way — check back soon.</p></div>`;
  wireCardButtons(grid);
}

function wireCardButtons(scope) {
  $$('[data-add]', scope).forEach(b => b.addEventListener('click', () => addToCart(b.dataset.add)));
  $$('[data-get]', scope).forEach(b => b.addEventListener('click', () => downloadFree(b.dataset.get)));
  $$('[data-peek]', scope).forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); openPreview(b.dataset.peek); }));
}

/* ---------------------------------------------------------- preview lightbox */
function watermarkURL() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='230' height='150'>` +
    `<text x='115' y='78' fill='rgba(255,255,255,0.55)' font-size='19' font-weight='800' ` +
    `font-family='Nunito,Arial,sans-serif' text-anchor='middle' transform='rotate(-28 115 78)'>Angaza · Sample</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function openPreview(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  const t = typeMeta(p.type);
  const fmt = FORMATS[p.format] || FORMATS.pdf;
  const hasDeal = p.oldPrice && p.oldPrice > p.price && !p.isFree;

  const stage = p.preview
    ? `<img src="${p.preview}" alt="${p.title} sample" />
       <div class="wm-layer" style="background-image:${watermarkURL()}"></div>`
    : `<div class="tile" style="background:${coverGradient(p.type)}"><svg class="icon" aria-hidden="true"><use href="#${t.icon}"/></svg></div>`;

  const priceHTML = p.isFree
    ? '<span class="price free">Free</span>'
    : `<span class="price">${hasDeal ? `<span class="was">${money(p.oldPrice)}</span>` : ''}${money(p.price)}</span>`;

  const action = p.isFree
    ? `<button class="btn btn-primary" data-lb-get="${p.id}"><svg class="icon" aria-hidden="true"><use href="#ic-download"/></svg> Download free</button>`
    : `<button class="btn btn-primary" data-lb-add="${p.id}"><svg class="icon" aria-hidden="true"><use href="#ic-cart"/></svg> Add to cart</button>`;

  $('#previewCard').innerHTML = `
    <div class="stage">
      <button class="lb-close" data-lb-x aria-label="Close preview"><svg class="icon" aria-hidden="true"><use href="#ic-close"/></svg></button>
      ${stage}
    </div>
    <div class="lb-body">
      <div class="lb-tags">
        <span class="tag grade">${gradeLabel(p.grade)}</span>
        <span class="tag type">${t.label}</span>
        <span class="tag type" style="background:rgba(30,42,68,.08);color:var(--ink)">${fmt.label}</span>
      </div>
      <h3>${p.title}</h3>
      <p class="lb-desc">${p.description}</p>
      <div class="lb-foot">${priceHTML}${action}</div>
    </div>`;

  openOverlay($('#previewOverlay'));
  $('[data-lb-x]').addEventListener('click', () => closeOverlay($('#previewOverlay')));
  $('[data-lb-add]')?.addEventListener('click', () => { addToCart(id); closeOverlay($('#previewOverlay')); });
  $('[data-lb-get]')?.addEventListener('click', () => { downloadFree(id); closeOverlay($('#previewOverlay')); });
}

/* ---------------------------------------------------------- cart */
function addToCart(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  if (!state.cart.find(x => x.id === id)) state.cart.push(p);
  syncCart();
  toast(`Added "${p.title}"`);
}
function removeFromCart(id) { state.cart = state.cart.filter(x => x.id !== id); syncCart(); }

function syncCart() {
  $('#cartCount').textContent = state.cart.length;
  const items = $('#cartItems');
  const foot = $('#cartFoot');
  if (!state.cart.length) {
    items.innerHTML = `<div class="cart-empty"><svg class="icon" aria-hidden="true"><use href="#ic-cart"/></svg><p>Your cart is empty.<br>Add an activity to get started.</p></div>`;
    foot.hidden = true;
    return;
  }
  items.innerHTML = state.cart.map(p => {
    const t = typeMeta(p.type);
    return `<div class="cart-line">
      <span class="thumb" style="background:${coverGradient(p.type)}"><svg class="icon" aria-hidden="true"><use href="#${t.icon}"/></svg></span>
      <div class="meta"><h4>${p.title}</h4><span>${gradeLabel(p.grade)} · ${t.label}</span><br><button class="rm" data-rm="${p.id}">Remove</button></div>
      <span class="price">${money(p.price)}</span>
    </div>`;
  }).join('');
  $('#cartTotal').textContent = money(cartTotal());
  foot.hidden = false;
  $$('[data-rm]', items).forEach(b => b.addEventListener('click', () => removeFromCart(b.dataset.rm)));
}
const cartTotal = () => state.cart.reduce((s, p) => s + Number(p.price), 0);

/* ---------------------------------------------------------- overlays */
function openOverlay(el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeOverlay(el) { el.classList.remove('open'); document.body.style.overflow = ''; }

$('#openCart').addEventListener('click', () => { syncCart(); openOverlay($('#cartOverlay')); });
$('#openSearch')?.addEventListener('click', () => {
  document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => $('#search').focus(), 400);
});
$$('[data-close]').forEach(b => b.addEventListener('click', () => closeOverlay($('#cartOverlay'))));
$$('.overlay').forEach(o => o.addEventListener('click', (e) => { if (e.target === o) closeOverlay(o); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.overlay.open').forEach(closeOverlay); });

/* ---------------------------------------------------------- checkout */
$('#checkoutBtn').addEventListener('click', () => {
  closeOverlay($('#cartOverlay'));
  openCheckout();
});

function openCheckout() {
  const total = cartTotal();
  const lines = state.cart.map(p => `<div class="pay-row"><span>${p.title}</span><b>${money(p.price)}</b></div>`).join('');

  const payInstructions = PAY.mode === 'stk'
    ? `<p class="pay-note">Enter your phone and we'll send an M-Pesa prompt (STK push). Approve it and your file${state.cart.length > 1 ? 's' : ''} arrive on WhatsApp.</p>`
    : `<div class="send-money">
         <h4><svg class="icon" aria-hidden="true"><use href="#ic-phone"/></svg> Pay by M-Pesa (Send Money)</h4>
         <ol>
           <li>Open M-Pesa → <b>Send Money</b></li>
           <li>Send <b>${money(total)}</b> to <b>${PAY.mpesaNumber}</b> <span class="mp-name">(${PAY.mpesaName})</span></li>
           <li>Copy the M-Pesa confirmation code and paste it below</li>
         </ol>
       </div>`;

  const codeField = PAY.mode === 'stk' ? '' : `
    <div class="field"><label for="cCode">M-Pesa confirmation code</label>
      <input id="cCode" required placeholder="e.g. TFA1B2C3D4" style="text-transform:uppercase" />
      <div class="hint">You get this by SMS right after paying.</div></div>`;

  const submitLabel = PAY.mode === 'stk'
    ? `<svg class="icon" aria-hidden="true"><use href="#ic-phone"/></svg> Pay ${money(total)} with M-Pesa`
    : `<svg class="icon" aria-hidden="true"><use href="#ic-wa"/></svg> Confirm &amp; get my file${state.cart.length > 1 ? 's' : ''}`;

  $('#modalCard').innerHTML = `
    <div class="modal-head">
      <h2>Checkout</h2>
      <button class="icon-btn" data-x aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#ic-close"/></svg></button>
    </div>
    <div class="modal-body">
      <div class="pay-box">
        ${lines}
        <div class="pay-row" style="border-top:1px solid var(--line);margin-top:8px;padding-top:10px"><span><b>Total</b></span><b>${money(total)}</b></div>
        ${payInstructions}
      </div>
      <form id="payForm" novalidate>
        <div class="field"><label for="cName">Your name</label><input id="cName" required placeholder="e.g. Jane Mwangi" /></div>
        <div class="field"><label for="cPhone">WhatsApp number</label><input id="cPhone" required inputmode="tel" placeholder="07XX XXX XXX" /><div class="hint">We send your file${state.cart.length > 1 ? 's' : ''} here.</div></div>
        ${codeField}
        <div class="field"><label for="cEmail">Email (optional)</label><input id="cEmail" type="email" placeholder="jane@example.com" /></div>
        <button type="submit" class="btn btn-primary form-submit" id="payBtn">${submitLabel}</button>
        <p class="secure"><svg class="icon" aria-hidden="true"><use href="#ic-shield"/></svg> Your details are only used to deliver your file${state.cart.length > 1 ? 's' : ''}.</p>
      </form>
    </div>`;
  openOverlay($('#modalOverlay'));
  $('[data-x]').addEventListener('click', () => closeOverlay($('#modalOverlay')));
  $('#payForm').addEventListener('submit', PAY.mode === 'stk' ? submitStk : submitManual);
}

/* -------- manual mode: personal M-Pesa + confirm on WhatsApp -------- */
async function submitManual(e) {
  e.preventDefault();
  const name = $('#cName').value.trim();
  const phone = $('#cPhone').value.trim();
  const code = ($('#cCode')?.value || '').trim().toUpperCase();
  const email = $('#cEmail').value.trim();
  if (!name || !phone || !code) return;

  const items = state.cart.map(p => ({ id: p.id, title: p.title, price: p.price }));

  // Best-effort: log the order to your backend (works if the API/KV is set up).
  fetch(`${API}/api/checkout`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, email, mpesaCode: code, mode: 'manual', amount: cartTotal(), items }),
  }).catch(() => {});

  // Primary, reliable step: open WhatsApp to you with the full order + code.
  const summary = items.map(p => `• ${p.title} (${money(p.price)})`).join('%0A');
  const msg =
    `Habari Angaza! I've paid and here's my order:%0A${summary}%0ATotal: ${money(cartTotal())}` +
    `%0AName: ${encodeURIComponent(name)}%0AWhatsApp: ${encodeURIComponent(phone)}` +
    `%0AM-Pesa code: ${encodeURIComponent(code)}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank');

  showSuccess(name, phone, 'manual');
  state.cart = [];
  syncCart();
}

/* -------- stk mode: automated Daraja prompt (Paybill/Till) -------- */
async function submitStk(e) {
  e.preventDefault();
  const name = $('#cName').value.trim();
  const phone = $('#cPhone').value.trim();
  const email = $('#cEmail').value.trim();
  if (!name || !phone) return;

  const btn = $('#payBtn');
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Sending prompt to your phone…';

  const payload = { name, phone, email, mode: 'stk', amount: cartTotal(),
    items: state.cart.map(p => ({ id: p.id, title: p.title, price: p.price })) };

  try {
    const r = await fetch(`${API}/api/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!data.success) throw new Error(data.error || 'failed');
    showSuccess(name, phone, 'stk');
    state.cart = []; syncCart();
  } catch {
    const summary = state.cart.map(p => `• ${p.title} (${money(p.price)})`).join('%0A');
    const msg = `Habari Angaza! I'd like to buy:%0A${summary}%0ATotal: ${money(cartTotal())}%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank');
    showSuccess(name, phone, 'whatsapp');
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

function showSuccess(name, phone, kind) {
  const heading = kind === 'stk' ? 'Prompt sent!' : 'Order received!';
  const body = kind === 'stk'
    ? `${name}, check your phone for the M-Pesa prompt and enter your PIN.`
    : `${name}, we've opened WhatsApp with your order and payment code. Send the message and we'll confirm and deliver your files.`;
  const note = kind === 'stk'
    ? `Once paid, your files arrive on WhatsApp at ${phone}.`
    : `Didn't see WhatsApp open? Message us on ${WHATSAPP.replace(/^(\d{3})/, '+$1 ')} with your M-Pesa code.`;
  $('#modalCard').innerHTML = `
    <div class="success">
      <div class="ring"><svg class="icon" aria-hidden="true"><use href="#ic-check"/></svg></div>
      <h2>${heading}</h2>
      <p>${body}</p>
      <div class="note">${note}</div>
      <button class="btn btn-primary" data-x2 style="justify-content:center;width:100%">Done</button>
    </div>`;
  $('[data-x2]').addEventListener('click', () => closeOverlay($('#modalOverlay')));
}

/* ---------------------------------------------------------- free download */
async function downloadFree(id) {
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  try {
    const r = await fetch(`${API}/api/freebies/${id}`);
    const data = await r.json();
    window.open(data.url || p.fileUrl || p.pdfUrl, '_blank');
  } catch {
    window.open(p.fileUrl || p.pdfUrl || '#', '_blank');
  }
  toast('Opening your free sample…');
}

/* ---------------------------------------------------------- toast */
let toastTimer;
function toast(msg) {
  $('#toastMsg').textContent = msg;
  const t = $('#toast');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------------------------------------------------- mobile nav */
$('#menuToggle').addEventListener('click', () => {
  const nav = $('#mobileNav');
  const open = nav.classList.toggle('open');
  $('#menuToggle').setAttribute('aria-expanded', open);
});
$$('#mobileNav a').forEach(a => a.addEventListener('click', () => $('#mobileNav').classList.remove('open')));

/* ---------------------------------------------------------- go */
document.addEventListener('DOMContentLoaded', () => {
  syncCart();
  loadProducts();
  const s2 = document.getElementById('step2text');
  if (s2) s2.textContent = PAY.mode === 'stk'
    ? 'Approve the M-Pesa prompt that pops up on your phone.'
    : `Send Money to ${PAY.mpesaNumber} and paste the confirmation code.`;
});
