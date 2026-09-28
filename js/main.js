import * as E from './engine.js';
import { CARDS, TYPES, AGENCIES, SET_SIZE } from './data/cards.js';
import { CHARACTERS, PAIRINGS } from './data/characters.js';
import { SCENARIOS, getScenario, normalizeCode } from './data/scenarios.js';
import { DILEMMAS } from './data/dilemmas.js';
import { art, portrait, cardBack, DEFS } from './art.js';
import * as FX from './fx.js';

const app = document.getElementById('app');
const overlays = document.getElementById('overlay-root');
const toasts = document.getElementById('toast-root');
document.body.insertAdjacentHTML('afterbegin', DEFS);

let S = null;
let IMG = {};
let shownMoney = null;
const setup = { name: '', code: 'MAPLE', charId: null };

// ───────────────────────── helpers ─────────────────────────
const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => [...r.querySelectorAll(q)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage blocked */ } },
};
const save = () => { if (S) store.set('pt-save-v2', JSON.stringify(S)); };
const loadSave = () => { try { const s = JSON.parse(store.get('pt-save-v2')); return s?.v === 2 ? s : null; } catch { return null; } };
const k$ = (n) => { const a = Math.abs(n); const t = a >= 1000 ? `$${(a / 1000).toFixed(a % 1000 && a < 10000 ? 1 : 0)}K` : `$${a}`; return t; };
const imgSrc = (slug) => IMG[slug]?.file || `assets/img/${slug}.webp`;
const flagSrc = (slug) => IMG[slug]?.file || `assets/img/${slug}.svg`;
const boss = () => (S?.track === 'h2a' ? 'farm' : 'boss');

async function loadCredits() {
  try { const r = await fetch('assets/img/credits.json', { cache: 'no-cache' }); if (r.ok) for (const c of await r.json()) IMG[c.slug] = c; } catch { /* offline */ }
}
function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  toasts.appendChild(t);
  setTimeout(() => t.remove(), 3800);
}
function log(icon, text) { if (S) { S.log.unshift({ year: E.yearOf(S), icon, text }); S.log = S.log.slice(0, 60); } }

// ───────────────────────── cards ─────────────────────────
function coin(c) {
  if (c.type === 'money') return `<div class="c-coin plus">+${k$(c.amount)}</div>`;
  if (c.type === 'bill') return `<div class="c-coin minus">−${k$(c.amount)}</div>`;
  if (c.type === 'wait') return `<div class="c-coin minus">${c.ttl}<small>TURN${c.ttl > 1 ? 'S' : ''}</small></div>`;
  if (c.type === 'form') {
    if (!c.fee) return '<div class="c-coin free">FREE</div>';
    return `<div class="c-coin ${c.payer === 'you' ? '' : 'boss'}">${k$(c.fee)}<small>${c.payer === 'you' ? 'YOU' : c.agency === 'DOL' || ['farm-request'].includes(c.id) ? 'BOSS' : 'BOSS'}</small></div>`;
  }
  if (c.type === 'action') {
    const cost = c.cost?.[S?.track || 'h1b'] ?? 0;
    return cost ? `<div class="c-coin">${k$(cost)}<small>YOU</small></div>` : '<div class="c-coin free">FREE</div>';
  }
  if (c.cost) return `<div class="c-coin">${k$(c.cost)}<small>YOU</small></div>`;
  return '';
}
function cardHTML(id, { down = false, uid = '', ttl, cls = '', hot = false } = {}) {
  const c = CARDS[id];
  const t = TYPES[c.type];
  const turns = c.type === 'form' ? (typeof c.turns === 'string' ? '⏱ NEXT TURN' : c.turns ? `⏱ ${c.turns} TURN` : '⏱ SAME TURN') : c.type === 'wait' ? `STUCK ${ttl ?? c.ttl}` : '';
  return `<div class="card t-${c.type} r-${c.rarity} ${down ? 'down' : ''} ${hot ? 'hot' : ''} ${cls}" data-id="${id}" data-uid="${uid}" tabindex="0" role="button" aria-label="${esc(c.name)}, ${t.label} card">
    <div class="card-inner">
      <div class="face front">
        <div class="c-head"><div class="c-name">${esc(c.name)}</div>${coin(c)}</div>
        <div class="c-art">${art(c.art, c.type)}<div class="foil"></div></div>
        <div class="c-type"><b>${t.label} · ${AGENCIES[c.agency].short}</b><span>${esc(c.formNo || '')}</span></div>
        <div class="c-text">${esc(c.text)}</div>
        <div class="c-foot"><span>${String(c.no).padStart(3, '0')}/${SET_SIZE}</span><span class="gem"></span>${turns ? `<span class="chip">${turns}</span>` : '<span></span>'}</div>
      </div>
      <div class="face back">${cardBack()}</div>
    </div>
  </div>`;
}
function charCardHTML(id, { cls = '' } = {}) {
  const ch = CHARACTERS[id];
  return `<div class="card t-char r-rare ${cls}" style="--c:${ch.color}" data-char="${id}">
    <div class="card-inner"><div class="face front">
      <div class="c-head"><div class="c-name">${ch.name}</div><div class="c-coin free">${k$(ch.startMoney)}<small>START</small></div></div>
      <div class="c-art">${portrait(id)}<div class="foil"></div></div>
      <div class="c-type"><b>${esc(ch.role)}</b><span>${esc(ch.country)}</span></div>
      <div class="c-stats">
        <div><b>Visa</b>${ch.track === 'h1b' ? 'Skilled worker (H-1B)' : 'Farm season (H-2A)'}</div>
        <div><b>Family</b>${esc(ch.family)} (${esc(ch.familyRole)})</div>
      </div>
      <div class="c-foot"><span>${ch.home.split(',')[0].toUpperCase()}</span><span class="gem"></span><span class="chip">PLAYER</span></div>
    </div><div class="face back">${cardBack()}</div></div>
  </div>`;
}
document.addEventListener('pointermove', (e) => {
  const card = e.target.closest?.('.card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
  card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
}, { passive: true });

// ───────────────────────── overlays ─────────────────────────
function overlay(html, { cls = '', close = true, onClose, bare = false } = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = bare ? html : `<div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  overlays.appendChild(ov);
  let done = false;
  const shut = () => { if (done) return; done = true; ov.remove(); onClose && onClose(); };
  if (close) {
    ov.addEventListener('click', (e) => { if (e.target === ov) shut(); });
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') shut(); });
  }
  $$('[data-close]', ov).forEach((b) => (b.onclick = shut));
  setTimeout(() => ($('.btn.go', ov) || $('button', ov))?.focus(), 60);
  return { el: ov, shut };
}
const clearOverlays = () => { overlays.innerHTML = ''; };
function resultSheet(res) {
  const icon = { rejected: '❌', missing: '📎', approved: '✅', filed: '📬', saved: '🛡️', help: '🧭' }[res.kind] || '💬';
  return new Promise((resolve) => {
    overlay(`<div style="font-size:52px;line-height:1">${icon}</div><h2>${esc(res.title || '')}</h2><p>${esc(res.text || '')}</p>
      <div class="row" style="justify-content:center"><button class="btn go" data-close>OK</button></div>`, { cls: 'result-sheet', onClose: resolve });
  });
}
function confirmSheet(title, text, yes) {
  return new Promise((resolve) => {
    let ok = false;
    const { el, shut } = overlay(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><button class="btn" data-close>Cancel</button><button class="btn go" id="yes">${esc(yes)}</button></div>`, { onClose: () => resolve(ok) });
    $('#yes', el).onclick = () => { ok = true; shut(); };
  });
}

