'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Number(n) > 0 ? 'GHS ' + Number(n).toLocaleString('en-GH') : 'Price soon';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let PRODUCTS = [], SET = { whatsapp: '233556699940', deliveryAccra: 0, deliveryOther: 0, freeDeliveryOver: 0, notice: '', payments: false };
const byId = id => PRODUCTS.find(p => p.id === id);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
};
async function getJSON(url, opts) {
  url = url.replace(/^\/api\/(settings|products)$/, 'api/$1.json');   // preview: the shop data is a saved copy
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Something went wrong');
  return j;
}
const wa = text => `https://wa.me/${SET.whatsapp}?text=${encodeURIComponent(text)}`;
const ICON = {
  menu: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h18M3 16h18"/></svg>',
  bag: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2"/></svg>',
  search: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>',
  saved: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20s-7-4.400-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.600-9 9-9 9z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 20s-7-4.400-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.600-9 9-9 9z"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 14l6-6 6 6"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 00-8.600 15.100L2 22l5-1.300A10 10 0 1012 2zm4.600 13.500c-.2.600-1.200 1.200-1.700 1.200-.4.100-1 .1-1.600-.1-.4-.1-.9-.3-1.500-.6-2.700-1.200-4.400-3.900-4.500-4.100-.1-.2-1.100-1.400-1.100-2.700s.7-1.900.9-2.200c.2-.2.500-.3.700-.3h.5c.2 0 .4 0 .6.500l.8 2c.1.200.1.400 0 .5l-.3.500-.4.400c-.1.200-.3.300-.1.600.2.300.8 1.300 1.700 2.100 1.100 1 2.100 1.300 2.400 1.500.3.100.5.100.6-.1l.9-1.100c.2-.2.400-.2.600-.1l1.900.9c.3.100.5.200.5.300.1.300.1.800-.1 1.400z"/></svg>'
};

// ---------- cart, wishlist, recently viewed ----------
const cart = {
  get() { return store.get('eq_cart', []); },
  set(v) { store.set('eq_cart', v); refreshCart(); },
  add(id, size) {
    const c = this.get(), p = byId(id);
    if (!p || p.available < 1) return toast('Sorry, this one has just been sold');
    const row = c.find(i => i.id === id);
    if (row) { row.size = size; toast('Already in your bag'); } else { c.push({ id, size, qty: 1 }); toast('Added to bag'); }
    this.set(c); bump();
  },
  remove(id) { this.set(this.get().filter(i => i.id !== id)); },
  lines() { return this.get().map(i => ({ ...i, p: byId(i.id) })).filter(i => i.p && i.p.available > 0); },
  subtotal() { return this.lines().reduce((s, i) => s + i.p.price * i.qty, 0); },
  clear() { this.set([]); }
};
const wish = {
  get() { return store.get('eq_wish', []); },
  has(id) { return this.get().includes(id); },
  toggle(id) { const w = this.get(), i = w.indexOf(id); i < 0 ? w.push(id) : w.splice(i, 1); store.set('eq_wish', w); return i < 0; }
};
const seen = {
  add(id) { store.set('eq_seen', [id, ...store.get('eq_seen', []).filter(x => x !== id)].slice(0, 12)); },
  get() { return store.get('eq_seen', []); }
};
function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200);
}
function bump() { const c = $('#cartCnt'); if (!c) return; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }

// ---------- shared chrome ----------
const CATS = ['Shirts', 'Sweaters', 'Polos', 'T-Shirts', 'Trousers', 'Jeans', 'Jackets'];
const MARQUEE = ['Hand-picked in Accra', 'Good quality, fair price', 'Pay with Mobile Money or card', 'One of a kind pieces', 'Delivery across Ghana', 'Order on WhatsApp'];
const SHOP_PAGES = ['index', 'shop', 'product', 'about', 'contact'];

