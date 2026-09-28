import * as E from './engine.js';
import { CARDS, TYPE_INFO, AGENCIES } from './data/cards.js';
import { CHARACTERS, PAIRINGS } from './data/characters.js';
import { SCENARIOS, getScenario, normalizeCode } from './data/scenarios.js';
import * as FX from './fx.js';

const app = document.getElementById('app');
const overlayRoot = document.getElementById('overlay-root');
const toastRoot = document.getElementById('toast-root');
let S = null;
let IMG = {};
let shownMoney = null;
const setup = { name: '', code: 'MAPLE', charId: null };

// ───────────────────────── utilities ─────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};
function save() { if (S) store.set('pt-save', JSON.stringify(S)); }
function loadSave() { try { const s = JSON.parse(store.get('pt-save')); return s && s.v === 1 ? s : null; } catch { return null; } }

async function loadCredits() {
  try {
    const r = await fetch('assets/img/credits.json', { cache: 'no-cache' });
    if (r.ok) for (const c of await r.json()) IMG[c.slug] = c;
  } catch { /* offline or missing */ }
}
const imgSrc = (slug) => (IMG[slug] && IMG[slug].file) || `assets/img/${slug}.webp`;
const flagSrc = (slug) => (IMG[slug] && IMG[slug].file) || `assets/img/${slug}.svg`;
const imgTag = (slug, cls = '', alt = '') => `<img class="${cls}" src="${imgSrc(slug)}" alt="${esc(alt)}" loading="lazy" onerror="this.style.display='none'">`;

