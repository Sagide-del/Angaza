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
  { id: 'workbook',   label: 'Workbooks',           icon: 'ic-book',    color: '#F4A623', priceRange: 'KES 200–500' },
  { id: 'worksheet',  label: 'Worksheets',          icon: 'ic-pencil',  color: '#2FAE66', priceRange: 'KES 10–50' },
  { id: 'coloring',   label: 'Colouring',           icon: 'ic-palette', color: '#FF6B4A', priceRange: 'KES 50–150' },
  { id: 'story',      label: 'Stories',             icon: 'ic-story',   color: '#7A5CD0', priceRange: 'KES 100–250' },
  { id: 'flashcards', label: 'Flashcards',          icon: 'ic-flash',   color: '#12A5A0', priceRange: 'KES 80–200' },
  { id: 'poster',     label: 'Posters',             icon: 'ic-globe',   color: '#E5397E', priceRange: 'KES 120–300' },
  { id: 'revision',   label: 'Angaza Series Exams', icon: 'ic-quiz',    color: '#E67E22', priceRange: 'KES 100' },
];

const FORMATS = {
  pdf:   { label: 'PDF',   icon: 'ic-printer' },
  word:  { label: 'Word',  icon: 'ic-pencil' },
  image: { label: 'Image', icon: 'ic-globe' },
  audio: { label: 'Audio', icon: 'ic-audio' },
  diy:   { label: 'DIY',   icon: 'ic-diy' },
  file:  { label: 'File',  icon: 'ic-download' },
};

const QUICK_FILTERS = [
  { key: 'onlyFeatured', label: 'Popular' },
  { key: 'onlyRevision', label: 'Angaza Series Exams' },
];

const COMING_SOON = [
  { label: 'Online Classes' },
];

const TERM_LABELS = { term1: 'Term 1', term2: 'Term 2', term3: 'Term 3' };

const PAGE_SIZE = 24;

const state = {
  products: [], level: 'all', type: 'all', query: '',
  freeOnly: false, onlyFeatured: false, onlyRevision: false,
  visibleCount: PAGE_SIZE,
  cart: [],
};

function hasActiveFilters() {
  return state.level !== 'all' || state.type !== 'all' || Boolean(state.query)
    || state.freeOnly || state.onlyFeatured || state.onlyRevision;
}

function clearAllFilters() {
  state.level = 'all'; state.type = 'all'; state.query = '';
  state.freeOnly = false; state.onlyFeatured = false; state.onlyRevision = false;
  state.visibleCount = PAGE_SIZE;
  $('#levelSelect').value = 'all';
  $('#typeSelect').value = 'all';
  $('#search').value = '';
  $$('#quickChips .filter-chip[data-key]').forEach(b => b.setAttribute('aria-pressed', 'false'));
  renderCatalog();
}

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = (n) => `${CURRENCY} ${Number(n).toLocaleString('en-KE')}`;
const gradeLabel = (id) => (LEVELS.find(l => l.id === id)?.name) || id;
const typeMeta = (id) => TYPES.find(t => t.id === id)
  || (id === 'diy' ? { label: 'DIY Package', icon: 'ic-diy', color: '#E67E22' } : { label: id, icon: 'ic-book', color: '#F4A623' });

function jumpToResources() {
  document.getElementById('resources').scrollIntoView({ behavior: 'smooth' });
}

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
  renderFilterControls();
  renderCatalog();
  $('#statCount').textContent = `${state.products.length}+`;
}

/* ---------------------------------------------------------- filters */
function renderFilterControls() {
  $('#levelSelect').innerHTML = `<option value="all">All grades</option>` +
    LEVELS.map(l => `<option value="${l.id}">${l.name}</option>`).join('');
  $('#typeSelect').innerHTML = `<option value="all">All categories</option>` +
    TYPES.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
  $('#levelSelect').value = state.level;
  $('#typeSelect').value = state.type;
  $('#levelSelect').addEventListener('change', (e) => { state.level = e.target.value; state.visibleCount = PAGE_SIZE; renderCatalog(); });
  $('#typeSelect').addEventListener('change', (e) => { state.type = e.target.value; state.visibleCount = PAGE_SIZE; renderCatalog(); });

  $('#clearFilters').addEventListener('click', clearAllFilters);

  renderQuickChips();
}