function chrome(page) {
  const links = [['index.html', 'Home'], ['shop.html', 'Shop'], ['shop.html?g=Men', 'Men'], ['shop.html?g=Women', 'Ladies'], ['about.html', 'Our story'], ['contact.html', 'Contact']];
  $('#hdr').innerHTML = `
  <div id="prog" aria-hidden="true"></div>
  <div class="hdr" id="hdrbar"><div class="wrap bar">
    <div class="l"><button class="tbtn" id="openMenu" aria-label="Open menu">${ICON.menu}<span class="tl">Menu</span></button><button class="tbtn" id="openSearch" aria-label="Search">${ICON.search}<span class="tl">Search</span></button></div>
    <a class="logo" href="index.html" aria-label="équipe clothes store"><img src="images/logo.png" alt="équipe"></a>
    <div class="r"><a class="tbtn" href="shop.html?wish=1" aria-label="Saved items">${ICON.saved}<span class="tl">Saved</span><span class="cnt" id="wishCnt"></span></a><button class="tbtn" id="openCart" aria-label="Open bag">${ICON.bag}<span class="tl">Bag</span><span class="cnt" id="cartCnt"></span></button></div>
  </div></div>
  <div class="ov" id="ov"></div>
  <aside class="dr left" id="menu" aria-label="Menu"><header><h2>Menu</h2><button class="ibtn" data-close aria-label="Close">${ICON.x}</button></header>
    <div class="body nav">${links.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}<div class="sub">${CATS.map(c => `<a href="shop.html?c=${encodeURIComponent(c)}">${c}</a>`).join('')}</div></div></aside>
  <aside class="dr right" id="drawer" aria-label="Bag"><header><h2>Your bag</h2><button class="ibtn" data-close aria-label="Close">${ICON.x}</button></header>
    <div class="body" id="drawerBody"></div><footer id="drawerFoot"></footer></aside>
  <div class="srch" id="srch" hidden><div class="wrap"><div class="sbox"><input id="sq" type="search" placeholder="Search" aria-label="Search" autocomplete="off"><button class="ibtn" id="closeSearch" aria-label="Close search">${ICON.x}</button></div><div id="sres" class="sres"></div></div></div>`;
  $('#ftr').innerHTML = `
  <footer class="ft"><div class="wrap"><div class="g">
    <div><div class="logo"><img src="images/logo.png" alt="équipe" style="height:64px"></div><p style="margin-top:14px">Clothes picked by hand in Accra. Good quality, fair price, or it doesn't make the cut.</p>
      <a class="btn sm" id="ftWa" target="_blank" rel="noopener">Chat on WhatsApp</a></div>
    <div><h3>Shop</h3><ul><li><a href="shop.html?g=Men">Men</a></li><li><a href="shop.html?g=Women">Ladies</a></li>${CATS.map(c => `<li><a href="shop.html?c=${encodeURIComponent(c)}">${c}</a></li>`).join('')}</ul></div>
    <div><h3>Help</h3><ul><li><a href="about.html">Our story</a></li><li><a href="contact.html">Contact</a></li><li><a href="checkout.html">Bag</a></li><li><a href="delivery-returns.html">Delivery and returns</a></li><li><a href="admin.html">Staff</a></li></ul></div>
    <div><h3>Policies</h3><ul><li><a href="privacy.html">Privacy policy</a></li><li><a href="terms.html">Terms of sale</a></li><li><a href="delivery-returns.html">Delivery and returns</a></li><li><a href="cookies.html">Cookies</a></li></ul></div>
  </div><div class="copy">Accra, Ghana. WhatsApp +<span id="ftPhone"></span>. Payments by Paystack: cards and Mobile Money. © ${new Date().getFullYear()} équipe clothes store</div></div></footer>
  <button class="totop" id="totop" aria-label="Back to top">${ICON.up}</button>
  <a class="fab" id="fab" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><span class="lab">Chat with us</span>${ICON.chat}</a>`;
  const open = el => { el.classList.add('on'); $('#ov').classList.add('on'); document.body.style.overflow = 'hidden'; };
  const close = () => { $$('.dr.on').forEach(d => d.classList.remove('on')); $('#ov').classList.remove('on'); $('#srch').hidden = true; document.body.style.overflow = ''; };
  $('#openMenu').onclick = () => open($('#menu'));
  if (!store.get('eq_notice', false)) {   // one short notice: the site only uses what it needs to work
    const n = document.createElement('div'); n.className = 'cknote'; n.setAttribute('role', 'region'); n.setAttribute('aria-label', 'Cookies');
    n.innerHTML = '<p>We only use what this site needs to work: your bag and saved items stay on your device. No ads, no tracking. <a href="cookies.html">Cookies</a> &middot; <a href="privacy.html">Privacy</a></p><button class="btn sm" type="button">OK</button>';
    n.querySelector('button').onclick = () => { store.set('eq_notice', true); n.remove(); }; document.body.appendChild(n);
  }
  // signed in as staff: the menu also gets the staff admin and a Log out
  Promise.reject().then(r => { if (!r.ok) return; const nav = $('#menu .nav'); if (!nav) return;
    nav.insertAdjacentHTML('beforeend', '<div class="sub"><a href="admin.html">Staff admin</a><a href="#" id="staffOut">Log out</a></div>');
    $('#staffOut').onclick = async e => { e.preventDefault(); try { await fetch('/api/admin/logout', { method: 'POST' }); } catch (x) { /* fine */ } location.reload(); };
  }).catch(() => {});
  $('#openCart').onclick = () => { renderDrawer(); open($('#drawer')); };
  $('#ov').onclick = close; $$('[data-close]').forEach(b => b.onclick = close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  chrome.close = close; chrome.openCart = () => { renderDrawer(); open($('#drawer')); };
  // search overlay
  const sq = $('#sq'), sres = $('#sres');
  $('#openSearch').onclick = () => { $('#srch').hidden = false; $('#ov').classList.add('on'); sq.value = ''; sres.innerHTML = ''; setTimeout(() => sq.focus(), 50); };
  $('#closeSearch').onclick = close;
  sq.oninput = () => {
    const q = sq.value.trim().toLowerCase(); if (q.length < 2) { sres.innerHTML = ''; return; }
    const L = PRODUCTS.filter(p => (p.name + ' ' + p.category).toLowerCase().includes(q)).slice(0, 8);
    sres.innerHTML = L.map(p => `<a class="sr-row" href="product.html?id=${p.id}"><span class="th" style="background:${esc(p.bg)}"><img src="${esc(p.img)}" alt=""></span><span><b>${esc(p.name)}</b><br><small>${esc(p.category)}${p.available < 1 ? ' (sold)' : ''}</small></span><b>${money(p.price)}</b></a>`).join('')
      + (L.length ? `<p style="margin-top:12px"><a class="link" href="shop.html?q=${encodeURIComponent(q)}">See all results</a></p>` : '<p class="empty">No match. Try another word.</p>');
  };
  sq.onkeydown = e => { if (e.key === 'Enter' && sq.value.trim()) location.href = 'shop.html?q=' + encodeURIComponent(sq.value.trim()); };
  // scroll effects
  const bar = $('#hdrbar'), prog = $('#prog'), top = $('#totop'); let tick = false;
  const onScroll = () => {
    bar.classList.toggle('scrolled', scrollY > 4);
    const h = document.documentElement.scrollHeight - innerHeight; prog.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
    top.classList.toggle('on', scrollY > 700);
    const im = $('.hero .s.on .im img'); if (im && !reduced && scrollY < 900) im.style.setProperty('--py', (scrollY * .1) + 'px');
    tick = false;
  };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true }); onScroll();
  top.onclick = () => scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  $('#ftPhone').textContent = SET.whatsapp; $('#fab').href = wa('Hi équipe, I have a question.'); $('#ftWa').href = wa('Hi équipe, I have a question.');
  if (SHOP_PAGES.includes(page)) buildDock(page);
}