function toast(text, tone = '') {
  const t = document.createElement('div');
  t.className = `toast ${tone}`;
  t.textContent = text;
  toastRoot.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

function logJ(icon, text, tone = 'info') {
  if (!S) return;
  S.journal.unshift({ icon, text, tone, cal: E.yearLabel(S) });
  S.journal = S.journal.slice(0, 40);
}

const LOGO_SVG = `<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="6" width="40" height="52" rx="6" fill="#0f172a" stroke="#f5c451" stroke-width="4"/><rect x="18" y="16" width="24" height="4" rx="2" fill="#f5c451"/><rect x="18" y="26" width="24" height="4" rx="2" fill="#94a3b8"/><rect x="18" y="34" width="16" height="4" rx="2" fill="#94a3b8"/><circle cx="44" cy="46" r="12" fill="#e11d48"/><path d="M38 46l4 4 8-8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const TYPE_EMOJI = { form: '📄', doc: '🗂️', money: '💵', expense: '🧾', event: '⚡', action: '🧭', wait: '⏳' };

// ───────────────────────── card rendering ─────────────────────────
function formNo(c) {
  const m = (c.sub || '').match(/(I-\d+[A-Z]?|ETA-\d+[A-Z]?|DS-\d+|N-\d+|I-94)/);
  return m ? m[0] : '';
}
function cardHTML(id, { down = false, uid = '', cls = '', ttl, expires, track } = {}) {
  const c = CARDS[id];
  const t = TYPE_INFO[c.type];
  const ag = AGENCIES[c.agency] || AGENCIES.LIFE;
  const tr = track || (S && S.track) || 'h1b';
  const foot = [];
  if (c.fee) foot.push(`💵 ${c.fee.amt ? E.fmtMoney(c.fee.amt) : 'No fee'}${c.fee.amt ? ' · ' + (c.fee.payer === 'you' ? 'You' : 'Employer') : ''}`);
  if (c.time && c.type === 'form') foot.push(`⏳ ${c.time}`);
  if (c.docs && c.docs.length) foot.push(`📎 ${c.docs.length} doc${c.docs.length > 1 ? 's' : ''}`);
  if (c.type === 'action') {
    const cost = c.cost ? c.cost[tr] ?? 0 : 0;
    foot.push(cost ? `💵 ${E.fmtMoney(cost)}` : '💵 Free');
  }
  if (c.expires) foot.push(`⌛ Expires`);
  const big = c.type === 'money' || c.type === 'expense' || (c.type === 'event' && c.effect?.kind === 'money');
  const fno = formNo(c);
  return `<div class="card t-${c.type} r-${c.rarity} ${down ? 'down' : ''} ${cls} ${down && ['rare', 'legendary'].includes(c.rarity) ? 'glow-rare' : ''}" data-uid="${uid}" data-id="${id}" tabindex="0" role="button" aria-label="${esc(c.title)} (${t.label})">
    <div class="card-inner">
      <div class="face front">
        <div class="c-top"><span class="c-type">${t.icon} ${t.label}</span><span class="c-agency" style="--agc:${ag.color}">${esc(ag.name)}</span></div>
        <div class="c-art"><div class="ph">${TYPE_EMOJI[c.type]}</div>${imgTag(c.img, '', '')}${fno ? `<span class="c-formno">${fno}</span>` : ''}<span class="c-gem" title="${c.rarity}"></span></div>
        ${ttl !== undefined ? `<span class="c-ttl">${ttl} yr left</span>` : ''}
        <div class="c-title">${esc(c.title)}</div>
        ${big ? `<div class="c-big">${esc(c.sub)}</div>` : `<div class="c-sub">${esc(c.sub)}</div>`}
        <div class="c-text">${esc(c.blurb)}</div>
        <div class="c-foot">${foot.map((f) => `<span>${esc(f)}</span>`).join('')}</div>
        ${c.type === 'wait' ? '<div class="c-stamp">WAIT</div>' : ''}
        <div class="c-shine"></div>
      </div>
      <div class="face back"><div class="seal"><div><i>🗂️</i><b>PAPER<br>TRAIL</b></div></div></div>
    </div>
  </div>`;
}
// Shiny highlight that follows the pointer
document.addEventListener('pointermove', (e) => {
  const card = e.target.closest && e.target.closest('.card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
  card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
}, { passive: true });

// ───────────────────────── overlays ─────────────────────────
function openOverlay(html, { cls = '', onClose, dismiss = true } = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  overlayRoot.appendChild(ov);
  const close = () => { ov.remove(); onClose && onClose(); };
  if (dismiss) {
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
  $$('[data-close]', ov).forEach((b) => b.addEventListener('click', close));
  setTimeout(() => { const f = $('.btn.primary', ov) || $('button', ov); f && f.focus(); }, 50);
  return { el: ov, close };
}
function closeAllOverlays() { overlayRoot.innerHTML = ''; }

function confirmBox(title, text, yes) {
  return new Promise((resolve) => {
    let answered = false;
    const { el, close } = openOverlay(`
      <h2>${esc(title)}</h2>
      <p style="font-size:16px">${esc(text)}</p>
      <div class="row" style="justify-content:center"><button class="btn" data-close>Cancel</button><button class="btn primary" id="cf-yes">${esc(yes)}</button></div>`,
    { cls: 'result-modal', onClose: () => { if (!answered) resolve(false); } });
    $('#cf-yes', el).onclick = () => { answered = true; close(); resolve(true); };
  });
}

function resultModal(res) {
  return new Promise((resolve) => {
    const icon = { rejected: '❌', rfe: '📨', approved: '✅', filed: '📬', shield: '🛡️', action: '🧭' }[res.kind] || 'ℹ️';
    const { close } = openOverlay(`
      <div class="big-icon">${icon}</div>
      <h2>${esc(res.title || '')}</h2>
      <p>${esc(res.text || '')}</p>
      <div class="row" style="justify-content:center"><button class="btn primary" data-close>Got it</button></div>`, { cls: 'result-modal', onClose: resolve });
    void close;
  });
}

// ───────────────────────── TITLE ─────────────────────────
function renderTitle() {
  closeAllOverlays();
  S = null;
  const saved = loadSave();
  app.innerHTML = `
  <section class="screen">
    <div class="title-wrap">
      <div class="title-hero">
        <div class="logo">${LOGO_SVG}<span class="logo-text">PAPER TRAIL</span></div>
        <h1>How long does it take to <em>immigrate</em>?</h1>
        <p class="lead">A deckbuilding game about U.S. immigration. Open packs, collect forms and documents, file them in the right order — and see how country of birth, money, and luck shape the journey.</p>
        <div class="title-actions">
          <button class="btn primary big pulse" id="new-game">▶ New Game</button>
          ${saved && !saved.over ? `<button class="btn big" id="continue">Continue ${esc(CHARACTERS[saved.charId].name)} · ${E.START_CAL + saved.year - 1}</button>` : ''}
        </div>
        <div class="title-links">
          <a href="teacher.html">Teacher guide</a>
          <a href="credits.html">Image credits & sources</a>
          <a href="#" id="sound-toggle">${FX.isMuted() ? '🔇 Sound off' : '🔊 Sound on'}</a>
        </div>
      </div>
      <div class="title-fan" aria-hidden="true">
        ${cardHTML('h1b-reg', { cls: '', track: 'h1b' })}
        ${cardHTML('i485', { track: 'h1b' })}
        ${cardHTML('poe', { track: 'h2a' })}
      </div>
    </div>
  </section>`;
  const fan = $$('.title-fan .card');
  fan.forEach((c, i) => { c.style.transform = `translate(-50%,-50%) translate(${(i - 1) * 110}px, ${Math.abs(i - 1) * 14}px) rotate(${(i - 1) * 12}deg)`; c.style.zIndex = i === 1 ? 3 : 1; });
  $('#new-game').onclick = () => { FX.sound('click'); renderSetup(); };
  const cont = $('#continue');
  if (cont) cont.onclick = () => { S = saved; resumeGame(); };
  $('#sound-toggle').onclick = (e) => { e.preventDefault(); FX.setMuted(!FX.isMuted()); renderTitle(); };
}

// ───────────────────────── SETUP ─────────────────────────
function renderSetup() {
  setup.name = store.get('pt-name') || setup.name;
  setup.code = store.get('pt-code') || setup.code;
  app.innerHTML = `
  <section class="screen">
    <div class="setup">
      <div class="step-label">New game</div>
      <h2>Set up your table</h2>
      <p class="muted">Sit next to a partner. You each play on your own computer, but type the <b>same table code</b> so the same news happens in both games at the same time.</p>
      <div class="setup-grid">
        <div class="field">
          <label for="pname">Your first name</label>
          <input id="pname" maxlength="20" autocomplete="off" placeholder="First name only" value="${esc(setup.name)}">
          <div class="help">Only saved on this computer. Nothing is sent online.</div>
        </div>
        <div class="field">
          <label for="pcode">Table code (from your teacher)</label>
          <input id="pcode" class="code" maxlength="12" autocomplete="off" value="${esc(setup.code)}">
          <div class="chips">${SCENARIOS.map((s) => `<button class="chip" data-code="${s.id}">${s.id} · ${esc(s.level)}</button>`).join('')}</div>
          <div class="scenario-note" id="scn-note"></div>
        </div>
      </div>
      <div class="step-label">Choose your character</div>
      <div class="char-grid" style="margin-top:10px">
        ${Object.values(CHARACTERS).map((c) => `
          <button class="char-card" data-char="${c.id}" style="--c:${c.color}">
            <div class="char-bg" style="background-image:url('${imgSrc(c.bg)}')"></div>
            <div class="char-body">
              <img class="flag" src="${flagSrc(c.flag)}" alt="Flag of ${esc(c.country)}" onerror="this.style.visibility='hidden'">
              <h3>${esc(c.name)}</h3>
              <div class="tag">${esc(c.tagline)}</div>
              <p>${esc(c.intro)}</p>
              <div class="rival">Great rival: ${esc(CHARACTERS[c.rival].name)} (${esc(CHARACTERS[c.rival].country)})</div>
            </div>
          </button>`).join('')}
      </div>
      <div class="setup-foot" style="margin-top:22px">
        <div class="pairing-tip" id="pair-tip">${PAIRINGS.map((p) => `<b>${CHARACTERS[p.a].name} vs. ${CHARACTERS[p.b].name}:</b> ${esc(p.note)}`).join('<br>')}</div>
        <div style="display:flex;gap:10px"><button class="btn" id="back">← Back</button><button class="btn primary big" id="start" disabled>Start →</button></div>
      </div>
    </div>
  </section>`;
  const note = $('#scn-note');
  const updCode = () => {
    const code = normalizeCode($('#pcode').value) || 'MAPLE';
    const sc = getScenario(code);
    setup.code = code;
    note.innerHTML = `<b>${esc(sc.name)}</b> — ${esc(sc.summary)}`;
    $$('.chip[data-code]').forEach((b) => b.classList.toggle('on', b.dataset.code === sc.id));
  };
  $('#pcode').addEventListener('input', updCode);
  $$('.chip[data-code]').forEach((b) => b.onclick = () => { $('#pcode').value = b.dataset.code; updCode(); FX.sound('click'); });
  updCode();
  const upd = () => { $('#start').disabled = !setup.charId; };
  $$('.char-card').forEach((b) => b.onclick = () => {
    setup.charId = b.dataset.char;
    $$('.char-card').forEach((x) => x.classList.toggle('on', x === b));
    FX.sound('click');
    upd();
  });
  if (setup.charId) $(`.char-card[data-char="${setup.charId}"]`).classList.add('on');
  upd();
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
  const c = CHARACTERS[setup.charId];
  const sc = getScenario(setup.code);
  app.innerHTML = `
  <section class="screen">
    <div class="intro">
      <div class="intro-hero" style="background-image:url('${imgSrc(c.bg)}')"></div>
      <div class="intro-body">
        <div class="step-label">Table ${esc(sc.code)} · ${esc(sc.name)}</div>
        <h2><img src="${flagSrc(c.flag)}" alt="" onerror="this.remove()">${esc(setup.name ? `${setup.name} plays ${c.name}` : c.name)}</h2>
        <p style="font-size:17px">${esc(c.intro)}</p>
        <div class="intro-goal"><b>🎯 Goal:</b> ${esc(c.goal)}</div>
        <div class="howto">
          <div><span class="n">1</span><b>Open a pack</b>Each year = one pack of 5 cards. Tear it open!</div>
          <div><span class="n">2</span><b>Read the cards</b>Click a card to learn what it is and when to use it.</div>
          <div><span class="n">3</span><b>File in order</b>Drag forms onto your Paper Trail. Wrong order = rejected, and the fee is lost.</div>
          <div><span class="n">4</span><b>End the year</b>Pick a bonus card, compare with your partner, then start the next year.</div>
        </div>
        <p class="muted" style="font-size:13.5px">Characters are fictional, but the forms, fees, rules and waiting times are based on real U.S. immigration law as of 2026 (simplified for the game). You have 12 years (${E.START_CAL}–${E.START_CAL + 11}).</p>
        <div class="row" style="display:flex;justify-content:space-between;gap:10px;margin-top:16px">
          <button class="btn" id="back">← Change character</button>
          <button class="btn primary big pulse" id="go">Begin ${E.START_CAL} →</button>
        </div>
      </div>
    </div>
  </section>`;
  $('#back').onclick = renderSetup;
  $('#go').onclick = () => {
    S = E.newGame({ code: setup.code, charId: setup.charId, name: setup.name });
    S.tips = {};
    beginYear();
  };
}

// ───────────────────────── BOARD ─────────────────────────
function guideText() {
  if (S.over) return 'Your journey is over.';
  if (!S.packOpened) return `Start by opening your ${E.yearLabel(S)} pack →`;
  const tips = [];
  const orders = [S.order];
  if (S.track === 'h2a' && S.flags.sponsored) orders.push(S.permOrder);
  for (const order of orders) {
    for (const id of order) {
      const t = E.stepDef(id);
      const st = S.steps[id];
      if (st.status === 'approved') continue;
      if (t.kind === 'season') { tips.push('Get through the Port of Entry to work the season.'); break; }
      if (st.status === 'rfe') { tips.push(`RFE! Find: ${st.missing.map((d) => CARDS[d].title).join(', ')}`); break; }
      if (st.status === 'pending') { tips.push(t.kind === 'lottery' ? 'Waiting for lottery results next year.' : `${t.label} is processing. Collect documents for what comes next.`); if (S.track === 'h1b') break; else continue; }
      if (st.status === 'waiting') { tips.push('You’re waiting in the green card line. Keep your visa status valid!'); break; }
      tips.push(st.revealed ? `Next: file “${CARDS[t.card].title}”.` : `Next step is secret: ${t.by === 'employer' ? 'your employer files it' : 'you file it'} with ${AGENCIES[t.agency].full}. Read your cards for clues!`);
      break;
    }
  }
  if (S.status === 'h1b' && S.year >= S.h1b.expire - 1) tips.unshift('⚠️ File an H-1B Extension before your visa runs out!');
  return (tips[0] || 'Nothing to file right now.') + ' Then press End Year.';
}

function nodeHTML(id, cur, isLast) {
  const t = E.stepDef(id);
  const st = S.steps[id];
  const ag = AGENCIES[t.agency] || AGENCIES.LIFE;
  let cls = 'node';
  let badge = '';
  let extra = '';
  const known = st.revealed || st.status === 'approved' || t.kind === 'season' || t.kind === 'bulletin';
  if (st.status === 'approved') { cls += ' approved'; badge = st.auto ? '✔ Done by employer' : '✔ Approved'; }
  else if (st.status === 'pending') { cls += ' pending'; badge = t.kind === 'lottery' ? '🎟 In the lottery' : `⏳ ${st.timer} yr left`; }
  else if (st.status === 'rfe') { cls += ' rfe'; badge = `⚠ RFE: need ${st.missing.map((d) => CARDS[d].title).join(', ')}`; }
  else if (st.status === 'waiting') {
    cls += ' waiting'; badge = '⏳ Waiting in line';
    const b = E.bulletinInfo(S);
    extra = `<div class="mini-line">Line at: ${E.fmtDate(b.cutoff)}<br>You: ${E.fmtDate(b.pd)}</div>`;
  } else if (cur) { cls += ' current'; badge = t.kind === 'bulletin' ? 'Needs an approved I-140' : t.kind === 'season' ? 'After Port of Entry' : '▶ Next step'; }
  else { cls += ' locked'; badge = t.kind === 'season' ? 'After Port of Entry' : 'Later'; }
  if (id === 'season' && S.status === 'season') { cls = 'node pending'; badge = '🧺 Season ready'; }
  if (id === 'n400' && S.gcYear && st.status === 'todo') extra = `<div class="mini-line" style="color:#bbf7d0">Eligible in ${E.START_CAL + S.gcYear + 3}</div>`;
  if (isLast) cls += ' final';
  const icon = t.kind === 'lottery' ? '🎟️' : t.kind === 'bulletin' ? '📰' : t.kind === 'season' ? '🧺' : '📄';
  return `<div class="${cls}" data-step="${id}" style="--ac:${ag.color}">
    <div class="strip"></div>
    <div class="n-top"><span>${icon} ${esc(ag.name)}</span></div>
    <div class="n-title ${known ? '' : 'unknown'}">${known ? esc(t.label) : '? ? ?'}</div>
    <div class="n-hint">${t.by === 'employer' ? 'Employer files' : t.by === 'you' ? 'You file' : 'Wait'}</div>
    ${extra}
    <span class="badge">${esc(badge)}</span>
  </div>`;
}

function trailHTML() {
  const order = S.order;
  const cur = order.find((id) => S.steps[id].status !== 'approved');
  let html = `<div class="trail">${order.map((id, i) => nodeHTML(id, id === cur, i === order.length - 1)).join('')}</div>`;
  if (S.track === 'h2a') {
    if (S.flags.sponsored) {
      const pc = S.permOrder.find((id) => S.steps[id].status !== 'approved');
      html += `<div class="trail sub"><div class="trail-label">Green card</div>${S.permOrder.map((id, i) => nodeHTML(id, id === pc, i === S.permOrder.length - 1)).join('')}</div>`;
    } else {
      html += `<div class="trail sub"><div class="node locked" style="max-width:none"><div class="n-top"><span>🔒 PERMANENT PATH</span></div><div class="n-title" style="min-height:0">No path to a green card</div><div class="n-hint">H-2A is temporary. Only a year-round employer could sponsor you (EB-3). Watch for a rare card…</div></div></div>`;
    }
  }
  return html;
}

function statusPills() {
  const p = [`<span class="pill">🪪 ${esc(E.statusLabel(S))}</span>`];
  if (S.track === 'h1b') {
    if (S.status === 'opt') p.push(`<span class="pill ${S.year >= 3 ? 'warn' : ''}">🎓 OPT work permit ends after ${E.START_CAL + 2}</span>`);
    if (S.lotteryTries) p.push(`<span class="pill">🎟 Lottery tries: ${S.lotteryTries}</span>`);
    if (S.status === 'h1b') p.push(`<span class="pill ${S.year >= S.h1b.expire - 1 ? 'warn' : ''}">📅 H-1B years used: ${S.year - S.h1b.start + 1} of ${S.steps.i140.status === 'approved' ? 'no limit (I-140 approved)' : 6}</span>`);
    if (S.pd) p.push(`<span class="pill">🎫 Priority date ${E.fmtDate(S.pd)}</span>`);
  } else {
    p.push(`<span class="pill">🧺 Seasons worked: ${S.seasons}</span>`);
    if (S.flags.knowRights) p.push('<span class="pill">⚖️ Knows rights</span>');
  }
  if (S.flags.shield) p.push('<span class="pill">🛡️ Lawyer on call</span>');
  if (S.flags.premium) p.push('<span class="pill">⚡ Premium processing ready</span>');
  if (S.flags.organize) p.push('<span class="pill">🗂 Organized</span>');
  return p.join('');
}

function lineVizHTML() {
  const ch = CHARACTERS[S.charId];
  if (S.track === 'h2a' && !S.flags.sponsored) {
    const pct = Math.max(0, Math.min(100, (S.money / ch.familyGoal) * 100));
    return `<div class="line-viz"><div class="lv-head"><b>🏠 Family house fund</b><span class="mono">${E.fmtMoney(S.money)} / ${E.fmtMoney(ch.familyGoal)}</span></div>
      <div class="fund-bar"><div style="width:${pct}%"></div></div>
      <div class="muted" style="font-size:12.5px;margin-top:6px">A good U.S. season earns about ${E.fmtMoney(16000 * S.wageMult)}. Your family needs $6,000 a year to live. Missing a season means going into debt.</div></div>`;
  }
  const b = E.bulletinInfo(S);
  const now = E.yearLabel(S);
  const isCurrent = b.cutoff >= now - 0.2;
  const cutoffTxt = isCurrent ? 'CURRENT (no wait)' : E.fmtDate(b.cutoff);
  if (b.pd == null) {
    return `<div class="line-viz"><div class="lv-head"><b>📰 Green card line: ${esc(b.label)}</b><span class="mono">Now serving: ${cutoffTxt}</span></div>
      <div class="muted" style="font-size:13px">${isCurrent ? 'This line has no backlog right now. You’ll join it when your I-140 is approved.' : `This line is serving people who got in line in <b style="color:#fecdd3">${Math.floor(b.cutoff)}</b> — ${Math.round(now - b.cutoff)} years ago. You’ll get your place in line when your I-140 is approved.`}</div></div>`;
  }
  const lo = Math.floor(Math.min(b.cutoff, b.pd)) - 1;
  const hi = Math.ceil(Math.max(b.pd, now)) + 1;
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  const est = E.estimateWait(S);
  return `<div class="line-viz"><div class="lv-head"><b>📰 Your place in line: ${esc(b.label)}</b><span class="mono">${b.current ? '✅ CURRENT' : `≈ ${est} more years`}</span></div>
    <div class="line-bar"><div class="fill" style="width:${pos(b.cutoff)}"></div>
      <div class="scale"><span>${lo}</span><span>${hi}</span></div>
      <div class="you" style="left:${pos(b.pd)}"><span>You: ${E.fmtDate(b.pd)}</span></div></div>
    <div class="muted" style="font-size:12.5px;margin-top:22px">Blue = how far the line has moved (now serving ${cutoffTxt}). Gold = your priority date.</div></div>`;
}

function renderBoard() {
  const ch = CHARACTERS[S.charId];
  const sec = E.security(S);
  const year = E.yearLabel(S);
  const handCount = S.hand.length;
  app.innerHTML = `
  <div id="game">
    <header class="hud">
      <div class="logo">${LOGO_SVG.replace('logo-mark', 'logo-mark" style="width:34px;height:34px')}<span class="logo-text">PAPER TRAIL</span></div>
      <div class="who"><img src="${flagSrc(ch.flag)}" alt="Flag of ${esc(ch.country)}" onerror="this.style.visibility='hidden'"><div><b>${esc(ch.name)}</b>${S.name && S.name !== ch.name ? ` <span class="muted" style="font-size:12px">(${esc(S.name)})</span>` : ''}<small>${esc(E.statusLabel(S))}</small></div></div>
      <div class="spacer"></div>
      <div class="stat"><span class="k">Table ${esc(S.code)}</span><span class="v">${year}</span><div class="year-dots">${Array.from({ length: E.MAX_YEARS }, (_, i) => `<i class="${i + 1 < S.year ? 'done' : i + 1 === S.year ? 'now' : ''}"></i>`).join('')}</div></div>
      <div class="stat"><span class="k">${S.track === 'h2a' ? 'Family savings' : 'Savings'}</span><span class="v ${S.money < 0 ? 'neg' : ''}" id="money">${E.fmtMoney(shownMoney ?? S.money)}</span></div>
      <div class="stat"><span class="k">Security</span><div class="pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= sec ? 'on' : ''}"></i>`).join('')}</div><span class="sec-label">${E.SECURITY_LABELS[sec]}</span></div>
      <button class="icon-btn" id="snd" title="Sound">${FX.isMuted() ? '🔇' : '🔊'}</button>
      <button class="icon-btn" id="menu" title="Menu">☰</button>
    </header>
    <section class="trail-wrap" id="trail">
      <div class="trail-head"><h3>Your Paper Trail</h3><span class="guide">${esc(guideText())}</span></div>
      ${trailHTML()}
      <div class="status-row">${statusPills()}</div>
    </section>
    <section class="middle">
      <div class="panel"><h4><span>🗂 Document folder</span><span>${S.folder.length}</span></h4><div class="folder-list">
        ${S.folder.map((f) => `<button class="doc-chip ${f.expires ? 'exp' : ''}" data-doc="${f.id}">${imgTag(CARDS[f.id].img, '', '')}<span><b>${esc(CARDS[f.id].title)}</b><small>${f.expires ? `Expires after ${E.START_CAL + f.expires - 1}` : esc(CARDS[f.id].sub)}</small></span></button>`).join('') || '<div class="muted" style="font-size:13px">No documents yet.</div>'}
      </div></div>
      <div class="center-grid">
        ${lineVizHTML()}
        <div class="panel"><h4><span>📓 Journal</span></h4><div class="journal">
          ${S.journal.slice(0, 14).map((j) => `<div class="jl ${j.tone}"><span class="yr">${j.cal}</span><span>${j.icon} ${esc(j.text)}</span></div>`).join('') || '<div class="muted">Your story will appear here.</div>'}
        </div></div>
      </div>
      <div class="panel actions-panel">
        <button class="pack-btn" id="pack-btn" ${S.packOpened ? 'disabled' : ''} aria-label="Open this year's pack">
          ${miniPackHTML()}
          <span class="lbl">${S.packOpened ? '✓ Pack opened' : `Open ${year} pack`}</span>
        </button>
        <button class="btn" id="help">❓ How to play</button>
      </div>
    </section>
    <section class="hand-wrap">
      <div class="hand-head"><span>✋ Your hand · <span class="${handCount > E.HAND_LIMIT ? 'over' : ''}">${handCount} / ${E.HAND_LIMIT} cards</span></span>
        <button class="btn ${S.packOpened ? 'primary pulse-soft' : ''} end-btn" id="end-year" ${S.packOpened ? '' : 'disabled'}>End ${year} →</button></div>
      <div class="hand" id="hand">
        ${S.hand.map((h, i) => cardHTML(h.id, { uid: h.uid, ttl: h.ttl, cls: '' })).join('') || '<div class="hand-empty">Your hand is empty. Open a pack to get cards.</div>'}
      </div>
    </section>
  </div>`;
  // fan the hand
  const cards = $$('#hand .card');
  const n = cards.length;
  cards.forEach((c, i) => {
    const off = i - (n - 1) / 2;
    c.style.transform = `translateY(${Math.abs(off) * 4}px) rotate(${off * 2.2}deg)`;
    c.style.zIndex = i + 1;
    enableDrag(c);
  });
  $('#pack-btn').onclick = openPack;
  $('#end-year').onclick = doEndYear;
  $('#help').onclick = showHelp;
  $('#menu').onclick = showMenu;
  $('#snd').onclick = () => { FX.setMuted(!FX.isMuted()); $('#snd').textContent = FX.isMuted() ? '🔇' : '🔊'; };
  $$('.doc-chip').forEach((b) => b.onclick = () => inspectCard({ id: b.dataset.doc }, true));
  animateMoney();
}