function renderQuickChips() {
  const active = QUICK_FILTERS.map(q =>
    `<button class="filter-chip" type="button" data-key="${q.key}" aria-pressed="${state[q.key]}">${q.label}</button>`).join('');
  const soon = COMING_SOON.map(c =>
    `<button class="filter-chip soon" type="button" data-soon="${c.label}">${c.label}<span class="soon-badge">Soon</span></button>`).join('');
  $('#quickChips').innerHTML = active + soon;

  $$('#quickChips .filter-chip[data-key]').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.key;
    state[key] = !state[key];
    state.visibleCount = PAGE_SIZE;
    b.setAttribute('aria-pressed', state[key]);
    renderCatalog();
  }));
  $$('#quickChips .filter-chip.soon').forEach(b => b.addEventListener('click', () => {
    const label = b.dataset.soon;
    const msg = encodeURIComponent(`Habari Angaza! I'd like to be notified when ${label} launches.`);
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank', 'noopener');
    toast(`Thanks! We'll message you on WhatsApp when ${label} launches.`);
  }));
}

$('#search').addEventListener('input', (e) => {
  state.query = e.target.value.trim().toLowerCase();
  state.visibleCount = PAGE_SIZE;
  renderCatalog();
});

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
          ${p.featured ? '<span class="flag popular">Popular</span>' : ''}
        </div>
        <span class="format"><svg class="icon" aria-hidden="true"><use href="#${fmt.icon}"/></svg> ${fmt.label}</span>
      </div>
      <div class="body">
        <div class="tags">
          <span class="tag grade">${gradeLabel(p.grade)}</span>
          <span class="tag type">${t.label}</span>
          ${p.term ? `<span class="tag term">${TERM_LABELS[p.term] || p.term}</span>` : ''}
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

/* ---------------------------------------------------------- Angaza Series Exams (grouped by grade & term, for schools) */
function seriesNoteHTML() {
  const msg = encodeURIComponent("Habari Angaza! I'm ordering the Angaza Series Exams for my school and would like bulk pricing.");
  return `
    <div class="series-note">
      <svg class="icon" aria-hidden="true"><use href="#ic-quiz"/></svg>
      <p><strong>Angaza Series Exams</strong> — CBC exam &amp; assessment papers, arranged by grade and term. KES 100 per paper, available as PDF or Word. Ordering for a school? <a href="https://wa.me/${WHATSAPP}?text=${msg}" target="_blank" rel="noopener">Chat with us for bulk pricing</a>.</p>
    </div>`;
}

// "All grades" view: one section per grade, so a school can find its grade fast.
function renderGroupedByGrade(list) {
  const groups = {};
  list.forEach(p => { (groups[p.grade] = groups[p.grade] || []).push(p); });
  const order = [...LEVELS.map(l => l.id), 'all'];
  return order.filter(id => groups[id] && groups[id].length).map(id => {
    const label = id === 'all' ? 'All Grades' : gradeLabel(id);
    const items = groups[id];
    return `
      <div class="grade-group">
        <h3 class="grade-group-title">${label} <span class="grade-group-count">${items.length}</span></h3>
        <div class="product-grid grade-group-grid">${items.map(cardHTML).join('')}</div>
      </div>`;
  }).join('');
}

// Single-grade view (once the grade header/select narrows to one grade):
// split that grade's papers into Term 1 / Term 2 / Term 3.
function renderTermGroups(list) {
  const groups = {};
  list.forEach(p => { const t = p.term && TERM_LABELS[p.term] ? p.term : 'unassigned'; (groups[t] = groups[t] || []).push(p); });
  const order = ['term1', 'term2', 'term3', 'unassigned'];
  return order.filter(id => groups[id] && groups[id].length).map(id => {
    const label = id === 'unassigned' ? 'Not yet assigned to a term' : TERM_LABELS[id];
    const items = groups[id];
    return `
      <div class="grade-group">
        <h3 class="grade-group-title">${label} <span class="grade-group-count">${items.length}</span></h3>
        <div class="product-grid grade-group-grid">${items.map(cardHTML).join('')}</div>
      </div>`;
  }).join('');
}