// Floating category dock. Drag it anywhere (up, down, left, right). Faint until you hover, then it opens.
function buildDock(page) {
  const d = document.createElement('nav'); d.className = 'dock'; d.id = 'dock'; d.setAttribute('aria-label', 'Categories');
  d.innerHTML = `<button class="grip" type="button" aria-label="Categories. Drag to move, Shift and arrow keys also move it." title="Drag me anywhere">${ICON.grip}<span>Shop</span><span class="cur" id="dockCur"></span></button>
    <div class="links" id="dockLinks">${['All', ...CATS, 'Saved'].map(c => `<a href="${c === 'All' ? 'shop.html' : c === 'Saved' ? 'shop.html?wish=1' : 'shop.html?c=' + encodeURIComponent(c)}" data-cat="${c}">${c}</a>`).join('')}<button class="rot" type="button" id="dockRot" aria-label="Switch to vertical column" title="Switch to vertical column"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12h16M16 8l4 4-4 4M8 8l-4 4 4 4"/></svg><span id="dockRotTxt">V</span></button></div>`;
  document.body.appendChild(d);
  const KEY = 'eq_dock', grip = $('.grip', d);
  const place = (x, y) => {
    x = Math.min(Math.max(8, x), Math.max(8, innerWidth - d.offsetWidth - 8)); y = Math.min(Math.max(8, y), Math.max(8, innerHeight - d.offsetHeight - 8));
    d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.transform = 'none'; return [x, y];
  };
  const home = () => place((innerWidth - d.offsetWidth) / 2, innerWidth < 641 ? 66 : 84);
  // layout: horizontal bar or vertical column (button inside the dock, remembered)
  const setMode = (v, keep) => {
    d.classList.toggle('v', v); $('#dockRotTxt').textContent = v ? 'H' : 'V'; $('#dockRot').title = $('#dockRot').ariaLabel = v ? 'Switch to horizontal bar' : 'Switch to vertical column'; store.set('eq_dock_mode', v ? 'v' : 'h');
    if (keep) requestAnimationFrame(() => { const r = d.getBoundingClientRect(); store.set(KEY, place(r.left, r.top)); });
  };
  setMode(store.get('eq_dock_mode', 'h') === 'v', false);
  $('#dockRot').addEventListener('click', () => setMode(!d.classList.contains('v'), true));
  const saved = store.get(KEY, null); saved ? place(saved[0], saved[1]) : home();
  let sx, sy, ox, oy, down = false, moved = false;
  grip.addEventListener('pointerdown', e => { down = true; moved = false; sx = e.clientX; sy = e.clientY; const r = d.getBoundingClientRect(); ox = r.left; oy = r.top; try { grip.setPointerCapture(e.pointerId); } catch (x) { /* synthetic pointer */ } });
  grip.addEventListener('pointermove', e => {
    if (!down) return; const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.abs(dx) + Math.abs(dy) > 5) { moved = true; d.classList.add('drag'); }
    if (moved) place(ox + dx, oy + dy);
  });
  const end = () => { if (!down) return; down = false; d.classList.remove('drag'); if (moved) { const r = d.getBoundingClientRect(); store.set(KEY, [r.left, r.top]); } };
  grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  grip.addEventListener('click', () => { if (moved) { moved = false; return; } d.classList.toggle('open'); }); // tap opens it on touch screens
  grip.addEventListener('keydown', e => {
    if (!e.shiftKey || !e.key.startsWith('Arrow')) return; e.preventDefault();
    const r = d.getBoundingClientRect(), s = 30, m = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    store.set(KEY, place(r.left + m[0], r.top + m[1]));
  });
  // keep it on screen when it grows or the window changes
  if ('ResizeObserver' in window) new ResizeObserver(() => { const r = d.getBoundingClientRect(); place(r.left, r.top); }).observe(d);
  addEventListener('resize', () => { const r = d.getBoundingClientRect(); place(r.left, r.top); });
  // on the shop page these filter in place instead of reloading
  d.addEventListener('click', e => {
    const a = e.target.closest('a[data-cat]'); if (!a || page !== 'shop' || !pages.shop.setCat) return;
    e.preventDefault(); pages.shop.setCat(a.dataset.cat);
  });
  buildDock.mark = (cat) => { $$('a[data-cat]', d).forEach(a => a.classList.toggle('on', a.dataset.cat === cat)); $('#dockCur').textContent = (!cat || cat === 'All') ? '' : '/ ' + cat; };
  buildDock.mark(page === 'shop' ? 'All' : '');
}

function refreshCart() {
  const n = cart.lines().reduce((s, i) => s + i.qty, 0);
  const c = $('#cartCnt'); if (c) c.textContent = n || '';
  const w = $('#wishCnt'); if (w) w.textContent = wish.get().filter(id => byId(id)).length || '';
  renderDrawer();
}
function renderDrawer() {
  const b = $('#drawerBody'), f = $('#drawerFoot'); if (!b) return;
  const L = cart.lines();
  if (!L.length) { b.innerHTML = '<p class="empty">Your bag is empty.</p>'; f.innerHTML = '<a class="btn full ghost" href="shop.html">Start shopping</a>'; return; }
  const sub = cart.subtotal(), over = SET.freeDeliveryOver;
  const prog = over > 0 ? `<div class="fd"><p>${sub >= over ? 'You have free delivery' : `Add ${money(over - sub)} more for free delivery`}</p><div class="fdbar"><i style="width:${Math.min(100, sub / over * 100)}%"></i></div></div>` : '';
  b.innerHTML = prog + L.map(i => `<div class="line"><a class="th" href="product.html?id=${i.id}" style="background:${esc(i.p.bg)}"><img src="${esc(i.p.img)}" alt=""></a>
    <div><h4>${esc(i.p.name)}</h4><small>${i.size ? 'Size ' + esc(i.size) : 'Size on request'}</small><br><button class="rm" data-rm="${i.id}">Remove</button></div><b>${money(i.p.price)}</b></div>`).join('');
  f.innerHTML = `<div class="tot"><span>Subtotal</span><span>${money(sub)}</span></div><a class="btn full" href="checkout.html">Checkout</a>`;
  $$('[data-rm]', b).forEach(x => x.onclick = () => cart.remove(x.dataset.rm));
}