// ───────────────────────── TITLE ─────────────────────────
function renderTitle() {
  clearOverlays();
  S = null;
  const saved = loadSave();
  app.innerHTML = `
  <section class="screen"><div class="title">
    <div>
      <h1 class="wordmark">Paper<span>Trail</span></h1>
      <p class="tagline">A card game about coming to the U.S. to work. Open packs, file forms, make hard choices, and see how long the road really is.</p>
      <div class="title-actions">
        <button class="btn go big bounce" id="new">Play</button>
        ${saved && !saved.over ? `<button class="btn big" id="cont">Continue ${esc(CHARACTERS[saved.charId].name)}</button>` : ''}
      </div>
      <div class="title-links">
        <a href="teacher.html">Teacher guide</a>
        <a href="credits.html">Credits</a>
        <button id="snd">${FX.isMuted() ? 'Sound: off' : 'Sound: on'}</button>
      </div>
      <div class="set-line">2026 EDITION · ${SET_SIZE} CARDS · 3 PLAYERS</div>
    </div>
    <div class="fan">${charCardHTML('marco')}${charCardHTML('priya')}${charCardHTML('lukas')}</div>
  </div></section>`;
  $$('.fan .card').forEach((c, i) => {
    c.style.transform = `translate(-50%,-50%) translate(${(i - 1) * 130}px, ${Math.abs(i - 1) * 22}px) rotate(${(i - 1) * 10}deg)`;
    c.style.zIndex = i === 1 ? 3 : 1;
  });
  $('#new').onclick = () => { FX.sound('click'); renderSetup(); };
  if ($('#cont')) $('#cont').onclick = () => { S = saved; resume(); };
  $('#snd').onclick = () => { FX.setMuted(!FX.isMuted()); renderTitle(); };
}

// ───────────────────────── SETUP ─────────────────────────
function renderSetup() {
  setup.name = store.get('pt-name') || setup.name;
  setup.code = store.get('pt-code') || setup.code;
  app.innerHTML = `
  <section class="screen"><div class="setup">
    <h2>Pick your player</h2>
    <div class="fields">
      <div class="field"><label for="pname">Your first name</label><input id="pname" maxlength="20" autocomplete="off" value="${esc(setup.name)}" placeholder="First name"><div class="help">Only saved on this computer.</div></div>
      <div class="field"><label for="pcode">Table code</label><input id="pcode" class="code" maxlength="12" autocomplete="off" value="${esc(setup.code)}">
        <div class="codes">${SCENARIOS.map((s) => `<button data-code="${s.id}">${s.id}</button>`).join('')}</div>
        <div class="help" id="scn"></div></div>
    </div>
    <div class="pick-row">${Object.keys(CHARACTERS).map((id) => `<button class="char-pick" data-char="${id}" aria-label="Play as ${CHARACTERS[id].name}"><img class="pick-flag" src="${flagSrc(CHARACTERS[id].flag)}" alt="" onerror="this.remove()">${charCardHTML(id)}</button>`).join('')}</div>
    <div class="setup-foot">
      <div class="pair-tip"><b>Sit with a partner and type the same table code.</b> Try ${PAIRINGS.map((p) => `${CHARACTERS[p.a].name} + ${CHARACTERS[p.b].name}`).join(', or ')}.</div>
      <div style="display:flex;gap:12px"><button class="btn" id="back">Back</button><button class="btn go big" id="start" disabled>Start</button></div>
    </div>
  </div></section>`;
  const upd = () => {
    const sc = getScenario($('#pcode').value);
    setup.code = sc.code;
    $('#scn').innerHTML = `<b>${esc(sc.name)}:</b> ${esc(sc.summary)}`;
    $$('.codes button').forEach((b) => b.classList.toggle('on', b.dataset.code === sc.id));
  };
  $('#pcode').addEventListener('input', upd);
  $$('.codes button').forEach((b) => (b.onclick = () => { $('#pcode').value = b.dataset.code; upd(); FX.sound('click'); }));
  upd();
  $$('.char-pick').forEach((b) => (b.onclick = () => {
    setup.charId = b.dataset.char;
    $$('.char-pick').forEach((x) => x.classList.toggle('on', x === b));
    $('#start').disabled = false;
    FX.sound('flip');
  }));
  if (setup.charId) { $(`.char-pick[data-char="${setup.charId}"]`).classList.add('on'); $('#start').disabled = false; }
  $('#back').onclick = renderTitle;
  $('#start').onclick = () => {
    setup.name = $('#pname').value.trim().slice(0, 20);
    store.set('pt-name', setup.name);
    store.set('pt-code', setup.code);
    renderIntro();
  };
}

// ───────────────────────── INTRO ─────────────────────────
function renderIntro() {
  const ch = CHARACTERS[setup.charId];
  app.innerHTML = `
  <section class="screen"><div class="intro">
    ${charCardHTML(ch.id)}
    <div>
      <h2>${esc(setup.name ? `${setup.name}, you're ${ch.name}` : `You're ${ch.name}`)}</h2>
      <p>${esc(ch.intro)}</p>
      <div class="goal"><b>Goal:</b> ${esc(ch.goal)}</div>
      <div class="steps3">
        <div><b>1 · Open</b>Each turn, tear open a pack of cards.</div>
        <div><b>2 · Play</b>Drag forms onto your road in the right order. Too early = rejected!</div>
        <div><b>3 · Decide</b>End each turn with one hard choice. Then compare with your partner.</div>
      </div>
      <p class="fine">8 turns, about 1.5 years each (${E.TURN_YEARS[0]}–${E.TURN_YEARS[7]}). The characters are made up, but the forms, fees and wait times come from real U.S. law in 2026.</p>
      <div style="display:flex;gap:12px;margin-top:18px"><button class="btn" id="back">Change player</button><button class="btn go big bounce" id="go">Begin</button></div>
    </div>
  </div></section>`;
  $('#back').onclick = renderSetup;
  $('#go').onclick = () => {
    S = E.newGame({ code: setup.code, charId: setup.charId, name: setup.name });
    S.tips = {};
    shownMoney = S.money;
    beginTurn();
  };
}