function miniPackHTML() {
  const ch = CHARACTERS[S.charId];
  return `<div class="mini-pack" style="border-radius:8px;background:linear-gradient(135deg, ${ch.color}, #111827 60%, ${ch.color});box-shadow:0 12px 30px rgba(0,0,0,.5), inset 0 0 0 2px rgba(255,255,255,.25);display:grid;place-items:center;position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.35) 45%,transparent 60%)"></div>
    <div style="text-align:center"><div style="font-size:30px">🗂️</div><div style="font-family:var(--font-display);font-weight:800;letter-spacing:.14em;font-size:12px">PAPER<br>TRAIL</div><div class="mono" style="font-size:10px;margin-top:4px;background:rgba(0,0,0,.35);border-radius:99px;padding:1px 6px">${E.yearLabel(S)}</div></div>
  </div>`;
}

function animateMoney() {
  const el = $('#money');
  if (!el) return;
  const from = shownMoney ?? S.money;
  const to = S.money;
  shownMoney = to;
  if (from === to) return;
  const t0 = performance.now();
  const dur = 900;
  if (to > from) FX.sound('coin');
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const v = from + (to - from) * (1 - Math.pow(1 - k, 3));
    el.textContent = E.fmtMoney(v);
    el.classList.toggle('neg', v < 0);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  FX.burstAt(el, { colors: to > from ? ['#86efac', '#fff', '#f5c451'] : ['#fca5a5', '#fff'], count: 16, power: 4, shape: 'spark' });
}