// ---------- product card ----------
const card = (p, tag) => {
  const sold = p.available < 1, on = wish.has(p.id);
  return `<div class="card ${sold ? 'soldout' : ''}"><div class="pw"><a class="ph" href="product.html?id=${p.id}" style="background:${esc(p.bg)}" tabindex="-1" aria-hidden="true"><img src="${esc(p.img)}" alt="" loading="lazy" width="400" height="533">${p.images && p.images[1] ? `<img class="alt" src="${esc(p.images[1])}" style="background:${esc((p.bgs || [])[1] || p.bg)}" alt="" loading="lazy">` : ''}
    ${sold ? '<span class="soldmark" aria-label="Sold"><svg viewBox="0 0 120 120" width="96" height="96" role="img"><circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="60" y="71" text-anchor="middle" font-size="30" font-weight="800" letter-spacing="3" fill="currentColor" font-family="Inter,Arial,sans-serif">SOLD</text></svg></span>' : (tag ? `<span class="badge">${tag}</span>` : '')}</a>
    <button class="heart ${on ? 'on' : ''}" data-h="${p.id}" aria-label="Save ${esc(p.name)}" aria-pressed="${on}">${ICON.heart}</button>
    ${sold || !(p.price > 0) ? '' : `<button class="btn sm quick" data-q="${p.id}">${p.sizes.length > 1 ? 'Choose size' : 'Quick add'}</button>`}</div>
    <a class="tt" href="product.html?id=${p.id}"><h3>${esc(p.name)}</h3><div class="meta"><b>${money(p.price)}</b><span>${p.sizes.length ? 'Size ' + esc(p.sizes.join(', ')) : 'Size on request'}</span></div></a></div>`;
};
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.style.animationDelay = e.target.classList.contains('card') ? ((+e.target.dataset.d || 0) * 60) + 'ms' : ''; e.target.classList.add('in'); io.unobserve(e.target); if (e.target.dataset.count) countUp(e.target); }
}), { rootMargin: '0px 0px -40px 0px' }) : null;
function reveal(root) { $$('.card:not(.in), .rv:not(.in), [data-count]:not(.in)', root).forEach((el, i) => { el.dataset.d = i % 6; (io && !reduced) ? io.observe(el) : (el.classList.add('in'), el.dataset.count && countUp(el)); }); }
function countUp(el) {
  const to = +el.dataset.count, t0 = performance.now(), dur = reduced ? 1 : 1400;
  const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  setTimeout(() => { el.textContent = to; }, dur + 150);   // a background tab pauses animation frames: the final number still lands
}
document.addEventListener('click', e => {
  const h = e.target.closest('[data-h]'), q = e.target.closest('[data-q]');
  if (h) { const on = wish.toggle(h.dataset.h); h.classList.toggle('on', on); h.setAttribute('aria-pressed', on); toast(on ? 'Saved' : 'Removed from saved'); refreshCart(); if (pages.shop.isWish && pages.shop.isWish()) pages.shop.redraw(); }
  if (q) { const p = byId(q.dataset.q); if (!p) return; if (p.sizes.length > 1) location.href = 'product.html?id=' + p.id; else { cart.add(p.id, p.sizes[0] || ''); chrome.openCart(); } }
});

// ---------- pages ----------
// what a piece really is: its name first, then its category. Used for the label on cards and for the big word on the banner.
const KIND = p => { const n = p.name || '', has = r => r.test(n);
  if (has(/shoe|brogue|loafer|sneaker|boot/i)) return 'Shoes';
  if (has(/jogger/i)) return 'Joggers';
  if (has(/short/i) && p.category === 'Trousers') return 'Shorts';
  if (has(/cargo/i)) return 'Cargo';
  if (has(/overshirt/i)) return 'Overshirts';
  if (p.category === 'Shirts') return 'Shirts';
  if (has(/jean/i) || p.category === 'Jeans' || (has(/denim/i) && p.category === 'Trousers')) return 'Denim';
  if (has(/blazer/i) && !has(/cardigan/i)) return 'Blazers';
  if (has(/cardigan|sweater|knit|jumper/i)) return 'Knitwear';
  if (has(/polo/i)) return 'Polos';
  if (p.category === 'Tshirts' || p.category === 'T-Shirts') return 'T-Shirts';
  if (has(/jacket/i)) return 'Jackets';
  if (p.category === 'Suits') return 'Blazers';
  return p.category; };