// ───────────────────────── BOARD ─────────────────────────
function sayText() {
  if (S.over) return 'Your journey is over.';
  if (!S.packOpened) return `Turn ${S.turn}: open your pack to get new cards.`;
  const orders = [S.order, ...(S.flags.sponsored ? [S.permOrder] : [])];
  for (const order of orders) {
    for (const id of order) {
      const t = E.stepDef(id);
      const st = S.steps[id];
      if (st.status === 'approved') continue;
      if (t.kind === 'season') return S.status === 'season' ? 'You\'re in! Finish your turn to work the harvest.' : 'Get across the border to work the harvest.';
      if (st.status === 'missing') return `Waiting on papers. Find: ${st.missing.map((d) => CARDS[d].name).join(' and ')}.`;
      if (st.status === 'pending') {
        if (S.track === 'h2a' && order === S.order) continue;
        return t.kind === 'lottery' ? 'You\'re in the lottery. Results next turn. Finish your turn.' : `"${CARDS[t.card].name}" is being reviewed. Finish your turn.`;
      }
      if (st.status === 'waiting' || t.kind === 'wait') return st.status === 'waiting' ? 'You\'re waiting in line. There\'s nothing to send. Finish your turn.' : 'Keep going! Get your ticket number first.';
      const name = CARDS[t.card].name;
      return S.hand.some((h) => h.id === t.card) ? `Drag "${name}" onto the glowing space.` : `You need "${name}". Watch for it in your next pack.`;
    }
  }
  return 'Finish your turn.';
}

function spaceHTML(id, isCurrent, small) {
  const t = E.stepDef(id);
  const st = S.steps[id];
  const ag = AGENCIES[t.agency]?.short || '';
  const by = t.by === 'boss' ? (S.track === 'h2a' ? 'Farm files' : 'Boss files') : t.by === 'you' ? 'You file' : 'Wait';
  const known = isCurrent || st.shown || ['approved', 'pending', 'missing', 'waiting'].includes(st.status);
  let inner = '';
  let badge = '';
  let cls = 'space';
  if (t.kind === 'wait') {
    if (st.status === 'waiting' || st.status === 'approved') {
      const info = E.lineInfo(S);
      inner = `<div class="mini-sign"><span class="hd">NOW<br>SERVING</span><span class="num">${info.isCurrent ? 'ALL' : E.fmtDate(info.cutoff).replace(' ', ' ')}</span><span class="you">YOU: ${S.pd ? E.fmtDate(S.pd) : '—'}</span></div>`;
      if (st.status === 'approved') badge = '<span class="token-badge ok">✓</span>';
      else badge = `<span class="token-badge wait">${E.waitEstimate(S) ?? '?'}T</span>`;
      cls += st.status === 'approved' ? ' done' : '';
    } else inner = `<div class="slot"><span class="agency">${ag}</span><span class="q">#</span><span class="who-files">Wait in line</span></div>`;
  } else if (t.kind === 'season') {
    inner = `<div class="slot ${S.status === 'season' ? 'goal-slot' : ''}"><span class="q">🧺</span><span class="who-files">${S.status === 'season' ? 'Ready!' : 'After border'}</span></div>`;
  } else if (['approved', 'pending', 'missing'].includes(st.status)) {
    inner = cardHTML(t.card);
    cls += ' done';
    if (st.status === 'approved') badge = `<span class="token-badge ok">${st.auto ? S.track === 'h2a' ? 'FARM' : '✓' : '✓'}</span>`;
    else if (st.status === 'missing') badge = `<span class="token-badge miss">NEEDS ${esc(st.missing.map((d) => CARDS[d].name).join(' + ').toUpperCase())}</span>`;
    else badge = `<span class="token-badge wait">${t.kind === 'lottery' ? '🎟' : `⏱${st.timer}`}</span>`;
  } else {
    inner = `<div class="slot"><span class="agency">${ag}</span><span class="q">${isCurrent ? '▶' : '?'}</span><span class="who-files">${by}</span></div>`;
  }
  if (isCurrent) cls += ' current';
  const name = t.card ? CARDS[t.card].name : t.name;
  const tag = known || t.kind ? esc(t.kind === 'wait' ? 'Now Serving' : t.kind === 'season' ? 'Harvest' : name) : '? ? ?';
  return `<div class="${cls}" data-step="${id}">${inner}${badge}<div class="tag">${tag}</div></div>`;
}

function roadHTML() {
  const ch = CHARACTERS[S.charId];
  const cur = E.currentStep(S)?.id;
  let html = `<div class="road ${S.flags.sponsored ? 'small' : ''}" id="road">${S.order.map((id) => spaceHTML(id, id === cur)).join('')}`;
  if (S.track === 'h1b') html += `<div class="space locked"><div class="slot goal-slot"><span class="q">★</span><span class="who-files">5 yrs after<br>green card</span></div><div class="tag">Citizen</div></div>`;
  html += '</div>';
  if (S.track === 'h2a') {
    if (S.flags.sponsored) {
      const pc = E.currentStep(S, S.permOrder)?.id;
      html += `<div class="road small" id="road2">${S.permOrder.map((id) => spaceHTML(id, id === pc)).join('')}</div>`;
    } else {
      html += `<div class="perm-banner">🔒 <span><b>No road to a green card.</b> Seasonal farm visas are temporary. Only a year-round job could open one.</span></div>`;
    }
  }
  void ch;
  return html;
}