// ───────────────────────── drag & inspect ─────────────────────────
function enableDrag(cardEl) {
  const uid = cardEl.dataset.uid;
  cardEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inspectCard(S.hand.find((h) => h.uid === uid)); } });
  cardEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let ghost = null;
    let dragging = false;
    const trail = $('#trail');
    const move = (ev) => {
      if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 10) {
        dragging = true;
        ghost = document.createElement('div');
        ghost.innerHTML = cardEl.outerHTML;
        ghost = ghost.firstElementChild;
        ghost.classList.add('drag-ghost');
        ghost.style.transform = '';
        document.body.appendChild(ghost);
        cardEl.style.opacity = '0.25';
        FX.sound('whoosh');
      }
      if (dragging) {
        ghost.style.left = `${ev.clientX - 74}px`;
        ghost.style.top = `${ev.clientY - 104}px`;
        const r = trail.getBoundingClientRect();
        const over = ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom;
        const target = over ? $$('.node', trail).find((n) => { const nr = n.getBoundingClientRect(); return ev.clientX > nr.left - 12 && ev.clientX < nr.right + 12; }) : null;
        $$('.node', trail).forEach((n) => n.classList.toggle('drop-ok', n === target));
        trail.style.outline = over ? '2px dashed var(--gold)' : '';
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (dragging) {
        ghost.remove();
        cardEl.style.opacity = '';
        trail.style.outline = '';
        $$('.node', trail).forEach((n) => n.classList.remove('drop-ok'));
        const r = trail.getBoundingClientRect();
        if (ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom) doPlay(uid);
      } else {
        const h = S.hand.find((x) => x.uid === uid);
        if (h) inspectCard(h);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

function inspectCard(h, fromFolder = false) {
  const c = CARDS[h.id];
  const ag = AGENCIES[c.agency] || AGENCIES.LIFE;
  const credit = IMG[c.img];
  const tr = S ? S.track : 'h1b';
  const stepId = S && c.type === 'form' ? E.findStepForCard(S, h.id) : null;
  const docs = stepId ? E.stepDocs(E.stepDef(stepId)) : c.docs || [];
  let btns = '';
  if (!fromFolder && S && S.hand.some((x) => x.uid === h.uid)) {
    if (c.type === 'form') btns += `<button class="btn primary" id="do-play">📤 File on Paper Trail</button>`;
    if (c.type === 'action') {
      const cost = c.cost ? c.cost[tr] ?? 0 : 0;
      btns += `<button class="btn primary" id="do-play">✨ Use card${cost ? ` (${E.fmtMoney(cost)})` : ''}</button>`;
    }
    if (c.type !== 'wait') btns += `<button class="btn danger" id="do-discard">🗑 Discard</button>`;
  }
  const payer = c.fee ? (c.fee.payer === 'you' ? 'You pay' : 'Your employer pays') : '';
  const { close } = openOverlay(`
    <button class="icon-btn close-x" data-close aria-label="Close">✕</button>
    <div>${cardHTML(h.id, { ttl: h.ttl })}</div>
    <div class="info">
      <div class="step-label">${TYPE_INFO[c.type].icon} ${TYPE_INFO[c.type].label} · ${c.rarity}</div>
      <h2>${esc(c.title)}</h2>
      <div class="sub">${esc(c.sub)} · ${esc(ag.full)}</div>
      <section><b>What is it?</b><p>${esc(c.what)}</p></section>
      <section><b>When to use it</b><p>${esc(c.why)}</p></section>
      ${c.fee ? `<section><b>Cost</b><p>${c.fee.amt ? `${payer} ${E.fmtMoney(Math.round(c.fee.amt * (S ? S.feeMult : 1)))}.` : 'No government fee.'} ${c.time && c.type === 'form' ? `Processing: ${esc(c.time)}.` : ''}</p></section>` : ''}
      ${docs.length ? `<section><b>Documents needed</b><div class="needs">${docs.map((d) => { const have = S && E.hasDoc(S, d); return `<span class="${have ? 'have' : 'miss'}">${have ? '✓' : '✗'} ${esc(CARDS[d].title)}</span>`; }).join('')}</div></section>` : ''}
      <section class="fact"><b>💡 Did you know?</b><p>${esc(c.fact)}</p></section>
      <div class="row">${btns}<button class="btn" data-close>Close</button></div>
      ${credit ? `<div class="credit">Photo: ${esc(credit.title || '')} — ${esc(credit.author || '')}, ${esc(credit.license || '')}, via Wikimedia Commons</div>` : ''}
    </div>`, { cls: 'inspect' });
  const play = $('#do-play');
  if (play) play.onclick = () => { close(); doPlay(h.uid); };
  const disc = $('#do-discard');
  if (disc) disc.onclick = () => { E.discardCard(S, h.uid); close(); toast(`Discarded ${c.title}.`); save(); renderBoard(); };
}

async function doPlay(uid) {
  const h = S.hand.find((x) => x.uid === uid);
  if (!h) return;
  const c = CARDS[h.id];
  if (c.type === 'wait') { toast('Wait cards can’t be played. They leave on their own.', 'bad'); return; }
  if (!['form', 'action'].includes(c.type)) { toast('Only forms and action cards can be played.', 'bad'); return; }
  if (c.effect?.kind === 'canada' && !(await confirmBox('Move to Canada?', 'Moving to Canada ends your U.S. journey. You give up your place in the green card line.', 'Move to Canada'))) return;
  const res = E.playCard(S, uid);
  if (res.kind === 'info' || (!res.ok && !res.stamp && res.kind !== 'shield')) {
    toast(`${res.title ? res.title + ': ' : ''}${res.text}`, res.ok ? 'good' : '');
    save();
    renderBoard();
    return;
  }
  logJ(res.kind === 'rejected' ? '❌' : res.kind === 'rfe' ? '📨' : res.kind === 'shield' ? '🛡️' : '📄', `${res.title}: ${res.text}`, res.kind === 'rejected' ? 'bad' : res.kind === 'rfe' ? 'warn' : 'good');
  save();
  renderBoard();
  const node = res.stamp && $(`.node.approved, .node.pending`);
  if (res.stamp) FX.stamp(res.stamp);
  if (res.kind === 'approved' || res.kind === 'filed') FX.burstAt($('#trail'), { count: 30 });
  void node;
  await wait(res.stamp ? 900 : 0);
  await resultModal(res);
  if (S.over) return finishGame();
  maybeCoach();
}

// ───────────────────────── YEAR FLOW ─────────────────────────
function beginYear() {
  const report = E.startYear(S);
  for (const l of report.lines) logJ(l.icon, l.text, l.tone);
  save();
  renderBoard();
  showNews(report);
}

function showNews(report) {
  const n = report.news;
  const body = n.body.all || n.body[S.track];
  const stampAfter = S.lastStamp;
  S.lastStamp = null;
  save();
  const { el, close } = openOverlay(`
    <div class="cal-flip">
      <div class="cal-page"><div class="top">YEAR ${S.year} OF ${E.MAX_YEARS}</div><div class="yr">${E.yearLabel(S)}</div></div>
      <div><div class="step-label">${esc(CHARACTERS[S.charId].name)} · Table ${esc(S.code)}</div><h2>A new year begins</h2></div>
    </div>
    <div class="newspaper">
      <div class="mast"><span>THE DAILY DOCKET</span><span>SCENARIO NEWS · ${E.yearLabel(S)}</span></div>
      <h3>${n.icon} ${esc(n.headline)}</h3>
      <p>${esc(body)}</p>
    </div>
    ${report.lines.length ? `<div class="news-lines">${report.lines.map((l, i) => `<div class="jl ${l.tone}" style="animation-delay:${0.4 + i * 0.35}s"><span>${l.icon} ${esc(l.text)}</span></div>`).join('')}</div>` : ''}
    <div class="row"><button class="btn primary big" id="news-go">${S.pendingChoice ? 'Continue →' : `Open your ${E.yearLabel(S)} pack →`}</button></div>`, { cls: 'news', dismiss: false });
  if (stampAfter) setTimeout(() => FX.stamp(stampAfter), 500 + report.lines.length * 350);
  $('#news-go', el).onclick = async () => {
    close();
    if (S.pendingChoice) await showChoice();
    if (S.over) return finishGame();
    renderBoard();
    openPack();
  };
}

function showChoice() {
  return new Promise((resolve) => {
    const info = E.choiceInfo(S);
    if (!info) { S.pendingChoice = null; resolve(); return; }
    const { el, close } = openOverlay(`
      <div class="big-icon" style="font-size:48px">${info.icon}</div>
      <h2>${esc(info.title)}</h2>
      <p style="font-size:16px">${esc(info.text)}</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
        ${info.options.map((o, i) => `<button class="btn ${i === 0 ? 'primary' : ''} big" data-k="${o.key}">${esc(o.label)}</button>`).join('')}
      </div>`, { cls: 'result-modal', dismiss: false });
    $$('[data-k]', el).forEach((b) => b.onclick = async () => {
      const r = E.resolveChoice(S, b.dataset.k);
      close();
      if (r) { logJ(info.icon, `${r.title}: ${r.text}`, 'warn'); save(); await resultModal({ kind: 'action', ...r }); }
      save();
      resolve();
    });
  });
}

// ───────────────────────── PACK OPENING ─────────────────────────
function openPack() {
  if (S.packOpened || S.over) return;
  const ch = CHARACTERS[S.charId];
  const stage = document.createElement('div');
  stage.className = 'pack-stage';
  stage.innerHTML = `
    <div class="pack-title">${E.yearLabel(S)} Pack</div>
    <div class="pack-sub">Drag across the top edge to tear it open</div>
    <div class="pack" style="--pc1:${ch.color};--pc2:#111827" tabindex="0" aria-label="Card pack. Press Enter to tear open.">
      <div class="tear-hint">✂ drag this way →</div>
      <div class="p-top"><div class="crimp"></div><div class="foil"></div></div>
      <div class="tear-line"></div><div class="tear-prog"></div>
      <div class="p-body"><div class="foil"></div>
        <img class="p-flag" src="${flagSrc(ch.flag)}" alt="" onerror="this.remove()">
        <div class="p-seal">🗂️</div>
        <div class="p-logo">PAPER TRAIL</div>
        <div class="p-year">YEAR ${S.year} · ${E.PACK_SIZE} CARDS</div>
        <div class="crimp"></div>
      </div>
    </div>
    <div class="pack-controls"><button class="btn" id="tear-btn">✂ Tear open</button></div>`;
  document.body.appendChild(stage);
  const pack = $('.pack', stage);
  const prog = $('.tear-prog', stage);
  let tearing = false;
  let p = 0;
  let done = false;
  pack.addEventListener('pointermove', (e) => {
    const r = pack.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (!tearing) pack.style.transform = `rotateY(${(x - 0.5) * 18}deg) rotateX(${(0.5 - y) * 14}deg)`;
    $$('.foil', pack).forEach((f) => f.style.setProperty('--fx', `${x * 100}%`));
    if (tearing) {
      p = Math.max(p, Math.min(1, x));
      prog.style.width = `${p * 100}%`;
      if (p > 0.9) tear();
    }
  });
  pack.addEventListener('pointerleave', () => { if (!tearing) pack.style.transform = ''; });
  pack.addEventListener('pointerdown', (e) => {
    const r = pack.getBoundingClientRect();
    if ((e.clientY - r.top) / r.height < 0.34) {
      tearing = true;
      pack.setPointerCapture(e.pointerId);
      FX.sound('tear');
    } else {
      pack.classList.remove('shake');
      void pack.offsetWidth;
      pack.classList.add('shake');
      $('.pack-sub', stage).textContent = 'Grab the TOP edge and drag to the right →';
    }
  });
  pack.addEventListener('pointerup', () => { tearing = false; if (!done) { p = 0; prog.style.width = '0'; } });
  pack.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') tear(); });
  $('#tear-btn', stage).onclick = tear;

  function tear() {
    if (done) return;
    done = true;
    tearing = false;
    prog.style.width = '100%';
    FX.sound('tear');
    const r = pack.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height * 0.16, { colors: ['#fff', '#f5c451', ch.color], count: 50, power: 9, shape: 'spark' });
    pack.classList.add('torn');
    $('.tear-hint', stage)?.remove();
    // Apply the pack right away (so a refresh can't re-roll it), then animate the reveal.
    const cards = E.makePack(S);
    const results = cards.map((c) => E.collectCard(S, c));
    S.packOpened = true;
    S.phase = 'play';
    for (let i = 0; i < cards.length; i++) {
      const cd = CARDS[cards[i].id];
      logJ(TYPE_INFO[cd.type].icon, `Pack: ${cd.title}${results[i].text && cd.type !== 'form' && cd.type !== 'action' ? ` (${results[i].text})` : ''}`, results[i].tone === 'bad' ? 'bad' : 'info');
    }
    save();
    setTimeout(() => deal(cards, results), 650);
  }

  function deal(cards, results) {
    stage.innerHTML = `
      <div class="pack-title">${E.yearLabel(S)} Pack</div>
      <div class="pack-sub">Click each card to flip it</div>
      <div class="reveal-row">${cards.map((c, i) => `<div class="slot">${cardHTML(c.id, { down: true, uid: c.uid, cls: `deal-${i}` })}<div class="result-tag ${results[i].tone}">${esc(results[i].text)}</div></div>`).join('')}</div>
      <div class="pack-controls"><button class="btn" id="reveal-all">Flip all</button><button class="btn primary big hidden" id="collect">Add to hand →</button></div>`;
    $$('.reveal-row .card', stage).forEach((el, i) => {
      el.style.animationDelay = `${i * 0.09}s`;
      el.onclick = () => flip(el, i);
      el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(el, i); } };
    });
    FX.sound('whoosh');
    let flipped = 0;
    function flip(el, i) {
      if (!el.classList.contains('down')) return inspectCard({ id: cards[i].id }, true);
      el.classList.remove('down', 'glow-rare');
      const cd = CARDS[cards[i].id];
      FX.sound('flip');
      setTimeout(() => {
        if (cd.rarity === 'legendary') { FX.sound('legendary'); FX.burstAt(el, { colors: ['#f0abfc', '#67e8f9', '#fde047', '#fff'], count: 70, power: 10 }); }
        else if (cd.rarity === 'rare') { FX.sound('rare'); FX.burstAt(el, { colors: ['#f5c451', '#fff', '#fde68a'], count: 45, power: 8 }); }
        else if (cd.type === 'money') { FX.sound('coin'); FX.burstAt(el, { colors: ['#86efac', '#fff'], count: 20, power: 5, shape: 'spark' }); }
        else if (cd.type === 'wait' || cd.type === 'expense') FX.sound('bad');
        el.parentElement.querySelector('.result-tag').classList.add('show');
      }, 320);
      flipped++;
      if (flipped === cards.length) {
        $('#reveal-all', stage).classList.add('hidden');
        $('#collect', stage).classList.remove('hidden');
        $('.pack-sub', stage).textContent = 'Click a card to read about it — or add them to your hand.';
      }
    }
    $('#reveal-all', stage).onclick = async () => {
      const els = $$('.reveal-row .card', stage);
      for (let i = 0; i < els.length; i++) if (els[i].classList.contains('down')) { flip(els[i], i); await wait(260); }
    };
    $('#collect', stage).onclick = async () => {
      stage.remove();
      if (S.pendingChoice) await showChoice();
      const settled = E.settleInstant(S);
      for (const l of settled.lines) logJ(l.icon, l.text, l.tone);
      save();
      renderBoard();
      if (settled.stamp) FX.stamp(settled.stamp);
      if (S.over) return finishGame();
      maybeCoach();
    };
  }
}