/* ---------------------------------------------------------- unified catalogue */
function renderCatalog() {
  const grid = $('#productGrid');
  let list = state.products.slice();

  if (state.freeOnly) list = list.filter(p => p.isFree);
  if (state.onlyFeatured) list = list.filter(p => p.featured);
  if (state.onlyRevision) list = list.filter(p => p.type === 'revision');
  if (state.level !== 'all') list = list.filter(p => p.grade === state.level || p.grade === 'all');
  if (state.type !== 'all') list = list.filter(p => p.type === state.type);
  if (state.query) list = list.filter(p =>
    (p.title + ' ' + p.description + ' ' + gradeLabel(p.grade)).toLowerCase().includes(state.query));

  list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  const active = hasActiveFilters();
  $('#clearFilters').hidden = !active;
  $('#resultCount').textContent = `${list.length} resource${list.length === 1 ? '' : 's'}`;

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty">
        <svg class="icon" aria-hidden="true"><use href="#ic-search"/></svg>
        <p>No resources match that yet. Try clearing a filter or your search.</p>
        ${active ? `<button class="btn btn-ghost" id="emptyClear" type="button">Clear filters</button>` : ''}
      </div>`;
    if (active) $('#emptyClear').addEventListener('click', clearAllFilters);
    wireCardButtons(grid);
    return;
  }

  const shown = list.slice(0, state.visibleCount);
  const more = list.length - shown.length;
  const isAngazaSeries = state.type === 'revision' || state.onlyRevision;
  const loadMoreHTML = more > 0
    ? `<div class="load-more"><button class="btn btn-ghost" id="loadMoreBtn" type="button">Show ${Math.min(more, PAGE_SIZE)} more</button></div>` : '';

  let body;
  if (isAngazaSeries && state.level !== 'all') {
    // A specific grade is selected via the header grade select — split that grade's papers by term.
    body = seriesNoteHTML() + renderTermGroups(shown);
  } else if (isAngazaSeries) {
    body = seriesNoteHTML()
      + `<p class="series-grade-hint">Select a grade above to see that grade's papers split by Term 1 / 2 / 3.</p>`
      + renderGroupedByGrade(shown);
  } else {
    body = shown.map(cardHTML).join('');
  }

  grid.innerHTML = body + loadMoreHTML;

  if (more > 0) {
    $('#loadMoreBtn').addEventListener('click', () => {
      state.visibleCount += PAGE_SIZE;
      renderCatalog();
    });
  }

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
        ${p.term && TERM_LABELS[p.term] ? `<span class="tag term">${TERM_LABELS[p.term]}</span>` : ''}
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
      <div class="meta"><h4>${p.title}</h4><span>${gradeLabel(p.grade)} · ${t.label}${p.term && TERM_LABELS[p.term] ? ` · ${TERM_LABELS[p.term]}` : ''}</span><br><button class="rm" data-rm="${p.id}">Remove</button></div>
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
$$('[data-close]').forEach(b => b.addEventListener('click', () => closeOverlay($('#cartOverlay'))));
$$('.overlay').forEach(o => o.addEventListener('click', (e) => { if (e.target === o) closeOverlay(o); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.overlay.open').forEach(closeOverlay); });

/* ---------------------------------------------------------- checkout */
$('#checkoutBtn').addEventListener('click', () => {
  closeOverlay($('#cartOverlay'));
  openCheckout();
});

function isSeriesCart() {
  return state.cart.length > 0 && state.cart.every(p => p.type === 'revision');
}

function openCheckout() {
  const total = cartTotal();
  const isSeries = isSeriesCart();
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

  const schoolField = isSeries ? `
    <div class="field"><label for="cSchool">School / institution name</label>
      <input id="cSchool" placeholder="e.g. Sunrise Academy" />
      <div class="hint">Used as the "Bill to" on your invoice. Leave blank if ordering as an individual.</div></div>` : '';

  const submitLabel = PAY.mode === 'stk'
    ? `<svg class="icon" aria-hidden="true"><use href="#ic-phone"/></svg> Pay ${money(total)} with M-Pesa`
    : isSeries
      ? `<svg class="icon" aria-hidden="true"><use href="#ic-download"/></svg> Confirm &amp; download my paper${state.cart.length > 1 ? 's' : ''}`
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
        ${schoolField}
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
  const school = ($('#cSchool')?.value || '').trim();
  if (!name || !phone || !code) return;

  const cartItems = state.cart.slice();
  const isSeries = isSeriesCart();
  const items = cartItems.map(p => ({ id: p.id, title: p.title, price: p.price, grade: p.grade, term: p.term || null }));

  // Log the order to the backend — also gives us back a real order reference
  // to use as the invoice number. Falls back to a local one if the API is down.
  let reference = `ANG-${Date.now().toString(36).toUpperCase()}`;
  try {
    const r = await fetch(`${API}/api/checkout`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, email, school, mpesaCode: code, mode: 'manual', amount: cartTotal(), items }),
    });
    const data = await r.json();
    if (data?.reference) reference = data.reference;
  } catch { /* offline-safe: keep the locally generated reference */ }

  // Also open WhatsApp to you with the full order + code, so nothing depends on the API alone.
  const summary = items.map(p => `• ${p.title} (${money(p.price)})`).join('%0A');
  const msg =
    `Habari Angaza! I've paid and here's my order:%0A${summary}%0ATotal: ${money(cartTotal())}` +
    `%0AName: ${encodeURIComponent(name)}%0AWhatsApp: ${encodeURIComponent(phone)}` +
    (school ? `%0ASchool: ${encodeURIComponent(school)}` : '') +
    `%0AM-Pesa code: ${encodeURIComponent(code)}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank');

  if (isSeries) {
    showSeriesSuccess({ id: reference, date: new Date(), name, phone, email, school, code, items: cartItems, total: cartTotal() });
  } else {
    showSuccess(name, phone, 'manual');
  }
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

/* -------- Angaza Series Exams: instant download + invoice on the success screen -------- */
function showSeriesSuccess(order) {
  const downloads = order.items.map(p => `
    <a class="dl-row" href="${p.fileUrl || p.pdfUrl || '#'}" target="_blank" rel="noopener">
      <svg class="icon" aria-hidden="true"><use href="#ic-download"/></svg>
      <span>${p.title}${p.term && TERM_LABELS[p.term] ? ` — ${TERM_LABELS[p.term]}` : ''}</span>
    </a>`).join('');

  $('#modalCard').innerHTML = `
    <div class="success">
      <div class="ring"><svg class="icon" aria-hidden="true"><use href="#ic-check"/></svg></div>
      <h2>Order complete!</h2>
      <p>${order.name}, thanks for your order${order.school ? ` for ${order.school}` : ''}. Download your papers below.</p>
      <div class="dl-list">${downloads}</div>
      <div class="note">A copy of this order has also been sent to us on WhatsApp with your M-Pesa code — message us anytime if a link doesn't open.</div>
      <button class="btn btn-primary" id="viewInvoiceBtn" style="justify-content:center;width:100%;margin-top:14px">
        <svg class="icon" aria-hidden="true"><use href="#ic-printer"/></svg> View / print invoice
      </button>
      <button class="btn btn-ghost" data-x2 style="justify-content:center;width:100%;margin-top:10px">Done</button>
    </div>`;
  $('#viewInvoiceBtn').addEventListener('click', () => openInvoice(order));
  $('[data-x2]').addEventListener('click', () => closeOverlay($('#modalOverlay')));
}

function invoiceHTML(order) {
  const rows = order.items.map(p => `
    <tr>
      <td>${p.title}</td>
      <td>${gradeLabel(p.grade)}</td>
      <td>${p.term && TERM_LABELS[p.term] ? TERM_LABELS[p.term] : '—'}</td>
      <td style="text-align:right">${money(p.price)}</td>
    </tr>`).join('');
  const dateStr = order.date.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
  const billName = order.school || order.name;
  const billSub = order.school ? `${order.name}<br>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${order.id}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#17212B;padding:44px;max-width:720px;margin:0 auto}
  h1{color:#17324D;font-size:22px;margin:6px 0 0}
  .eyebrow{color:#E0A800;font-weight:700;font-size:12.5px;letter-spacing:.08em;text-transform:uppercase}
  .row{display:flex;justify-content:space-between;margin-top:30px;gap:24px;flex-wrap:wrap}
  .box h4{margin:0 0 6px;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:#667085}
  .box p{margin:0;font-size:14px;line-height:1.6}
  table{width:100%;border-collapse:collapse;margin-top:32px}
  th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#667085;border-bottom:2px solid #17324D;padding:8px 6px}
  td{padding:11px 6px;border-bottom:1px solid #ECEEF2;font-size:14px}
  tfoot td{border-bottom:none;font-weight:800;font-size:17px;padding-top:16px;color:#17324D}
  .foot{margin-top:44px;font-size:12.5px;color:#667085;border-top:1px solid #ECEEF2;padding-top:16px}
  .print-btn{margin-top:26px;padding:11px 24px;background:#17324D;color:#fff;border:none;border-radius:999px;font-weight:700;font-size:14px;cursor:pointer}
  @media print{.print-btn{display:none}}
</style></head>
<body>
  <span class="eyebrow">Invoice</span>
  <h1>Angaza (Angazakids)</h1>
  <div class="row">
    <div class="box"><h4>Bill to</h4><p><b>${billName}</b><br>${billSub}${order.phone}${order.email ? `<br>${order.email}` : ''}</p></div>
    <div class="box"><h4>Invoice details</h4><p>No. ${order.id}<br>Date: ${dateStr}<br>Payment: M-Pesa (ref ${order.code})</p></div>
  </div>
  <table>
    <thead><tr><th>Item</th><th>Grade</th><th>Term</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3">Total</td><td style="text-align:right">${money(order.total)}</td></tr></tfoot>
  </table>
  <p class="foot">Angaza — Bright Minds. Brighter Futures. &middot; hello@angaza.co.ke &middot; +254 748 519 923 &middot; Nairobi, Kenya</p>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</body></html>`;
}

function openInvoice(order) {
  const w = window.open('', '_blank');
  if (!w) { toast('Please allow pop-ups to view the invoice.'); return; }
  w.document.write(invoiceHTML(order));
  w.document.close();
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

/* ---------------------------------------------------------- menu (info links) */
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