function renderBoard() {
  const ch = CHARACTERS[S.charId];
  const lad = E.ladder(S);
  const year = E.yearOf(S);
  const over = S.hand.length > E.HAND_LIMIT;
  app.innerHTML = `
  <div id="game">
    <header class="tokens">
      <div class="token who"><div class="ava">${portrait(S.charId)}</div><div><span class="v">${esc(ch.name)}</span><span class="k">${esc(E.statusText(S))}</span></div></div>
      <div class="token"><div><span class="k">Turn ${S.turn} of ${E.TURNS}</span><span class="v">${year}</span></div><div class="turns">${Array.from({ length: E.TURNS }, (_, i) => `<i class="${i + 1 < S.turn ? 'done' : i + 1 === S.turn ? 'now' : ''}"></i>`).join('')}</div></div>
      <div class="spacer"></div>
      <div class="token money-token"><div><span class="k">${S.track === 'h2a' ? `House fund · goal ${k$(ch.familyGoal)}` : 'Savings'}</span><span class="v ${S.money < 0 ? 'neg' : ''}" id="money">${E.money$(shownMoney ?? S.money)}</span></div></div>
      <div class="token" title="How secure your status is"><div><span class="k">Status</span><span class="v" style="font-size:20px">${E.LADDER[lad]}</span></div><div class="ladder">${[1, 2, 3, 4].map((i) => `<i class="${i <= lad ? 'on' : ''}" style="height:${8 + i * 6}px"></i>`).join('')}</div></div>
      <button class="icon-btn" id="log" title="What happened" aria-label="What happened">📓</button>
      <button class="icon-btn" id="snd" title="Sound" aria-label="Sound">${FX.isMuted() ? '🔇' : '🔊'}</button>
      <button class="icon-btn" id="menu" title="Menu" aria-label="Menu">☰</button>
    </header>
    <section class="road-wrap">
      <div class="road-label">${esc(ch.name)}'s road <span class="hint">${esc(sayText())}</span></div>
      ${roadHTML()}
    </section>
    <section class="mid">
      <button class="papers" id="papers" aria-label="Your papers"><div class="pile"><span></span><span></span><span></span></div><div><b>Papers · ${S.folder.length}</b><small>${esc(S.folder.map((f) => CARDS[f.id].name).join(', ') || 'None yet')}</small></div></button>
      <div class="center">
        ${S.packOpened ? '<button class="btn go big" id="finish">Finish turn →</button>' : '<button class="btn go big bounce" id="open">Open pack</button>'}
      </div>
      <button class="pack-pile" id="pile" ${S.packOpened ? 'disabled' : ''} style="--pc:${ch.color}"><div><b>${S.packOpened ? 'Opened' : 'New pack'}</b><small>${E.PACK_SIZE} cards</small></div><div class="mini"></div></button>
    </section>
    <section class="hand-wrap">
      <div class="hand-count ${over ? 'over' : ''}">HAND ${S.hand.length}/${E.HAND_LIMIT}</div>
      <div class="hand" id="hand">${S.hand.map((h) => cardHTML(h.id, { uid: h.uid, ttl: h.ttl })).join('') || `<div class="hand-empty">${S.packOpened ? 'No cards in your hand.' : 'Open your pack to get cards.'}</div>`}</div>
    </section>
  </div>`;
  const cards = $$('#hand .card');
  cards.forEach((c, i) => {
    const off = i - (cards.length - 1) / 2;
    c.style.transform = `translateY(${Math.abs(off) * 5}px) rotate(${off * 3}deg)`;
    c.style.zIndex = i + 1;
    enableDrag(c);
  });
  $('#open')?.addEventListener('click', openPack);
  $('#pile').onclick = openPack;
  $('#finish')?.addEventListener('click', finishTurn);
  $('#papers').onclick = showPapers;
  $('#log').onclick = showLog;
  $('#menu').onclick = showMenu;
  $('#snd').onclick = () => { FX.setMuted(!FX.isMuted()); $('#snd').textContent = FX.isMuted() ? '🔇' : '🔊'; };
  $$('.space .card').forEach((c) => (c.onclick = () => showDetail(c.dataset.id)));
  animateMoney();
}

function animateMoney() {
  const el = $('#money');
  if (!el) return;
  const from = shownMoney ?? S.money;
  const to = S.money;
  shownMoney = to;
  if (from === to) return;
  const t0 = performance.now();
  if (to > from) FX.sound('coin');
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 800);
    const v = from + (to - from) * (1 - (1 - k) ** 3);
    el.textContent = E.money$(v);
    el.classList.toggle('neg', v < 0);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  FX.burstAt(el, { colors: to > from ? ['#1fa463', '#ffd84a', '#f6f0e2'] : ['#ef4b3f', '#f6f0e2'], count: 14, power: 4, shape: 'spark' });
}