// ───────────────────────── COACH (first year tips) ─────────────────────────
function coach(key, sel, text, place = 'above') {
  if (!S || S.year > 2 || (S.tips && S.tips[key])) return;
  S.tips = S.tips || {};
  const target = $(sel);
  if (!target) return;
  $$('.coach').forEach((c) => c.remove());
  const r = target.getBoundingClientRect();
  const tip = document.createElement('div');
  tip.className = 'coach';
  tip.innerHTML = `${esc(text)}<br><button>Got it</button>`;
  document.body.appendChild(tip);
  const tr = tip.getBoundingClientRect();
  let top = place === 'above' ? r.top - tr.height - 10 : r.bottom + 10;
  let left = Math.min(innerWidth - tr.width - 10, Math.max(10, r.left + r.width / 2 - tr.width / 2));
  if (place === 'left') { top = r.top + r.height / 2 - tr.height / 2; left = r.left - tr.width - 12; }
  tip.style.top = `${Math.max(10, top)}px`;
  tip.style.left = `${Math.max(10, left)}px`;
  $('button', tip).onclick = () => { S.tips[key] = true; tip.remove(); save(); maybeCoach(); };
}
function maybeCoach() {
  if (!S || S.year > 1) return;
  if (!S.tips) S.tips = {};
  if (!S.tips.hand && S.hand.length) return coach('hand', '#hand', 'This is your hand. Click a card to read it, then drag a form onto your Paper Trail (or use the “File” button).');
  if (!S.tips.trail) return coach('trail', '#trail .node', 'Your Paper Trail. Hidden steps show “? ? ?” — the agency and who files it are clues. Filing out of order gets REJECTED!', 'below');
  if (!S.tips.end) return coach('end', '#end-year', 'Done filing? End the year. Unused cards stay in your hand (limit 7).', 'left');
}