const pages = {
  index() {
    const real = p => p.img && !String(p.img).endsWith('black.svg');
    const shown = PRODUCTS.filter(p => p.available > 0 && real(p));   // the home page never shows a black card
    // the big banner: every piece you selected in the admin, one after the other, with the background removed. The Virgil Abloh piece comes first and stays longest.
    const WORD = p => p.id === 'NW008' ? 'SS20' : KIND(p);
    const slideOf = p => {
      const virgil = p.id === 'NW008', size = (p.sizes || []).join(', ');
      return `<div class="s" data-ms="${virgil ? 10000 : 5500}"><div class="big" aria-hidden="true">${esc(WORD(p))}</div><div class="im" data-pid="${esc(p.id)}" style="background:transparent"><img src="images/banner-cut/${esc(p.id)}.png" alt="${esc(p.name)}"></div>
        <div class="t"><span class="eyebrow">${virgil ? 'Louis Vuitton &middot; Runway' : esc(KIND(p))}</span><h1>${esc(p.name)}</h1><p>${virgil ? 'Spring-Summer 2020. A fashion piece, and only one exists. ' : ''}${size ? 'Size ' + esc(size) + '. ' : ''}${money(p.price)}.</p><a class="btn" href="product.html?id=${esc(p.id)}">${virgil ? 'See the piece' : 'View this piece'}</a></div></div>`;
    };
    const startHero = () => {
      const sl = $$('.hero .s'), dots = $('#dots'); let k = 0, timer;
      if (!sl.length) return;
      if (sl.length > 12) dots.innerHTML = `<button aria-label="Next slide" style="font:600 11px/1 inherit;letter-spacing:.2em"><b id="hn">01</b> / ${String(sl.length).padStart(2, '0')}</button>`;
      else dots.innerHTML = sl.map((_, i) => `<button aria-label="Slide ${i + 1}" data-n="0${i + 1}"><i></i></button>`).join('');
      const go = i => {
        k = i; sl.forEach((x, j) => x.classList.toggle('on', j === i));
        if (sl.length > 12) { const h = $('#hn'); if (h) h.textContent = String(i + 1).padStart(2, '0'); } else [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
        clearTimeout(timer); if (!reduced) timer = setTimeout(() => go((k + 1) % sl.length), +sl[i].dataset.ms || 5500);
      };
      if (sl.length > 12) dots.firstChild.onclick = () => go((k + 1) % sl.length); else [...dots.children].forEach((d, i) => d.onclick = () => go(i));
      go(0);
    };
    fetch('api/banner-cut.json').then(r => r.json()).catch(() => []).then(cut => {
      const list = PRODUCTS.filter(p => p.banner && p.available > 0 && cut.includes(p.id)).sort((a, b) => (b.id === 'NW008') - (a.id === 'NW008'));
      if (list.length) $('.hero .slides').innerHTML = list.map(slideOf).join('');
      startHero();
    });
    const fresh = c => shown.find(p => /^(EQ|RB)\d/.test(p.id) && p.category === c) || shown.find(p => p.category === c);
    const flagged = PRODUCTS.filter(p => p.banner && p.available > 0);  // ticked "Use for banner" in the studio
    const heroIds = flagged.length ? flagged : ['EQ019', 'EQ047', 'EQ012', 'EQ035'].map(byId).filter(p => p && p.available > 0);
    const pick = [...heroIds, ...(flagged.length >= 5 ? [] : ['Suits', 'Sweaters', 'Shirts', 'Trousers', 'Jackets', 'Tshirts'].map(fresh).filter(Boolean))].filter((p, i, a) => a.findIndex(q => q.id === p.id) === i).slice(0, flagged.length > 5 ? 10 : 5);
    $('#banner').innerHTML = pick.map(p => `<a class="bcard" href="product.html?id=${p.id}"><span class="bph" style="background:${esc(p.bg)}"><img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy"></span><span class="bt"><b>${money(p.price)}</b>${esc(KIND(p))}${p.sizes.length ? ' &middot; ' + esc(p.sizes.join(', ')) : ''}</span></a>`).join('');
    fetch('api/banner-cut.json').then(r => r.json()).then(ids => {  // pictures whose background you removed in the admin
      if (!ids.length) return;
      $$('#banner .bcard').forEach(a => { const id = (a.getAttribute('href') || '').split('id=')[1]; if (ids.includes(id)) $('img', a).src = 'images/banner-cut/' + id + '.png?v=' + Date.now(); });
    }).catch(() => {});
    const newest = [...shown].reverse().slice(0, 12), feat = [...shown.filter(p => p.id === 'NW008'), ...shown.filter((p, i) => i % 9 === 0 && p.id !== 'NW008')].slice(0, 12);
    $('#new').innerHTML = newest.map(p => card(p, 'New')).join('');
    $('#feat').innerHTML = feat.map(p => card(p)).join('');
    const first = fresh;
    $('#tiles').innerHTML = ['Shirts', 'Sweaters', 'Trousers', 'Jackets'].map(c => first(c)).filter(Boolean).map(p =>
      `<a class="tile rv" href="shop.html?c=${encodeURIComponent(p.category)}" style="background:${esc(p.bg)}"><img src="${esc(p.img)}" alt="" loading="lazy"><span>${esc(p.category)}<small>${shown.filter(x => x.category === p.category).length} pieces</small></span></a>`).join('');
    $('#statPieces').dataset.count = shown.length; $('#statCats').dataset.count = new Set(shown.map(p => p.category)).size; $('#statSold').dataset.count = PRODUCTS.filter(p => p.available < 1).length;
    $$('.slider').forEach(s => { const r = $('.rail', s); $('.p', s).onclick = () => r.scrollBy({ left: -r.clientWidth * .8, behavior: 'smooth' }); $('.n', s).onclick = () => r.scrollBy({ left: r.clientWidth * .8, behavior: 'smooth' }); });
    $$('.stats b[data-count]').forEach(b => { b.textContent = b.dataset.count; });   // the real number is there even before the count-up plays
    reveal();
  },
  shop() {
    const q = new URLSearchParams(location.search);
    const st = { g: ['Men', 'Women'].includes(q.get('g')) ? q.get('g') : '', c: CATS.includes(q.get('c')) ? q.get('c') : 'All', q: q.get('q') || '', sort: q.get('sort') || 'new', size: q.get('size') || '', sold: q.get('sold') === '1', wish: q.get('wish') === '1', n: 25 };
    const sizes = [...new Set(PRODUCTS.flatMap(p => p.sizes))].sort((a, b) => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].indexOf(a) - ['XS', 'S', 'M', 'L', 'XL', 'XXL'].indexOf(b));
    $('#sizeSel').innerHTML = '<option value="">All sizes</option>' + sizes.map(s => `<option ${st.size === s ? 'selected' : ''}>${esc(s)}</option>`).join('');
    $('#title').insertAdjacentHTML('afterend', '<div class="gsw" role="group" aria-label="Men or Ladies"><button type="button" data-g="">All</button><button type="button" data-g="Men">Men</button><button type="button" data-g="Women">Ladies</button></div>');
    $$('.gsw button').forEach(b => b.onclick = () => { st.g = b.dataset.g; st.n = 25; draw(); history.replaceState(null, '', 'shop.html' + (st.g || st.c !== 'All' ? '?' + [st.g && 'g=' + st.g, st.c !== 'All' && 'c=' + encodeURIComponent(st.c)].filter(Boolean).join('&') : '')); });
    $('#search').value = st.q; $('#sort').value = st.sort; $('#soldChk').checked = st.sold;
    const draw = () => {
      const base = PRODUCTS.filter(p => (st.sold || p.available > 0) && (!st.wish || wish.has(p.id)) && (!st.size || p.sizes.includes(st.size)) && (!st.q || (p.name + ' ' + p.category).toLowerCase().includes(st.q.toLowerCase())));
      let L = base.filter(p => (st.c === 'All' || p.category === st.c) && (!st.g || p.gender === st.g || p.gender === 'Unisex'));   // Men and Ladies are kept apart; unisex pieces are in both
      if (st.sort === 'low') L.sort((a, b) => a.price - b.price); else if (st.sort === 'high') L.sort((a, b) => b.price - a.price); else L = L.slice().reverse();
      $('#title').textContent = st.wish ? 'Saved' : ((st.g ? (st.g === 'Women' ? 'Ladies' : 'Men') + (st.c === 'All' ? '' : ' / ' + st.c) : (st.c === 'All' ? 'All products' : st.c)));
      $$('.gsw button').forEach(b => b.classList.toggle('on', b.dataset.g === st.g));
      $('#list').innerHTML = L.slice(0, st.n).map(p => card(p)).join('') || `<p class="empty" style="grid-column:1/-1">${st.wish ? 'Tap the heart on any item to save it here.' : 'Nothing matches. Try another size or category.'}</p>`;
      $('#count').textContent = `${Math.min(st.n, L.length)} of ${L.length} items`;
      $('#more').hidden = st.n >= L.length;
      buildDock.mark && buildDock.mark(st.wish ? 'Saved' : st.c);
      reveal($('#list'));
    };
    pages.shop.redraw = draw; pages.shop.isWish = () => st.wish;
    pages.shop.setCat = c => {
      st.wish = c === 'Saved'; st.c = (c === 'Saved' || c === 'All') ? 'All' : c; st.n = 25; draw();
      history.replaceState(null, '', st.wish ? 'shop.html?wish=1' : 'shop.html' + (st.g || st.c !== 'All' ? '?' + [st.g && 'g=' + st.g, st.c !== 'All' && 'c=' + encodeURIComponent(st.c)].filter(Boolean).join('&') : ''));
      scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    };
    $('#search').oninput = e => { st.q = e.target.value; st.n = 25; draw(); };
    $('#sort').onchange = e => { st.sort = e.target.value; draw(); };
    $('#sizeSel').onchange = e => { st.size = e.target.value; st.n = 25; draw(); };
    $('#soldChk').onchange = e => { st.sold = e.target.checked; st.n = 25; draw(); };
    $('#more').onclick = () => { st.n += 25; draw(); };
    draw();
  },
  product() {
    const p = byId(new URLSearchParams(location.search).get('id'));
    const box = $('#pd');
    if (!p) { box.innerHTML = '<p class="empty">We could not find that item. <a href="shop.html"><u>Back to shop</u></a></p>'; return; }
    document.title = `${p.name} | équipe`; seen.add(p.id);
    {   // search engines and link previews: description, address, picture and product data for this piece
      const abs = u => new URL(u, location.href).href, desc = `${p.name}, ${p.category}${p.sizes.length ? ', size ' + p.sizes.join(', ') : ''}. ${money(p.price)}. Hand-picked by équipe, Accra. One piece only.`;
      const setM = (sel, attr, val, mk) => { let e = document.head.querySelector(sel); if (!e) { e = document.createElement(mk[0]); e.setAttribute(mk[1], mk[2]); document.head.appendChild(e); } e.setAttribute(attr, val); };
      setM('meta[name=description]', 'content', desc, ['meta', 'name', 'description']);
      setM('link[rel=canonical]', 'href', abs('product.html?id=' + p.id), ['link', 'rel', 'canonical']);
      setM('meta[property="og:title"]', 'content', `${p.name} | équipe`, ['meta', 'property', 'og:title']);
      setM('meta[property="og:description"]', 'content', desc, ['meta', 'property', 'og:description']);
      setM('meta[property="og:image"]', 'content', abs(p.img), ['meta', 'property', 'og:image']);
      setM('meta[property="og:url"]', 'content', abs('product.html?id=' + p.id), ['meta', 'property', 'og:url']);
      const ld = document.createElement('script'); ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p.name, image: (p.images && p.images.length ? p.images : [p.img]).map(abs), description: desc, category: p.category, sku: p.id, brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
        offers: { '@type': 'Offer', priceCurrency: 'GHS', price: String(p.price), itemCondition: 'https://schema.org/UsedCondition', availability: p.available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut', url: abs('product.html?id=' + p.id) } });
      document.head.appendChild(ld);
    }
    const sold = p.available < 1, soon = !(p.price > 0); let size = p.sizes[0] || ''; const imgs = p.images && p.images.length ? p.images : [p.img];
    const trust = ['Hand-checked by équipe', 'Secure Paystack payment', 'Quick replies on WhatsApp'];
    box.innerHTML = `<div class="gal"><div class="pic zoom" id="zoom" style="background:${esc(p.bg)}"><img id="mainImg" src="${esc(p.img)}" alt="${esc(p.name)}" width="800" height="1000">${sold ? '<span class="soldmark" aria-label="Sold"><svg viewBox="0 0 120 120" width="96" height="96" role="img"><circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="60" cy="60" r="47" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="60" y="71" text-anchor="middle" font-size="30" font-weight="800" letter-spacing="3" fill="currentColor" font-family="Inter,Arial,sans-serif">SOLD</text></svg></span>' : ''}<button class="heart big ${wish.has(p.id) ? 'on' : ''}" data-h="${p.id}" aria-label="Save">${ICON.heart}</button></div>
    ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, k) => `<button type="button" class="${k ? '' : 'on'}" data-i="${k}" aria-label="${esc((p.imgLabels || [])[k] || (k ? 'Back view' : 'Front view'))}" style="background:${esc((p.bgs || [])[k] || p.bg)}"><img src="${esc(u)}" alt=""><span>${esc((p.imgLabels || [])[k] || (k ? 'Back' : 'Front'))}</span></button>`).join('')}</div>` : ''}</div>
    <div class="det"><div class="crumb"><a href="shop.html">Shop</a> / <a href="shop.html?c=${encodeURIComponent(p.category)}">${esc(p.category)}</a></div>
      <h1>${esc(p.name)}</h1><div class="price">${money(p.price)}</div>
      ${p.sizes.length ? `<div class="lbl">Size</div><div class="sizes" id="sizes">${p.sizes.map(s => `<button type="button" class="${s === size ? 'on' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '<p class="note">Size is confirmed on WhatsApp before we send it.</p><br>'}
      ${sold ? '<p class="note err">This piece has been sold.</p><br><a class="btn ghost full" href="shop.html">Keep shopping</a>' : soon ? '<div class="buy" id="buy"><a class="btn wa full" id="waBuy" target="_blank" rel="noopener">Ask about this piece on WhatsApp</a></div><p class="note">Price coming soon.</p>' :
        `<div class="buy" id="buy"><button class="btn full" id="add">Add to bag</button><a class="btn wa full" id="waBuy" target="_blank" rel="noopener">Order on WhatsApp</a></div>`}
      <div class="acc">
        ${p.description ? `<details open><summary>About this piece</summary><p>${esc(p.description)}</p></details>` : ''}
        <details ${p.description ? '' : 'open'}><summary>Details</summary>${p.details && p.details.length
          ? `<table class="spec">${p.details.map(d => `<tr><th>${esc(d.label)}</th><td>${esc(d.value)}</td></tr>`).join('')}</table>`
          : `<p>${esc(p.category)}, size ${p.sizes.length ? esc(p.sizes.join(', ')) : 'on request'}. Hand-picked and checked by équipe.</p>`}
          <p class="note">Message us on WhatsApp for more measurements or photos.</p></details>
        <details><summary>In our stock room</summary><img class="stock" src="images/banner.jpg" alt="Folded clothes with tags on the shelves at the équipe stock room" loading="lazy"><p>Every piece is checked and folded before it is sent.</p></details>
        <details><summary>Payment</summary><p>Pay with Mobile Money or card through Paystack. You never type payment details on our site. You get your order number straight away.</p></details>
        <details><summary>Delivery and pickup</summary><p>We deliver in Accra and across Ghana, or you can pick up in Accra. We message you on WhatsApp to confirm the details.</p></details>
      </div>
      ${sold || soon ? '' : '<p class="scarce"><i></i>One piece only. First to pay gets it.</p>'}
      <ul class="trust">${trust.map(t => `<li><svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5 9-10"/></svg>${t}</li>`).join('')}</ul>
      <button class="share" id="share">Share this item</button></div>`;
    const waUpdate = () => { const a = $('#waBuy'); if (a) a.href = wa(`Hi équipe, I want to order: ${p.name}${size ? ' (size ' + size + ')' : ''}, ${money(p.price)}`); }; waUpdate();
    $$('#sizes button').forEach(b => b.onclick = () => { size = b.dataset.s; $$('#sizes button').forEach(x => x.classList.toggle('on', x === b)); waUpdate(); });
    if ($('#add')) $('#add').onclick = () => { cart.add(p.id, size); chrome.openCart(); };
    $('#share').onclick = async () => { try { if (navigator.share) await navigator.share({ title: p.name, url: location.href }); else { await navigator.clipboard.writeText(location.href); toast('Link copied'); } } catch (e) { /* cancelled */ } };
    if (!sold && !soon) { const bar = document.createElement('div'); bar.className = 'sticky-buy'; bar.innerHTML = `<div><b>${money(p.price)}</b><small>${esc(p.name)}</small></div><button class="btn" id="add2">Add to bag</button>`; document.body.appendChild(bar); $('#add2').onclick = () => $('#add').click(); }
    $$('.thumbs button').forEach(b => b.onclick = () => { $('#mainImg').src = imgs[+b.dataset.i]; $('#zoom').style.background = (p.bgs || [])[+b.dataset.i] || p.bg; $$('.thumbs button').forEach(x => x.classList.toggle('on', x === b)); });
    const z = $('#zoom'), zi = $('img', z);
    if (matchMedia('(hover:hover) and (min-width:1001px)').matches && !reduced) {
      z.addEventListener('pointermove', e => { const r = z.getBoundingClientRect(); zi.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`; });
      z.classList.add('canzoom');
    }
    $('#related').innerHTML = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id && x.available > 0).slice(0, 5).map(x => card(x)).join('');
    const rv = seen.get().filter(id => id !== p.id).map(byId).filter(Boolean).slice(0, 5);
    if (rv.length) { $('#seenWrap').hidden = false; $('#seen').innerHTML = rv.map(x => card(x)).join(''); }
    reveal();
  },
  checkout() {
    const L = cart.lines();
    const form = $('#co');
    if (!L.length) { $('#coWrap').innerHTML = '<p class="empty">Your bag is empty. <a href="shop.html"><u>Start shopping</u></a></p>'; return; }
    const fee = () => { const a = form.area.value; if (a === 'pickup') return 0; if (SET.freeDeliveryOver > 0 && cart.subtotal() >= SET.freeDeliveryOver) return 0; return a === 'accra' ? SET.deliveryAccra : SET.deliveryOther; };
    const sum = () => {
      const sub = cart.subtotal(), d = fee();
      $('#sumLines').innerHTML = L.map(i => `<div class="line"><div class="th" style="background:${esc(i.p.bg)}"><img src="${esc(i.p.img)}" alt=""></div><div><h4>${esc(i.p.name)}</h4><small>${i.size ? 'Size ' + esc(i.size) : 'Size on request'}</small><br><button type="button" class="rm" data-rm="${i.id}">Remove</button></div><b>${money(i.p.price)}</b></div>`).join('');
      $$('#sumLines [data-rm]').forEach(x => x.onclick = () => { cart.remove(x.dataset.rm); location.reload(); });
      $('#sumTot').innerHTML = `<div class="r"><span>Subtotal</span><span>${money(sub)}</span></div><div class="r"><span>Delivery</span><span>${d ? money(d) : (form.area.value === 'pickup' ? 'Pickup' : 'Fee confirmed on WhatsApp')}</span></div><div class="r t"><span>Total</span><span>${money(sub + d)}</span></div>`;
      $('#addrRow').hidden = form.area.value === 'pickup';
      $('#waOrder').href = wa(`Hi équipe, I want to order:\n${L.map(i => `1 x ${i.p.name}${i.size ? ' (size ' + i.size + ')' : ''} - ${money(i.p.price)}`).join('\n')}\nTotal: ${money(sub + d)}`);
    };
    $$('input[name=area]').forEach(r => r.onchange = sum); sum();
    form.onsubmit = async e => {
      e.preventDefault();
      const err = $('#err'), btn = $('#pay'); err.hidden = true;
      if (!SET.payments) { err.textContent = 'Online payment is not on yet. Please use "Order on WhatsApp".'; err.hidden = false; return; }
      btn.disabled = true; btn.textContent = 'Starting payment...';
      try {
        const f = new FormData(form);
        const r = await getJSON('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          items: L.map(i => ({ id: i.id, size: i.size, qty: i.qty })),
          customer: { name: f.get('name'), phone: f.get('phone'), email: f.get('email'), area: f.get('area'), address: f.get('address'), notes: f.get('notes') } }) });
        location.href = r.url;
      } catch (x) { err.textContent = x.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Pay now'; }
    };
  },
  order() {
    const ref = new URLSearchParams(location.search).get('ref') || '';
    const box = $('#orderBox'); let tries = 0;
    if (!/^EQ[A-Z0-9]+$/.test(ref)) { box.innerHTML = '<p class="note err">We could not find that order.</p>'; return; }
    const show = async () => {
      let o; try { o = await getJSON('/api/order/' + ref); } catch (e) { box.innerHTML = `<p class="note err">${esc(e.message)}</p>`; return; }
      const lines = o.items.map(i => `<div class="line" style="grid-template-columns:1fr auto"><div><h4>${esc(i.name)}</h4><small>${i.size ? 'Size ' + esc(i.size) : ''}</small></div><b>${money(i.price)}</b></div>`).join('');
      const tot = `<div class="sum"><div class="r"><span>Subtotal</span><span>${money(o.subtotal)}</span></div><div class="r"><span>Delivery</span><span>${o.delivery ? money(o.delivery) : (o.area === 'pickup' ? 'Pickup' : 'Fee confirmed on WhatsApp')}</span></div><div class="r t"><span>Total</span><span>${money(o.total)}</span></div></div>`;
      const ask = wa(`Hi équipe, my order ${o.ref}`);
      if (o.status === 'paid' || o.status === 'fulfilled') {
        cart.clear();
        box.innerHTML = `<div class="done"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 27l8 8 14-16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="note ok"><b>Thank you, ${esc(o.name)}. Payment received.</b><br>Your order number is <b>${esc(o.ref)}</b>. We will message you on WhatsApp to arrange ${o.area === 'pickup' ? 'pickup' : 'delivery'}.</div><br>${lines}${tot}<br><a class="btn" href="doc.html?type=receipt&ref=${esc(o.ref)}" target="_blank" rel="noopener">View or print your receipt${o.receiptNo ? ' (' + esc(o.receiptNo) + ')' : ''}</a> <a class="btn wa" target="_blank" rel="noopener" href="${ask}">Message us on WhatsApp</a> <a class="btn ghost" href="shop.html">Keep shopping</a>`;
      } else if (o.status === 'cancelled') {
        box.innerHTML = `<div class="note err">This order was cancelled.</div><br><a class="btn ghost" href="shop.html">Back to shop</a>`;
      } else {
        box.innerHTML = `<div class="note"><b>Waiting for your payment to be confirmed.</b><br>If you already paid, this page updates by itself. Order number: <b>${esc(o.ref)}</b>.</div><br>${lines}${tot}<br><a class="btn wa" target="_blank" rel="noopener" href="${ask}">Paid but not confirmed? Message us</a>`;
        if (++tries < 20) setTimeout(show, 3000);
      }
    };
    show();
  },
  contact() {
    $('#waLink').href = wa('Hi équipe, I have a question.'); $('#phoneTxt').textContent = '+' + SET.whatsapp.replace(/^(\d{3})(\d{2})(\d{3})(\d{4})$/, '$1 $2 $3 $4');
  },
  about() { $('#aboutWa').href = wa('Hi équipe, I would like to shop.'); reveal(); },
  cart() { location.replace('checkout.html'); }
};