// ───────────────────────── drag + detail ─────────────────────────
function enableDrag(el) {
  const u = el.dataset.uid;
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(el.dataset.id, u); } });
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let ghost = null;
    let drag = false;
    const road = $('.road-wrap');
    const inRoad = (ev) => { const r = road.getBoundingClientRect(); return ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom; };
    const move = (ev) => {
      if (!drag && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) {
        drag = true;
        const tmp = document.createElement('div');
        tmp.innerHTML = cardHTML(el.dataset.id);
        ghost = tmp.firstElementChild;
        ghost.classList.add('drag-ghost');
        document.body.appendChild(ghost);
        el.style.opacity = '.25';
        FX.sound('whoosh');
      }
      if (!drag) return;
      ghost.style.left = `${ev.clientX - 79}px`;
      ghost.style.top = `${ev.clientY - 110}px`;
      $$('.space.current').forEach((s) => s.classList.toggle('drop', inRoad(ev)));
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (drag) {
        ghost.remove();
        el.style.opacity = '';
        $$('.space').forEach((s) => s.classList.remove('drop'));
        if (inRoad(ev)) play(u);
      } else showDetail(el.dataset.id, u);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

function showDetail(id, u = null) {
  const c = CARDS[id];
  const inHand = u && S?.hand.some((h) => h.uid === u);
  const stepId = S && c.type === 'form' ? E.stepForCard(S, id) : null;
  const docs = stepId ? E.stepDocs(E.stepDef(stepId)) : c.docs || [];
  const ph = IMG[c.photo];
  let btns = '';
  if (inHand) {
    if (c.type === 'form') btns += '<button class="btn go" id="d-play">Play on road</button>';
    if (c.type === 'action') btns += '<button class="btn go" id="d-play">Use it</button>';
    if (c.type !== 'wait') btns += '<button class="btn" id="d-toss">Throw away</button>';
  }
  const who = c.type === 'form' ? (c.payer === 'you' ? 'You' : S?.track === 'h2a' ? 'The farm' : 'Your boss') : null;
  const { el, shut } = overlay(`
    <button class="icon-btn close-x" data-close aria-label="Close">✕</button>
    <div>${cardHTML(id, { ttl: S?.hand.find((h) => h.uid === u)?.ttl })}</div>
    <div>
      <h2>${esc(c.name)}</h2>
      ${c.formNo ? `<div class="form-no">${esc(c.formNo)} · ${esc(AGENCIES[c.agency].name)}</div>` : ''}
      <section><b>What it is</b><p>${esc(c.what)}</p></section>
      <section><b>Tip</b><p>${esc(c.tip)}</p></section>
      ${who ? `<section><b>Who pays</b><p>${who} ${c.fee ? `pay${who === 'You' ? '' : 's'} ${E.money$(c.fee)}.` : 'pay nothing to the government for this step.'}</p></section>` : ''}
      ${docs.length ? `<section><b>Papers needed</b><div class="needs">${docs.map((d) => { const has = S && E.hasDoc(S, d); return `<span class="${has ? 'have' : 'miss'}">${has ? '✓' : '✗'} ${esc(CARDS[d].name)}</span>`; }).join('')}</div></section>` : ''}
      <section class="fact"><b>Real fact</b><p>${esc(c.fact)}</p></section>
      ${ph ? `<div class="photo"><img src="${esc(ph.file)}" alt="" loading="lazy"><span>Real photo: ${esc(ph.title?.replace(/^File:/, '') || '')}<br>${esc(ph.author || '')} · ${esc(ph.license || '')} · Wikimedia Commons</span></div>` : ''}
      <div class="row">${btns}<button class="btn" data-close>Close</button></div>
    </div>`, { cls: 'detail' });
  if ($('#d-play', el)) $('#d-play', el).onclick = () => { shut(); play(u); };
  if ($('#d-toss', el)) $('#d-toss', el).onclick = () => { E.discard(S, u); shut(); toast(`Threw away ${c.name}.`); save(); renderBoard(); };
}

async function play(u) {
  const h = S.hand.find((x) => x.uid === u);
  if (!h) return;
  const c = CARDS[h.id];
  if (c.type === 'wait') { toast('Wait cards are stuck. They leave on their own.'); return; }
  if (!['form', 'action'].includes(c.type)) { toast('Only forms and help cards can be played.'); return; }
  const res = E.playCard(S, u);
  save();
  if (res.kind === 'info') { toast(`${res.title ? res.title + ': ' : ''}${res.text}`); renderBoard(); return; }
  log({ rejected: '❌', missing: '📎', saved: '🛡️', help: '🧭' }[res.kind] || '📄', `${res.title} ${res.text}`);
  renderBoard();
  if (res.stamp) { FX.stamp(res.stamp); await wait(1000); }
  await resultSheet(res);
  if (S.over) return finishGame();
  coachNext();
}

function showPapers() {
  overlay(`<button class="icon-btn close-x" data-close aria-label="Close">✕</button><h2>Your papers</h2><p>Papers stay here and are used again and again. Forms that need them check here.</p>
    <div class="discard-row">${S.folder.map((f) => cardHTML(f.id)).join('') || '<p>No papers yet.</p>'}</div>`, { cls: 'recap' });
  $$('.overlay .discard-row .card').forEach((c) => (c.onclick = () => showDetail(c.dataset.id)));
}
function showLog() {
  overlay(`<button class="icon-btn close-x" data-close aria-label="Close">✕</button><h2>What happened</h2>
    <ul class="log-list">${[...S.history].reverse().map((h) => `<li><span class="y">${h.year}</span><span>${h.icon}</span><span>${esc(h.text)}</span></li>`).join('') || '<li>Nothing yet.</li>'}</ul>`, { cls: 'recap' });
}
function showMenu() {
  const { el, shut } = overlay(`<h2>Menu</h2><p>Table <b>${esc(S.code)}</b> · ${esc(S.scenario.name)}</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
      <button class="btn" id="m-how">How to play</button>
      <a class="btn" href="teacher.html" target="_blank" rel="noopener">Teacher guide</a>
      <button class="btn" id="m-quit">Quit to title (saved)</button>
      <button class="btn go" data-close>Back to game</button>
    </div>`, { cls: 'result-sheet' });
  $('#m-how', el).onclick = () => { shut(); showHow(); };
  $('#m-quit', el).onclick = () => { shut(); renderTitle(); };
}
function showHow() {
  overlay(`<button class="icon-btn close-x" data-close aria-label="Close">✕</button><h2>How to play</h2>
    <ol style="font-size:18px;line-height:1.5;padding-left:22px">
      <li><b>Open your pack.</b> Money and bills count right away. Papers go to your pile. Forms and help cards go to your hand.</li>
      <li><b>Play forms on your road.</b> Drag a form onto the road, or click it and press Play. The glowing space shows what's next.</li>
      <li><b>Too early = rejected.</b> You lose the fee, and a Rejected card gets stuck in your hand.</li>
      <li><b>Wait cards</b> can't be played or thrown away. They leave after a turn or two.</li>
      <li><b>Finish your turn,</b> make one choice, then compare with your partner.</li>
    </ol>
    <div class="row"><button class="btn go" data-close>Got it</button></div>`, { cls: 'recap' });
}

// ───────────────────────── TURN FLOW ─────────────────────────
const APPS = {
  news: { name: 'News', icon: '📰', bg: '#ffd84a' }, family: { name: 'Messages', icon: '💬', bg: '#9be3b8' },
  uscis: { name: 'USCIS Case Status', icon: '🏛', bg: '#a9d4ff' }, dol: { name: 'Dept. of Labor', icon: '🏛', bg: '#a9d4ff' },
  state: { name: 'State Dept.', icon: '🏛', bg: '#a9d4ff' }, farm: { name: 'Farm Crew Chat', icon: '🌾', bg: '#ffc08f' },
};
function beginTurn() {
  const rep = E.startTurn(S);
  save();
  renderBoard();
  showTurnStart(rep);
}
function flapsHTML(text) {
  return `<div class="flaps">${[...text].map((ch) => (ch === ' ' ? '<span class="flap gap"></span>' : `<span class="flap">${ch}</span>`)).join('')}</div>`;
}
function signHTML(sign) {
  const est = sign.estimate;
  const verdict = sign.current
    ? '<b>Your number was called!</b> You can apply for your green card now.'
    : `The line is serving people who got in line in <b>${Math.floor(sign.after)}</b>. Your ticket is <b>${Math.floor(sign.pd)}</b>. At this speed: about <b>${est} more turn${est === 1 ? '' : 's'}</b>${est > 8 ? ' — longer than this whole game' : ''}.`;
  return `<div class="sign"><span class="hd">NOW SERVING</span><div class="line">Green card line · ${esc(sign.label)}</div>
    <div id="flaps">${flapsHTML(E.fmtDate(sign.before))}</div>
    <div class="ticket"><div class="stub"><small>YOUR TICKET</small>${E.fmtDate(sign.pd)}</div><div class="verdict">${verdict}</div></div></div>`;
}
function runFlaps(from, to) {
  const box = $('#flaps');
  if (!box) return;
  const target = E.fmtDate(to);
  const steps = 10;
  let i = 0;
  const tick = () => {
    i++;
    const v = from + ((to - from) * i) / steps;
    box.innerHTML = flapsHTML(i >= steps ? target : E.fmtDate(v));
    $$('.flap', box).forEach((f) => f.classList.add('flip'));
    FX.sound('click');
    if (i < steps) setTimeout(tick, 110);
  };
  setTimeout(tick, 900);
}
function showTurnStart(rep) {
  const year = E.yearOf(S);
  const ch = CHARACTERS[S.charId];
  const notes = rep.notes.map((n, i) => {
    const a = APPS[n.app] || APPS.news;
    const from = n.app === 'family' ? n.from : a.name;
    return `<div class="note ${n.tone || ''}" style="animation-delay:${0.25 + i * 0.45}s"><div class="app"><i style="background:${a.bg}">${a.icon}</i>${esc(from)}</div>${esc(n.text)}</div>`;
  }).join('');
  const { el, shut } = overlay(`
    <div class="turn-start">
      <div class="phone"><div class="phone-screen">
        <div class="clock">7:${String(10 + S.turn * 6).padStart(2, '0')}</div><div class="date">Turn ${S.turn} · ${year}</div>
        ${notes}
      </div></div>
      <div class="turn-side">
        <h2><small>Turn ${S.turn} of ${E.TURNS}</small>${year}</h2>
        ${rep.sign ? signHTML(rep.sign) : `<p style="font-size:19px;max-width:34ch">${esc(ch.name)}'s phone is buzzing. Read your messages, then open your pack.</p>`}
        <button class="btn go big" id="ts-go">${S.dilemma ? 'Continue' : 'Open pack'}</button>
      </div>
    </div>`, { bare: true, close: false });
  if (rep.sign) runFlaps(rep.sign.before, rep.sign.after);
  if (rep.stamp) setTimeout(() => FX.stamp(rep.stamp), rep.sign ? 2400 : 600 + rep.notes.length * 450);
  $('#ts-go', el).onclick = async () => {
    shut();
    if (rep.stamp === 'GREEN CARD') await showReward();
    if (S.dilemma) { await showDilemma(); if (S.over) return finishGame(); renderBoard(); }
    openPack();
  };
}

function showReward() {
  return new Promise((resolve) => {
    const { el, shut } = overlay(`<div class="stage-title" style="text-align:center">You earned the rarest card</div>
      <div style="display:grid;place-items:center;margin:18px 0">${cardHTML('green-card', { cls: 'reward' })}</div>
      <p style="text-align:center;font-size:19px;max-width:44ch;margin:0 auto 18px">A green card means you can live and work in the U.S. for good. In 5 years you can apply to become a citizen.</p>
      <div style="text-align:center"><button class="btn go big" id="rw">Keep going</button></div>`, { bare: true, close: false, onClose: resolve });
    FX.sound('legendary');
    FX.confettiRain();
    $('#rw', el).onclick = shut;
  });
}

function openPack() {
  if (S.packOpened || S.over) return;
  const ch = CHARACTERS[S.charId];
  const stage = document.createElement('div');
  stage.className = 'pack-stage';
  stage.innerHTML = `
    <div class="stage-title">Turn ${S.turn} pack</div>
    <div class="stage-sub">Grab the top edge and drag right to tear it open</div>
    <div class="pack" style="--pc:${ch.color}" tabindex="0" aria-label="Card pack. Press Enter to open.">
      <div class="cut-hint">✂ tear here →</div>
      <div class="p-top"><div class="halftone"></div><div class="crimp"></div><div class="sheen"></div></div>
      <div class="cut"></div><div class="cut-prog"></div>
      <div class="p-body"><div class="halftone"></div><div class="sheen"></div>
        <div class="p-ava">${portrait(S.charId)}</div>
        <div class="logo">Paper<br>Trail</div>
        <div class="p-info">${E.yearOf(S)} · ${E.PACK_SIZE - (S.flags.smallPack ? 1 : 0)} CARDS</div>
        <div class="crimp"></div>
      </div>
    </div>
    <div class="stage-controls"><button class="btn" id="tear">Tear open</button></div>`;
  document.body.appendChild(stage);
  const pack = $('.pack', stage);
  const prog = $('.cut-prog', stage);
  let tearing = false;
  let p = 0;
  let done = false;
  pack.addEventListener('pointermove', (e) => {
    const r = pack.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (!tearing) pack.style.transform = `perspective(900px) rotateY(${(x - 0.5) * 16}deg) rotateX(${(0.5 - y) * 12}deg)`;
    $$('.sheen', pack).forEach((f) => f.style.setProperty('--fx', `${x * 100}%`));
    if (tearing) { p = Math.max(p, Math.min(1, x)); prog.style.width = `${p * 100}%`; if (p > 0.88) tear(); }
  });
  pack.addEventListener('pointerleave', () => { if (!tearing) pack.style.transform = ''; });
  pack.addEventListener('pointerdown', (e) => {
    const r = pack.getBoundingClientRect();
    if ((e.clientY - r.top) / r.height < 0.36) { tearing = true; pack.setPointerCapture(e.pointerId); FX.sound('tear'); }
    else { pack.classList.remove('shake'); void pack.offsetWidth; pack.classList.add('shake'); $('.stage-sub', stage).textContent = 'Grab the TOP edge, then drag right →'; }
  });
  pack.addEventListener('pointerup', () => { tearing = false; if (!done) { p = 0; prog.style.width = '0'; } });
  pack.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') tear(); });
  $('#tear', stage).onclick = tear;

  function tear() {
    if (done) return;
    done = true;
    prog.style.width = '100%';
    FX.sound('tear');
    const r = pack.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height * 0.17, { colors: ['#ffd84a', '#f6f0e2', ch.hex], count: 50, power: 9, shape: 'spark' });
    pack.classList.add('torn');
    $('.cut-hint', stage)?.remove();
    const cards = E.makePack(S);
    const results = cards.map((c) => E.collectCard(S, c));
    S.packOpened = true;
    S.phase = 'play';
    save();
    setTimeout(() => deal(cards, results), 650);
  }
  function deal(cards, results) {
    stage.innerHTML = `
      <div class="stage-title">Turn ${S.turn} pack</div>
      <div class="stage-sub">Click each card to flip it</div>
      <div class="reveal-row">${cards.map((c, i) => `<div class="slot2">${cardHTML(c.id, { down: true, hot: ['rare', 'legendary'].includes(CARDS[c.id].rarity) })}<div class="result ${results[i].tone}">${esc(results[i].text)}</div></div>`).join('')}</div>
      <div class="stage-controls"><button class="btn" id="all">Flip all</button><button class="btn go big hidden" id="take">Take cards</button></div>`;
    const els = $$('.reveal-row .card', stage);
    els.forEach((el, i) => { el.style.animationDelay = `${i * 0.09}s`; el.onclick = () => flip(el, i); });
    FX.sound('whoosh');
    let flipped = 0;
    function flip(el, i) {
      if (!el.classList.contains('down')) return showDetail(cards[i].id);
      el.classList.remove('down', 'hot');
      const c = CARDS[cards[i].id];
      FX.sound('flip');
      setTimeout(() => {
        if (c.rarity === 'rare') { FX.sound('rare'); FX.burstAt(el, { colors: ['#ffd84a', '#f6f0e2', '#ff5fa2'], count: 44, power: 8 }); }
        else if (c.type === 'money') { FX.sound('coin'); FX.burstAt(el, { colors: ['#1fa463', '#ffd84a'], count: 18, power: 5, shape: 'spark' }); }
        else if (c.type === 'wait' || c.type === 'bill') FX.sound('bad');
        el.parentElement.querySelector('.result').classList.add('show');
      }, 300);
      if (++flipped === cards.length) {
        $('#all', stage).classList.add('hidden');
        $('#take', stage).classList.remove('hidden');
        $('.stage-sub', stage).textContent = 'Click a card to read it, or take them all.';
      }
    }
    $('#all', stage).onclick = async () => { for (let i = 0; i < els.length; i++) if (els[i].classList.contains('down')) { flip(els[i], i); await wait(240); } };
    $('#take', stage).onclick = () => {
      stage.remove();
      const st = E.settle(S);
      save();
      renderBoard();
      if (st.stamp) FX.stamp(st.stamp);
      coachNext();
    };
  }
}

async function finishTurn() {
  $$('.coach').forEach((c) => c.remove());
  const d = E.pickDilemma(S);
  save();
  if (d) await showDilemma();
  if (S.over) return finishGame();
  const lines = E.endTurn(S);
  S.lastLines = lines;
  save();
  renderBoard();
  showRecap();
}

function showDilemma() {
  return new Promise((resolve) => {
    const d = DILEMMAS.find((x) => x.id === S.dilemma);
    if (!d) { resolve(); return; }
    const { el, shut } = overlay(`
      <div class="choice-top">
        <div class="choice-art">${art(d.art, 'action', d.legendary ? '#ffd84a' : '#c3b1ff')}</div>
        <div><span class="kicker">${d.legendary ? '★ Rare chance' : `Turn ${S.turn} · your choice`}</span><h2>${esc(d.title)}</h2><p>${esc(d.text)}</p></div>
      </div>
      <div class="options">${d.options.map((o) => `<button class="option" data-k="${o.key}"><b>${esc(o.label)}</b><span>${esc(o.hint)}</span></button>`).join('')}</div>`, { cls: 'choice', close: false });
    $$('[data-k]', el).forEach((b) => (b.onclick = async () => {
      const r = E.resolveDilemma(S, b.dataset.k);
      shut();
      save();
      FX.sound('stamp');
      await resultSheet({ kind: 'help', title: r.title, text: r.text });
      renderBoard();
      resolve();
    }));
  });
}

function showRecap() {
  const final = S.over || S.turn >= E.TURNS;
  const year = E.yearOf(S);
  const { el, shut } = overlay(`
    <h2>End of ${year}</h2>
    <div class="ledger">${(S.lastLines || []).map((l) => `<div><span>${l.icon} ${esc(l.text)}</span>${l.amt ? `<span class="amt ${l.amt > 0 ? 'plus' : 'minus'}">${l.amt > 0 ? '+' : '−'}${E.money$(Math.abs(l.amt))}</span>` : ''}</div>`).join('')}</div>
    <div id="rc"></div>`, { cls: 'recap', close: false });
  const body = $('#rc', el);
  const stepDiscard = () => {
    const n = E.handOver(S);
    if (n > 0 && E.discardable(S).length && !final) {
      body.innerHTML = `<h3 style="font-size:26px">Hand too full! Throw away ${n}.</h3><p style="margin:4px 0">You can hold ${E.HAND_LIMIT} cards. Stuck cards can't be thrown away.</p>
        <div class="discard-row">${S.hand.map((h) => cardHTML(h.id, { uid: h.uid, ttl: h.ttl, cls: CARDS[h.id].type === 'wait' ? 'stuck' : '' })).join('')}</div>`;
      $$('.discard-row .card', body).forEach((c) => (c.onclick = () => {
        if (!E.discard(S, c.dataset.uid)) { toast('That card is stuck. It leaves on its own.'); return; }
        FX.sound('whoosh');
        save();
        stepDiscard();
      }));
      return;
    }
    stepPartner();
  };
  const stepPartner = () => {
    S.phase = 'recap';
    save();
    body.innerHTML = `
      <div class="partner"><b>Partner check</b><ul>
        <li>Wait for your partner to reach this screen.</li>
        <li>Tell each other your <b>status</b> (${E.LADDER[E.ladder(S)]}) and your <b>money</b> (${E.money$(S.money)}).</li>
        <li>Who's ahead? Why: choices, luck, money, or the rules?</li></ul></div>
      <div class="row"><button class="btn go big" id="next">${final ? 'See results' : `Start ${E.TURN_YEARS[S.turn]}`} →</button></div>`;
    $('#next', body).onclick = () => { shut(); if (E.nextTurn(S)) beginTurn(); else finishGame(); };
  };
  if (S.phase === 'recap') stepPartner(); else stepDiscard();
}

// ───────────────────────── COACH (turn 1) ─────────────────────────
function coach(key, sel, text, where = 'above') {
  if (!S || S.turn > 1 || S.tips?.[key]) return false;
  const t = $(sel);
  if (!t) return false;
  $$('.coach').forEach((c) => c.remove());
  const r = t.getBoundingClientRect();
  const tip = document.createElement('div');
  tip.className = 'coach';
  tip.innerHTML = `${esc(text)}<br><button>Got it</button>`;
  document.body.appendChild(tip);
  const tr = tip.getBoundingClientRect();
  let top = where === 'above' ? r.top - tr.height - 12 : r.bottom + 12;
  let left = r.left + r.width / 2 - tr.width / 2;
  if (where === 'left') { top = r.top + r.height / 2 - tr.height / 2; left = r.left - tr.width - 14; }
  tip.style.top = `${Math.max(10, top)}px`;
  tip.style.left = `${Math.max(10, Math.min(innerWidth - tr.width - 10, left))}px`;
  $('button', tip).onclick = () => { S.tips[key] = true; tip.remove(); save(); coachNext(); };
  return true;
}
function coachNext() {
  if (!S || S.turn > 1) return;
  S.tips ||= {};
  if (!S.tips.hand && S.hand.length && coach('hand', '#hand', 'Your hand. Click a card to read it. Drag a form up onto your road to play it.')) return;
  if (!S.tips.road && coach('road', '.space.current', 'The glowing space is your next step. Hidden steps come later. Play them too early and they get rejected!', 'below')) return;
  if (!S.tips.finish) coach('finish', '#finish', 'Done? Finish your turn. You\'ll make one choice, then compare with your partner.', 'above');
}

// ───────────────────────── END ─────────────────────────
const REAL = {
  priya: [
    'In September 2026, the green card line for skilled workers from India was stuck at July 2014. People who got in line in 2014 were still waiting.',
    'A 2026 study estimated an Indian engineer who gets in line today could wait over 100 years. That\'s just math, since laws and people change, but the line is real.',
    'No country can get more than 7% of green cards a year. India has 1.4 billion people and the same limit as Iceland.',
  ],
  lukas: [
    'In 2026, the line for Germany and most countries had no wait at all. The slow part was the paperwork, about 2 years for "Prove No American Applied."',
    'Lukas and Priya had the same job, the same forms and the same boss. The big difference was where they were born.',
    'After 5 years with a green card, Lukas could apply to become a U.S. citizen by passing a civics test.',
  ],
  marco: [
    'In 2025, a record 398,258 H-2A farm jobs were approved. About 9 out of 10 H-2A visas go to workers from Mexico.',
    'H-2A seasons last about 6 months. The visa never leads to a green card by itself.',
    'Only a year-round job can sponsor a farmworker for a green card, and just 10,000 of those are given each year for the whole world.',
    'Farms must pay for housing and travel, and they may not charge workers recruiting fees.',
  ],
};
const OUTCOMES = {
  gc: ['Got a green card', 'var(--green)'], h1b: ['Still waiting', '#d9661c'], opt: ['Never got a visa', '#d9661c'], student: ['Still in school', '#d9661c'],
  left: ['Moved home', 'var(--red)'], canada: ['Moved to Canada', 'var(--red)'], home: ['Still seasonal', '#d9661c'], season: ['Still seasonal', '#d9661c'],
};
function finishGame() {
  clearOverlays();
  $$('.coach').forEach((c) => c.remove());
  S.over = true;
  S.phase = 'over';
  save();
  const ch = CHARACTERS[S.charId];
  const [verdict, color] = OUTCOMES[S.status] || OUTCOMES.h1b;
  const lad = E.ladder(S);
  const headline = { gc: `${ch.name} can stay for good`, h1b: `${ch.name} is still in line`, left: `${ch.name} went home`, canada: `${ch.name} left for Canada`, home: `${ch.name} is still a guest worker`, student: `${ch.name} is still trying`, opt: `${ch.name} is still trying` }[S.status] || `${ch.name}'s story`;
  const share = `PAPER TRAIL · ${S.code} · ${ch.name} · ${E.LADDER[lad]} · ${E.money$(S.money)} · ${S.stats.rejections} rejected`;
  const q3 = S.track === 'h2a'
    ? `Marco worked ${S.seasons} harvest season${S.seasons === 1 ? '' : 's'}. Should years of seasonal work count toward a green card?`
    : S.charId === 'priya' ? 'Priya did what Lukas did. Is it fair that each country gets the same number of green cards?' : 'You moved faster than Priya with the same job. How would you explain that to her?';
  app.innerHTML = `
  <section class="screen" style="align-items:flex-start"><div class="end">
    ${charCardHTML(S.charId)}
    <div>
      <h1>${esc(headline)}</h1>
      <div class="verdict-stamp" style="color:${color}">${verdict}</div>
      <p style="font-size:18px">${E.TURN_YEARS[0]}–${E.yearOf(S)} · Status: <b>${E.LADDER[lad]}</b> · Money: <b>${E.money$(S.money)}</b> · Fees you paid: <b>${E.money$(S.stats.feesYou)}</b> · Your ${S.track === 'h2a' ? 'farm' : 'boss'} paid: <b>${E.money$(S.stats.feesBoss)}</b> · Rejected: <b>${S.stats.rejections}</b>${S.track === 'h2a' ? ` · Seasons worked: <b>${S.seasons}</b>` : ` · Turns waiting in line: <b>${S.stats.turnsInLine}</b>`}</p>
      <div class="end-grid">
        <div class="panel"><h3>Your road</h3><ul class="log-list" style="max-height:320px">${S.history.map((h) => `<li><span class="y">${h.year}</span><span>${h.icon}</span><span>${esc(h.text)}</span></li>`).join('')}</ul></div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="panel real"><h3>In real life</h3><ul>${REAL[S.charId].map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
          <div class="panel talk"><h3>Talk with your partner</h3><ol>
            <li>What decided how far you got: choices, luck, money, or where you were born?</li>
            <li>Compare your results. Was it fair?</li>
            <li>${esc(q3)}</li>
            <li>If you could change one rule, what would it be? Who would agree or disagree?</li></ol></div>
        </div>
      </div>
      <div class="share">${esc(share)}</div>
      <div class="end-actions"><button class="btn go big" id="again">Play again</button><button class="btn big" id="other">New player</button><a class="btn big" href="teacher.html">Teacher guide</a></div>
    </div>
  </div></section>`;
  if (lad >= 4 && S.status === 'gc') FX.confettiRain();
  $('#again').onclick = () => { setup.charId = S.charId; store.del('pt-save-v2'); renderIntro(); };
  $('#other').onclick = () => { setup.charId = null; store.del('pt-save-v2'); renderSetup(); };
  scrollTo(0, 0);
}

// ───────────────────────── resume + boot ─────────────────────────
function resume() {
  shownMoney = S.money;
  if (S.over) return finishGame();
  renderBoard();
  if (S.phase === 'end' || S.phase === 'recap') showRecap();
  else if (S.phase === 'start' && S.lastNotes) showTurnStart({ notes: S.lastNotes, sign: S.lastSign, stamp: null });
}

loadCredits().then(() => {
  const q = new URLSearchParams(location.search).get('code');
  if (q) { setup.code = normalizeCode(q); store.set('pt-code', setup.code); }
  renderTitle();
});