// ───────────────────────── END OF YEAR ─────────────────────────
function doEndYear() {
  $$('.coach').forEach((c) => c.remove());
  const res = E.endYear(S);
  S.lastEnd = res.lines;
  S.phase = 'end';
  for (const l of res.lines) logJ(l.icon, l.text, l.tone);
  save();
  renderBoard();
  showYearEnd();
}

function showYearEnd() {
  const lines = S.lastEnd || [];
  const year = E.yearLabel(S);
  const final = S.over || S.year >= E.MAX_YEARS;
  const { el, close } = openOverlay(`
    <div class="step-label">Year ${S.year} of ${E.MAX_YEARS}</div>
    <h2>End of ${year}</h2>
    <div class="ledger">${lines.map((l) => `<div class="jl ${l.tone}"><span>${l.icon} ${esc(l.text)}</span></div>`).join('')}</div>
    <div id="ye-body"></div>`, { cls: 'yearend', dismiss: false });
  const body = $('#ye-body', el);
  const stepDiscard = () => {
    const over = E.handExcess(S);
    const canDiscard = E.discardable(S);
    if (over > 0 && canDiscard.length && !final) {
      body.innerHTML = `<h3 style="margin-top:10px">✋ Too many cards! Discard ${over}.</h3><p class="muted">Your hand limit is ${E.HAND_LIMIT}. Wait cards can’t be discarded — they take up space until they expire.</p>
        <div class="discard-row">${S.hand.map((h) => cardHTML(h.id, { uid: h.uid, ttl: h.ttl, cls: CARDS[h.id].type === 'wait' ? 'wait' : '' })).join('')}</div>`;
      $$('.discard-row .card', body).forEach((c) => c.onclick = () => {
        if (CARDS[c.dataset.id].type === 'wait') { toast('Wait cards can’t be discarded.', 'bad'); return; }
        E.discardCard(S, c.dataset.uid);
        FX.sound('whoosh');
        save();
        stepDiscard();
      });
      return;
    }
    stepDraft();
  };
  const stepDraft = () => {
    if (final) {
      body.innerHTML = `<div class="row"><button class="btn primary big" id="finish">See your results →</button></div>`;
      $('#finish', body).onclick = () => { close(); E.nextYear(S); save(); finishGame(); };
      return;
    }
    if (S.phase === 'sync') return stepSync();
    const opts = E.draftOptions(S);
    save();
    body.innerHTML = `<h3 style="margin-top:14px">🎁 Choose 1 card to take into next year</h3>
      <div class="draft-row">${opts.map((id) => `<div class="draft-slot">${cardHTML(id)}<button class="link-btn" data-info="${id}">ⓘ Read more</button></div>`).join('')}</div>
      <p class="muted" style="text-align:center;font-size:13px">Click the card you want to keep.</p>`;
    $$('[data-info]', body).forEach((b) => b.onclick = () => inspectCard({ id: b.dataset.info }, true));
    $$('.draft-row .card', body).forEach((c) => c.onclick = () => {
      const r = E.takeDraft(S, c.dataset.id);
      FX.burstAt(c, { count: 30 });
      FX.sound(CARDS[c.dataset.id].rarity === 'legendary' ? 'legendary' : 'rare');
      logJ('🎁', `Chose ${CARDS[c.dataset.id].title}${r && r.text && CARDS[c.dataset.id].type === 'money' ? ` (${r.text})` : ''}`, 'good');
      if (r && r.fixed) { const st = E.settleInstant(S); for (const l of st.lines) logJ(l.icon, l.text, l.tone); if (st.stamp) FX.stamp(st.stamp); }
      save();
      stepSync();
    });
  };
  const stepSync = () => {
    S.phase = 'sync';
    save();
    const sec = E.security(S);
    const pr = E.progress(S);
    body.innerHTML = `
      <div class="sync-box">
        <div class="sync-card"><h4>Your snapshot · ${year}</h4>
          <div class="sync-big">${E.SECURITY_LABELS[sec]}</div>
          <div class="pips" style="margin:6px 0 10px">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= sec ? 'on' : ''}"></i>`).join('')}</div>
          <div>💵 ${S.track === 'h2a' ? 'Family savings' : 'Savings'}: <b>${E.fmtMoney(S.money)}</b></div>
          <div>🧾 Steps done: <b>${pr.done} / ${pr.total}</b>${S.track === 'h2a' ? ` · Seasons worked: <b>${S.seasons}</b>` : ''}</div>
          <div>❌ Rejections: <b>${S.stats.rejections}</b> · ⏳ Wait cards: <b>${S.stats.waitCards}</b></div>
        </div>
        <div class="sync-card"><h4>🤝 Partner check</h4>
          <ul class="partner-q">
            <li>Wait until your partner reaches this screen too.</li>
            <li>Tell each other your <b>security level</b> and <b>money</b>.</li>
            <li>Who is ahead right now? <b>Why?</b> Was it choices, luck, money — or the rules?</li>
          </ul>
        </div>
      </div>
      <div class="row"><button class="btn primary big" id="next-year">Start ${year + 1} →</button></div>`;
    $('#next-year', body).onclick = () => {
      close();
      if (E.nextYear(S)) beginYear();
      else finishGame();
    };
  };
  if (S.phase === 'sync') stepSync();
  else stepDiscard();
}

// ───────────────────────── END SCREEN ─────────────────────────
const REAL = {
  priya: [
    'In September 2026, the EB-2 green card line for India was “unavailable.” Its last cutoff was July 15, 2014 — people who got in line in 2014 were still waiting.',
    'A 2026 study (NFAP) projected that an Indian professional filing in 2026 could face a 179-year EB-2 wait. It’s a math projection — people leave the line and laws change — but the backlog is real.',
    'About 1 million Indians were waiting in employment-based green card lines at the end of 2025 — around 79% of the entire backlog.',
    'No country can get more than 7% of green cards in a year (about 25,620). India, with over 1.4 billion people, has the same limit as Iceland.',
  ],
  lukas: [
    'In 2026, the EB-2 line for Germany and most other countries was “Current” — no waiting for a visa number. The main delay was paperwork, like about 2 years for PERM.',
    'Lukas and Priya filed the same forms with the same employer. The main difference was the country where they were born.',
    'No country can get more than 7% of green cards in a year. Countries that send few applicants, like Germany, rarely hit that limit.',
    'Even “fast” employment green cards usually take 2–4 years after the H-1B, because PERM, the I-140 and the I-485 each take months.',
  ],
  marco: [
    'In 2025 the Department of Labor approved a record 398,258 H-2A jobs. About 9 out of 10 H-2A visas go to workers from Mexico.',
    'An average H-2A job lasts about 6 months. Workers can stay up to 3 years in a row, then must leave for at least 60 days.',
    'H-2A does not lead to a green card. Only a permanent, year-round job can be sponsored (EB-3 “other workers”), which is capped at 10,000 visas a year worldwide.',
    'A 2025 rule lowered minimum H-2A wages in most states. In August 2026 a federal court called that rule unlawful and ordered the Labor Department to redo it.',
    'People from Mexico working abroad sent about $62 billion home in 2025.',
  ],
};
const OUTCOME = {
  citizen: { text: 'U.S. CITIZEN', color: '#f5c451' },
  gc: { text: 'GREEN CARD', color: '#4ade80' },
  h1b: { text: 'STILL WAITING', color: '#fbbf24' },
  opt: { text: 'STILL A STUDENT', color: '#fbbf24' },
  student: { text: 'STILL A STUDENT', color: '#fbbf24' },
  left: { text: 'LEFT THE U.S.', color: '#fb7185' },
  expired: { text: 'VISA EXPIRED', color: '#fb7185' },
  canada: { text: 'MOVED TO CANADA', color: '#fb7185' },
  home: { text: 'SEASONAL WORKER', color: '#fbbf24' },
  season: { text: 'SEASONAL WORKER', color: '#fbbf24' },
};

function finishGame() {
  closeAllOverlays();
  S.over = true;
  S.phase = 'over';
  save();
  const ch = CHARACTERS[S.charId];
  const oc = OUTCOME[S.outcome === 'expired' ? 'expired' : S.status] || OUTCOME.h1b;
  const sec = E.security(S);
  const pr = E.progress(S);
  const yearsPlayed = S.year;
  const headline = {
    citizen: `${ch.name} became a U.S. citizen.`,
    gc: `${ch.name} got a green card.`,
    h1b: `${ch.name} is still waiting in line.`,
    left: `${ch.name} had to leave the United States.`,
    canada: `${ch.name} moved to Canada.`,
    home: `${ch.name} is still a seasonal guest worker.`,
    season: `${ch.name} is still a seasonal guest worker.`,
    student: `${ch.name} is still trying to win a visa.`,
    opt: `${ch.name} is still trying to win a visa.`,
  }[S.status] || `${ch.name}'s journey`;
  const share = `PAPER TRAIL · Table ${S.code} · ${ch.name} · ${E.SECURITY_LABELS[sec]} (${sec}/5) · ${yearsPlayed} yrs · ${E.fmtMoney(S.money)} · ${S.stats.rejections} rejections`;
  const extraQ = S.track === 'h2a'
    ? `Marco worked ${S.seasons} season${S.seasons === 1 ? '' : 's'} in the U.S. Should years of seasonal work count toward a green card? Why or why not?`
    : S.charId === 'priya'
      ? 'Priya and Lukas did the same things. Is a per-country limit fair? What would change if the limit were removed?'
      : 'Lukas moved faster than Priya with the same job and forms. How would you explain that to Priya?';
  app.innerHTML = `
  <section class="screen" style="align-items:flex-start">
    <div class="end">
      <div class="end-hero" style="--bgimg:url('${imgSrc(ch.bg)}')">
        <div>
          <div class="step-label">Final results · Table ${esc(S.code)} · ${E.START_CAL}–${E.yearLabel(S)}</div>
          <h1>${esc(headline)}</h1>
          <p class="muted" style="font-size:16px;margin:10px 0 0">${esc(S.name && S.name !== ch.name ? `${S.name} played ${ch.name}. ` : '')}${esc(E.statusLabel(S))}.</p>
        </div>
        <div class="end-outcome" style="color:${oc.color}">${oc.text}</div>
      </div>
      <div class="stats-grid">
        <div class="stat-box"><div class="k">Security reached</div><div class="v">${sec} / 5</div><div class="pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= sec ? 'on' : ''}"></i>`).join('')}</div></div>
        <div class="stat-box"><div class="k">${S.track === 'h2a' ? 'Family savings' : 'Savings'}</div><div class="v" style="color:${S.money < 0 ? 'var(--red)' : ''}">${E.fmtMoney(S.money)}</div></div>
        <div class="stat-box"><div class="k">Fees paid (you / employer)</div><div class="v" style="font-size:22px">${E.fmtMoney(S.stats.feesYou)} / ${E.fmtMoney(S.stats.feesEmployer)}</div></div>
        <div class="stat-box"><div class="k">${S.track === 'h2a' ? 'Seasons worked' : 'Years waiting in line'}</div><div class="v">${S.track === 'h2a' ? S.seasons : S.stats.yearsInLine}</div></div>
        <div class="stat-box"><div class="k">Steps completed</div><div class="v">${pr.done} / ${pr.total}</div></div>
        <div class="stat-box"><div class="k">Rejections</div><div class="v">${S.stats.rejections}</div></div>
        <div class="stat-box"><div class="k">Wait cards received</div><div class="v">${S.stats.waitCards}</div></div>
        <div class="stat-box"><div class="k">Cards opened</div><div class="v">${S.stats.cardsOpened}</div></div>
      </div>
      <div class="end-cols">
        <div class="panel"><h4><span>🗓 Your journey</span></h4>
          <ul class="timeline">${S.history.map((h) => `<li><span class="y">${h.cal}</span><span>${h.icon}</span><span>${esc(h.text)}</span></li>`).join('') || '<li>No events recorded.</li>'}</ul>
        </div>
        <div>
          <div class="real"><h3>🌎 Real-world check</h3><ul>${REAL[S.charId].map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
          <div class="discuss"><h3>💬 Talk with your partner</h3><ol>
            <li>What decided how far you got: your choices, luck, money, or where you were born?</li>
            <li>Compare end screens. Who reached more security? Was that fair?</li>
            <li>${esc(extraQ)}</li>
            <li>If you were in Congress, what ONE rule would you change? Who would support it, and who might object?</li>
          </ol></div>
        </div>
      </div>
      <div class="share-line" title="Copy this for your class chart">${esc(share)}</div>
      <div class="end-actions">
        <button class="btn primary big" id="again">↻ Play again</button>
        <button class="btn big" id="other">Try another character</button>
        <a class="btn big" href="teacher.html">Teacher guide</a>
      </div>
    </div>
  </section>`;
  if (sec >= 4) FX.confettiRain();
  $('#again').onclick = () => { setup.charId = S.charId; store.del('pt-save'); renderIntro(); };
  $('#other').onclick = () => { setup.charId = null; store.del('pt-save'); renderSetup(); };
  window.scrollTo(0, 0);
}

// ───────────────────────── menus ─────────────────────────
function showHelp() {
  openOverlay(`
    <button class="icon-btn close-x" data-close aria-label="Close">✕</button>
    <h2>How to play</h2>
    <ol style="font-size:15.5px;line-height:1.6">
      <li><b>Open your pack.</b> Each year you get ${E.PACK_SIZE} cards. Money and expense cards happen right away. Documents go into your folder. Forms and actions go into your hand.</li>
      <li><b>Read your cards.</b> Click any card to learn what it is, who files it, and what it needs.</li>
      <li><b>File forms in order.</b> Drag a form onto your Paper Trail (or click it and press File). Too early = <b>REJECTED</b>: the fee is lost and a Rejection Notice clogs your hand.</li>
      <li><b>Documents matter.</b> If you file the right form but are missing a document, you get a <b>Request for Evidence (RFE)</b>. Find the document before the deadline or it is denied.</li>
      <li><b>Wait cards</b> can’t be played or discarded. They take up space in your hand until they expire.</li>
      <li><b>End the year.</b> Keep up to ${E.HAND_LIMIT} cards, pick 1 bonus card, then compare with your partner.</li>
    </ol>
    <h3 style="margin-top:14px">Who’s who</h3>
    <ul style="font-size:14.5px">${Object.values(AGENCIES).filter((a) => !['You', 'Life'].includes(a.name)).map((a) => `<li><b style="color:${a.color}">${esc(a.name)}</b> — ${esc(a.full)}</li>`).join('')}</ul>
    <h3 style="margin-top:14px">Security levels</h3>
    <p style="font-size:14.5px">${E.SECURITY_LABELS.map((l, i) => `<b>${i}</b> ${esc(l)}`).join(' · ')}</p>
    <div class="row"><button class="btn primary" data-close>Back to the game</button></div>`);
}
function showMenu() {
  const { el, close } = openOverlay(`
    <h2>Menu</h2>
    <p class="muted">Table ${esc(S.code)} · ${esc(S.scenario.name)}</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <button class="btn" id="m-help">❓ How to play</button>
      <a class="btn" href="teacher.html" target="_blank" rel="noopener">📘 Teacher guide</a>
      <button class="btn danger" id="m-quit">⏏ Quit to title (your game is saved)</button>
      <button class="btn" data-close>Close</button>
    </div>`, { cls: 'result-modal' });
  $('#m-help', el).onclick = () => { close(); showHelp(); };
  $('#m-quit', el).onclick = () => { close(); renderTitle(); };
}

// ───────────────────────── resume ─────────────────────────
function resumeGame() {
  shownMoney = S.money;
  if (S.over || S.phase === 'over') return finishGame();
  renderBoard();
  if (S.phase === 'end' || S.phase === 'sync') showYearEnd();
  else if (S.pendingChoice) showChoice().then(() => { save(); renderBoard(); });
}

// ───────────────────────── boot ─────────────────────────
loadCredits().then(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('code')) { setup.code = normalizeCode(params.get('code')); store.set('pt-code', setup.code); }
  renderTitle();
});