async function boot() {
  const page = document.body.dataset.page;
  try { [SET, PRODUCTS] = await Promise.all([getJSON('/api/settings'), getJSON('/api/products')]); }
  catch (e) { document.body.insertAdjacentHTML('afterbegin', '<p class="note err" style="margin:16px">The shop could not load. Please refresh.</p>'); }
  chrome(page);
  document.body.insertAdjacentHTML('afterbegin', '<div class="pvnote">PREVIEW SITE. Ordering is switched off here. Message us on WhatsApp to order.</div>');
  const strip = $('#strip'); if (strip) { const t = SET.notice || (SET.freeDeliveryOver > 0 ? `Free delivery in Accra on orders over ${money(SET.freeDeliveryOver)}` : ''); strip.textContent = t; strip.hidden = !t; }
  const mq = $('#marq'); if (mq) { const row = MARQUEE.map(t => `<span>${t}</span>`).join(''); mq.innerHTML = `<div class="track">${row}${row}</div>`; }
  refreshCart();
  if (pages[page]) pages[page]();
  reveal();
}
// Garments cut out of their background are shown at the same visual size (same share of the box),
// so a tall pair of trousers and a wide sweater look equally big. Pictures that are not cut out are left as they are.
function sizeCut(img) {
  const box = img.closest('.ph, .bph, .tile'); if (!box || !/\/images\/cut\//.test(img.src) || img.classList.contains('alt') || !img.naturalWidth) return;
  const cw = box.clientWidth, ch = box.clientHeight; if (!cw || !ch) return;
  const big = (document.body.dataset.page === 'shop' && box.matches('.ph')) || box.matches('.bph'); // shop cards and the Fresh cards: garment shown large and centred, like the banner
  const ar = img.naturalWidth / img.naturalHeight; let w = Math.sqrt((big ? 0.8 : 0.5) * cw * ch * ar), h = w / ar;
  const lim = big ? 0.97 : 0.94, k = Math.min(1, cw * lim / w, ch * lim / h); w *= k; h *= k;
  Object.assign(img.style, { position: 'absolute', width: w + 'px', height: h + 'px', left: (cw - w) / 2 + 'px', top: (ch - h) / 2 + 'px' });
}
document.addEventListener('load', e => { if (e.target.tagName === 'IMG') sizeCut(e.target); }, true);
addEventListener('resize', () => document.querySelectorAll('img').forEach(sizeCut));
document.addEventListener('DOMContentLoaded', boot);
