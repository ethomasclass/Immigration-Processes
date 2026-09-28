// Game rules. Pure state + functions; the UI (main.js) calls these and animates the results.
import { CARDS, FILLER } from './data/cards.js';
import { CHARACTERS, TEXTS } from './data/characters.js';
import { getScenario, NEWS } from './data/scenarios.js';
import { DILEMMAS } from './data/dilemmas.js';
import { Rng } from './rng.js';

export const TURNS = 8;
// Each turn covers about 1.5 years.
export const TURN_YEARS = [2027, 2028, 2030, 2031, 2033, 2034, 2036, 2037];
export const HAND_LIMIT = 6;
export const PACK_SIZE = 4;

// "Now Serving" lines, based on the Sept 2026 Visa Bulletin: most countries (incl. Germany)
// were Current; India's EB-2 cutoff was July 2014; EB-3 Other Workers (Mexico) was Apr 2022.
// speed = how many years the line moves forward each turn.
export const CHARTS = {
  row: { label: 'Germany & most countries', start: 2026.9, speed: 1.5 },
  india: { label: 'India', start: 2014.55, speed: 0.6 },
  'india-eb1': { label: 'India · top talent (EB-1)', start: 2024.5, speed: 1.3 },
  'mexico-eb3': { label: 'Mexico · year-round workers', start: 2022.25, speed: 0.9 },
};

export const TRACKS = {
  h1b: [
    { id: 'lottery', card: 'lottery', name: 'Lottery', agency: 'USCIS', by: 'boss', kind: 'lottery' },
    { id: 'visa', card: 'work-visa', name: 'Work Visa', agency: 'USCIS', by: 'boss', turns: 1 },
    { id: 'perm', card: 'perm', name: 'No American Applied', agency: 'DOL', by: 'boss', turns: 1 },
    { id: 'line', card: 'get-in-line', name: 'Get in Line', agency: 'USCIS', by: 'boss', turns: 1 },
    { id: 'wait', kind: 'wait', name: 'Now Serving', agency: 'DOS', by: 'wait' },
    { id: 'gc', card: 'gc-app', name: 'Green Card', agency: 'USCIS', by: 'you', turns: 1 },
  ],
  h2a: [
    { id: 'permission', card: 'farm-permission', name: 'Farm Permission', agency: 'DOL', by: 'boss', turns: 0 },
    { id: 'request', card: 'farm-request', name: 'Worker Request', agency: 'USCIS', by: 'boss', turns: 0 },
    { id: 'interview', card: 'visa-interview', name: 'Visa Interview', agency: 'DOS', by: 'you', turns: 0 },
    { id: 'border', card: 'border', name: 'Border', agency: 'CBP', by: 'you', turns: 0 },
    { id: 'season', kind: 'season', name: 'Harvest', agency: 'LIFE', by: 'you' },
  ],
  h2aPerm: [
    { id: 'pperm', card: 'perm', name: 'No American Applied', agency: 'DOL', by: 'boss', turns: 1 },
    { id: 'pline', card: 'get-in-line', name: 'Get in Line', agency: 'USCIS', by: 'boss', turns: 1, docs: [] },
    { id: 'pwait', kind: 'wait', name: 'Now Serving', agency: 'DOS', by: 'wait' },
    { id: 'pvisa', card: 'immigrant-visa', name: 'Green Card', agency: 'DOS', by: 'you', turns: 1 },
  ],
};
const ALL_STEPS = [...TRACKS.h1b, ...TRACKS.h2a, ...TRACKS.h2aPerm];

export const LADDER = ['No U.S. status', 'Temporary', 'Work visa', 'In line', 'Green card'];

let uidN = 1;
const uid = () => 'c' + (uidN++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
const inst = (id, extra = {}) => ({ uid: uid(), id, ...extra });
export const money$ = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
export const fmtDate = (d) => {
  const y = Math.floor(d);
  const m = Math.min(11, Math.floor((d - y) * 12));
  return ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][m] + ' ' + y;
};
export const yearOf = (s) => TURN_YEARS[Math.min(s.turn, TURNS) - 1];

function rng(s) { const r = new Rng(0); r.s = s.rngS >>> 0; return r; }
function saveRng(s, r) { s.rngS = r.s; }
export const stepDef = (id) => ALL_STEPS.find((t) => t.id === id);
export const stepDocs = (t) => t.docs ?? (t.card ? CARDS[t.card].docs || [] : []);
export const hasDoc = (s, id) => s.folder.some((f) => f.id === id);
const inHand = (s, id) => s.hand.some((h) => h.id === id);
function history(s, icon, text) { s.history.push({ year: yearOf(s), icon, text }); }

// ───────────────────────────── setup ─────────────────────────────
export function newGame({ code, charId, name }) {
  const ch = CHARACTERS[charId];
  const scenario = getScenario(code);
  const s = {
    v: 2, code: scenario.code, scenario, charId, name: name || '', track: ch.track,
    turn: 1, phase: 'start', over: false, outcome: null,
    money: ch.startMoney, incomeBonus: 0, wageMult: 1, remitTax: false,
    hand: ch.startHand.map((id) => inst(id)),
    folder: ch.startFolder.map((id) => inst(id)),
    steps: {},
    order: TRACKS[ch.track].map((t) => t.id),
    permOrder: ch.track === 'h2a' ? TRACKS.h2aPerm.map((t) => t.id) : [],
    status: ch.track === 'h1b' ? 'opt' : 'home',
    tries: 0, pd: null, keptPd: null, chart: ch.chart, gcYear: null,
    line: Object.fromEntries(Object.entries(CHARTS).map(([k, c]) => [k, c.start])),
    flags: {}, pity: {}, seasons: 0, workedLast: false, season: { mult: 1, bonus: 0 },
    rngS: new Rng(`${scenario.code}|${charId}|${name}|${Date.now()}|${Math.random()}`).s,
    pack: null, packOpened: false, dilemma: null, used: [], tags: ['start'], textsUsed: [],
    history: [], log: [],
    stats: { feesYou: 0, feesBoss: 0, rejections: 0, waitCards: 0, cards: 0, turnsInLine: 0, scammed: false },
  };
  for (const t of ALL_STEPS) {
    if (s.order.includes(t.id) || s.permOrder.includes(t.id)) s.steps[t.id] = { status: 'todo', timer: 0, missing: [] };
  }
  if (s.track === 'h2a') {
    for (const id of ['permission', 'request']) Object.assign(s.steps[id], { status: 'approved', auto: true });
  }
  return s;
}

// ───────────────────────────── status ─────────────────────────────
export function ladder(s) {
  if (s.status === 'canada') return 4;
  if (s.status === 'gc') return 4;
  if (s.status === 'left') return 0;
  if (s.track === 'h1b') {
    if (s.status === 'h1b') return s.steps.line.status === 'approved' ? 3 : 2;
    return 1;
  }
  if (s.steps.pline.status === 'approved') return 3;
  return s.workedLast || s.status === 'season' ? 1 : 0;
}
export function statusText(s) {
  return {
    opt: 'Student work permit', student: 'Back in school', h1b: 'Work visa (H-1B)', gc: 'Green card holder',
    left: 'Moved home', canada: 'Living in Canada', season: 'In the U.S. for the harvest',
    home: s.seasons ? 'Home between seasons' : 'At home in Mexico',
  }[s.status] || s.status;
}
export function lineInfo(s) {
  const cut = s.line[s.chart];
  const now = yearOf(s);
  return { label: CHARTS[s.chart].label, cutoff: cut, pd: s.pd, current: s.pd != null && s.pd <= cut, isCurrent: cut >= now - 0.3 };
}
export function waitEstimate(s) {
  if (s.pd == null) return null;
  const gap = s.pd - s.line[s.chart];
  return gap <= 0 ? 0 : Math.ceil(gap / (CHARTS[s.chart].speed / 1.5));
}
function currentIndex(s, order) {
  const i = order.findIndex((id) => s.steps[id].status !== 'approved');
  return i === -1 ? order.length : i;
}
export function currentStep(s, order = s.order) {
  const id = order[currentIndex(s, order)];
  return id ? stepDef(id) : null;
}

// ───────────────────────────── approvals ─────────────────────────────
function approve(s, id, notes) {
  const st = s.steps[id];
  st.status = 'approved';
  let stamp = 'APPROVED';
  const note = (app, text, tone = 'good') => notes.push({ app, text, tone });
  switch (id) {
    case 'visa':
      s.status = 'h1b'; s.tags.push('visa');
      note('uscis', 'Case approved: Work Visa. You can work in the U.S. for your employer.');
      history(s, '🛂', 'Got an H-1B work visa');
      break;
    case 'perm': case 'pperm':
      note('dol', 'Approved: no U.S. worker applied for the job.');
      history(s, '📰', '"No American Applied" approved');
      break;
    case 'line': case 'pline': {
      const filed = s.steps[id].filedYear ?? yearOf(s);
      s.pd = Math.min(s.keptPd ?? Infinity, filed + 0.3);
      s.tags.push('line');
      note('uscis', `Approved: you're in the green card line. Your ticket number is ${fmtDate(s.pd)}.`);
      history(s, '🎫', `Got a ticket number: ${fmtDate(s.pd)}`);
      stamp = 'IN LINE';
      break;
    }
    case 'wait': case 'pwait':
      note('state', 'Now Serving reached your number! You can apply for your green card.');
      history(s, '🔔', 'Your number was called');
      stamp = 'YOUR TURN';
      break;
    case 'gc': case 'pvisa':
      s.status = 'gc'; s.gcYear = yearOf(s); s.tags.push('gc');
      note('uscis', 'Welcome! Your green card was approved. You can live here for good.', 'great');
      history(s, '🟩', 'Got a green card!');
      stamp = 'GREEN CARD';
      break;
    case 'interview':
      s.tags.push('visa');
      note('state', 'Your H-2A visa is ready. It\'s placed in your passport.');
      break;
    case 'border':
      s.status = 'season';
      note('farm', 'You crossed the border. Your crew starts tomorrow at 5 a.m.');
      break;
    default:
      note('uscis', `${stepDef(id).name}: approved.`);
  }
  return stamp;
}

// ───────────────────────────── turn start ─────────────────────────────
export function startTurn(s) {
  const r = rng(s);
  const notes = [];
  let stamp = null;
  let sign = null;
  const news = NEWS[s.scenario.news[s.turn - 1]] || NEWS.quiet;
  const eff = news.effect || {};
  s.pack = null; s.packOpened = false; s.dilemma = null; s.phase = 'start';
  s.season = { mult: 1, bonus: 0 };
  const prevTags = s.turn > 1 ? s.tags : [];
  if (s.turn > 1) s.tags = [];

  if (s.turn > 1) for (const k of Object.keys(CHARTS)) s.line[k] += CHARTS[k].speed;
  if (eff.money?.[s.track]) s.money += eff.money[s.track];
  if (eff.bulletin) for (const [k, v] of Object.entries(eff.bulletin)) s.line[k] += v;
  if (eff.wageMult && s.track === 'h2a') s.wageMult *= eff.wageMult;
  if (eff.remitTax) s.remitTax = true;
  if (eff.season) s.season.mult = eff.season;
  if (eff.seasonBonus) s.season.bonus = eff.seasonBonus;
  if (eff.addWait?.[s.track]) { s.hand.push(inst(eff.addWait[s.track], { ttl: 1 })); s.stats.waitCards++; }
  if (eff.slowdown) for (const t of ALL_STEPS) if (s.steps[t.id]?.status === 'pending' && t.kind !== 'lottery') s.steps[t.id].timer++;
  notes.push({ app: 'news', text: `${news.headline}. ${news.text.all || news.text[s.track]}`, tone: 'info' });

  const lay = s.scenario.layoff?.[s.turn];
  if (s.track === 'h1b' && lay?.[s.charId]) layoff(s, notes);

  // Paperwork that was waiting gets decided.
  for (const t of ALL_STEPS) {
    const st = s.steps[t.id];
    if (!st || st.status !== 'pending' || t.kind === 'lottery') continue;
    st.timer -= 1;
    if (st.timer <= 0) stamp = approve(s, t.id, notes);
    else notes.push({ app: t.agency === 'DOL' ? 'dol' : 'uscis', text: `${t.name}: still being reviewed.`, tone: 'info' });
  }

  if (s.track === 'h1b') {
    const lot = s.steps.lottery;
    if (lot.status === 'pending') {
      s.tries++;
      const script = s.scenario.lottery?.[s.charId];
      const won = script && script[s.tries - 1] !== undefined ? script[s.tries - 1] : r.chance(0.35);
      if (won) {
        approve(s, 'lottery', []);
        s.tags.push('lottery-win');
        notes.push({ app: 'uscis', text: `You were SELECTED in the work visa lottery (try #${s.tries})! Your boss can now send your Work Visa Request.`, tone: 'great' });
        history(s, '🎟️', `Won the lottery on try #${s.tries}`);
        stamp = 'SELECTED';
      } else {
        lot.status = 'todo';
        s.hand.push(inst('lottery'));
        s.tags.push('lottery-lose');
        notes.push({ app: 'uscis', text: `Not selected in the lottery (try #${s.tries}). Your ticket is back in your hand.`, tone: 'bad' });
        history(s, '🎟️', `Lost the lottery (try #${s.tries})`);
        stamp = 'NOT PICKED';
      }
    }
    if (s.status === 'opt' && s.turn === 4 && lot.status !== 'approved') s.dilemma = 'opt-end';
  } else {
    marcoSeasonStart(s, r, notes);
  }

  // Now Serving
  const waitId = s.track === 'h1b' ? 'wait' : 'pwait';
  const lineId = s.track === 'h1b' ? 'line' : 'pline';
  if (s.steps[lineId]?.status === 'approved' && s.steps[waitId].status !== 'approved' && !['left', 'canada'].includes(s.status)) {
    const before = s.line[s.chart] - (s.turn > 1 ? CHARTS[s.chart].speed : 0);
    const info = lineInfo(s);
    sign = { before, after: info.cutoff, pd: s.pd, label: info.label, current: info.current };
    if (info.current) stamp = approve(s, waitId, notes);
    else {
      s.steps[waitId].status = 'waiting';
      s.stats.turnsInLine++;
      s.tags.push('waiting');
      const n = s.stats.turnsInLine > 1 ? 2 : 1;
      for (let i = 0; i < n; i++) s.hand.push(inst('take-number', { ttl: 2 }));
      s.stats.waitCards += n;
      sign.estimate = waitEstimate(s);
    }
  }

  notes.splice(1, 0, familyText(s, r, prevTags));
  saveRng(s, r);
  s.lastNotes = notes;
  s.lastSign = sign;
  s.lastStamp = stamp;
  return { notes, sign, stamp, news };
}

function marcoSeasonStart(s, r, notes) {
  if (s.turn === 1) return;
  for (const id of s.order) Object.assign(s.steps[id], { status: 'todo', timer: 0, missing: [], auto: false });
  s.status = 'home';
  const news = NEWS[s.scenario.news[s.turn - 1]] || {};
  const noRehire = news.effect?.noRehire || s.flags.noRehireNext;
  s.flags.noRehireNext = false;
  const rehired = s.flags.recruited || (!noRehire && (s.workedLast || r.chance(0.5)));
  s.flags.recruited = false;
  if (rehired) {
    for (const id of ['permission', 'request']) Object.assign(s.steps[id], { status: 'approved', auto: true });
    notes.push({ app: 'farm', text: s.workedLast ? 'We filed for you again this season. See you soon!' : 'A new farm in North Carolina filed papers for you!', tone: 'good' });
  } else {
    notes.push({ app: 'farm', text: 'No farm has filed for you yet. You need a farm\'s permission and worker request first.', tone: 'bad' });
  }
}

function familyText(s, r, prevTags = []) {
  const pool = TEXTS[s.charId];
  const order = ['gc', 'lottery-win', 'lottery-lose', 'rejected', 'line', 'visa', 'waiting', 'season', 'missed', 'start'];
  const tags = [...s.tags, ...prevTags];
  const tag = order.find((t) => tags.includes(t) && pool[t]) || 'default';
  const options = pool[tag].filter((t) => !s.textsUsed.includes(t));
  const text = options.length ? r.pick(options) : r.pick(pool.default);
  s.textsUsed.push(text);
  const ch = CHARACTERS[s.charId];
  return { app: 'family', from: `${ch.family} (${ch.familyRole})`, text, tone: 'family' };
}

function layoff(s, notes) {
  if (s.status === 'gc') {
    s.money -= 2000;
    notes.push({ app: 'news', text: 'You were laid off, but with a green card you can take any job. You found one in 2 months. (−$2,000)', tone: 'warn' });
    history(s, '📉', 'Laid off, but a green card let me switch fast');
  } else if (s.status === 'h1b') {
    s.money -= 3000;
    const kept = restartGreenCard(s);
    notes.push({ app: 'news', text: `You were laid off! You had 60 days to find a new sponsor, and you did. But your green card steps start over.${kept ? ' You keep your ticket number.' : ''} (−$3,000)`, tone: 'bad' });
    history(s, '📉', 'Laid off. Green card steps restarted.');
  } else {
    s.money -= 1500;
    notes.push({ app: 'news', text: 'Your company cut jobs. You found another one but lost a month of pay. (−$1,500)', tone: 'warn' });
  }
}

export function restartGreenCard(s) {
  const kept = s.steps.line.status === 'approved';
  if (kept) s.keptPd = s.pd;
  s.pd = null;
  for (const id of ['perm', 'line', 'wait']) Object.assign(s.steps[id], { status: 'todo', timer: 0, missing: [] });
  return kept;
}

// ───────────────────────────── packs ─────────────────────────────
function needs(s) {
  const need = [];
  const decoys = [];
  const docs = [];
  const orders = [s.order];
  if (s.flags.sponsored) orders.push(s.permOrder);
  for (const order of orders) {
    const todo = order.map(stepDef).filter((t) => t.card && s.steps[t.id].status === 'todo');
    if (s.track === 'h2a' && order === s.order) {
      for (const t of todo) if (!inHand(s, t.card)) need.push(t.card);
    } else if (todo.length) {
      if (!inHand(s, todo[0].card)) need.push(todo[0].card);
      for (const t of todo.slice(1)) if (!inHand(s, t.card)) decoys.push(t.card);
    }
    for (const t of order.map(stepDef).filter((x) => x.card && s.steps[x.id].status !== 'approved')) {
      for (const d of stepDocs(t)) if (!hasDoc(s, d) && !docs.includes(d)) docs.push(d);
    }
  }
  return { need, decoys: decoys.filter((d) => !need.includes(d)), docs };
}

export function makePack(s) {
  if (s.pack) return s.pack;
  const r = rng(s);
  const { need, decoys, docs } = needs(s);
  const size = PACK_SIZE - (s.flags.smallPack ? 1 : 0);
  s.flags.smallPack = false;
  const pack = [];
  const multi = s.track === 'h2a';
  const P = { 'visa-interview': 0.8, border: 0.8, 'farm-permission': 0.55, 'farm-request': 0.55 };
  const justWon = s.steps.lottery?.status === 'approved' && s.steps.visa?.status === 'todo' && s.tags.includes('lottery-win');
  need.forEach((id, i) => {
    if (pack.length >= 2 + (multi ? 1 : 0)) return;
    const pity = s.pity[id] || 0;
    const forced = s.flags.organize || s.turn === 1 || (id === 'work-visa' && justWon) || pity >= 1;
    if (forced || r.chance(multi ? P[id] ?? 0.5 : i === 0 ? 0.6 : 0.3)) { pack.push(inst(id)); s.pity[id] = 0; }
    else s.pity[id] = pity + 1;
  });
  s.flags.organize = false;
  if (docs.length && pack.length < size - 1) {
    const d = docs[0];
    const pity = s.pity['d:' + d] || 0;
    if (pity >= 1 || r.chance(0.5)) { pack.push(inst(d)); s.pity['d:' + d] = 0; } else s.pity['d:' + d] = pity + 1;
  }
  if (decoys.length && pack.length < size - 1 && r.chance(0.35)) pack.push(inst(r.pick(decoys)));
  const pool = FILLER[s.track];
  const w = { money: 32, bill: 28, action: 22, wait: 10 };
  while (pack.length < size) {
    const type = r.weighted(Object.keys(w), (k) => w[k]);
    let id = r.pick(pool[type]);
    if (id === 'fast-track' && !['visa', 'line'].some((x) => s.steps[x]?.status !== 'approved')) id = 'organize';
    if (type === 'action' && pack.some((c) => c.id === id)) continue; // no duplicate help cards in one pack
    pack.push(inst(id));
  }
  s.pack = r.shuffle(pack).slice(0, size);
  s.stats.cards += s.pack.length;
  saveRng(s, r);
  return s.pack;
}

export function collectCard(s, c) {
  const card = CARDS[c.id];
  if (card.type === 'money' || card.type === 'bill') {
    s.money += card.amount;
    return { text: `${card.amount > 0 ? '+' : '−'}${money$(Math.abs(card.amount))}`, tone: card.amount > 0 ? 'good' : 'bad' };
  }
  if (card.type === 'doc') {
    if (hasDoc(s, c.id)) { s.money += 100; return { text: 'Extra copy · +$100', tone: 'info' }; }
    if (card.cost) { s.money -= card.cost; s.stats.feesYou += card.cost; }
    s.folder.push(c);
    return { text: fixMissing(s) ? 'To papers · unblocked a step!' : 'Added to your papers', tone: 'good' };
  }
  if (card.type === 'wait') {
    s.hand.push({ ...c, ttl: card.ttl });
    s.stats.waitCards++;
    return { text: 'Stuck in your hand', tone: 'bad' };
  }
  s.hand.push(c);
  return { text: 'To your hand', tone: 'info' };
}

function fixMissing(s) {
  let fixed = false;
  for (const t of ALL_STEPS) {
    const st = s.steps[t.id];
    if (!st || st.status !== 'missing') continue;
    st.missing = st.missing.filter((d) => !hasDoc(s, d));
    if (!st.missing.length) { fixed = true; st.status = 'pending'; st.timer = t.turns || 0; }
  }
  return fixed;
}
// Approve any zero-time steps that just got unblocked (e.g., Marco's visa after his passport arrives).
export function settle(s) {
  const notes = [];
  let stamp = null;
  for (const t of ALL_STEPS) {
    const st = s.steps[t.id];
    if (st && st.status === 'pending' && st.timer <= 0 && t.kind !== 'lottery') stamp = approve(s, t.id, notes);
  }
  return { notes, stamp };
}

// ───────────────────────────── playing cards ─────────────────────────────
export function stepForCard(s, cardId) {
  return s.order.find((id) => stepDef(id).card === cardId)
    || s.permOrder.find((id) => stepDef(id).card === cardId && s.flags.sponsored)
    || s.permOrder.find((id) => stepDef(id).card === cardId);
}
const takeFromHand = (s, u) => { const i = s.hand.findIndex((h) => h.uid === u); return i >= 0 ? s.hand.splice(i, 1)[0] : null; };

function payFee(s, card) {
  if (!card.fee) return '';
  if (card.payer === 'you') { s.money -= card.fee; s.stats.feesYou += card.fee; return `You paid ${money$(card.fee)}.`; }
  s.stats.feesBoss += card.fee;
  return `Your ${s.track === 'h2a' ? 'farm' : 'boss'} paid ${money$(card.fee)}.`;
}

function reject(s, c, card, why, nextId) {
  if (s.flags.shield) {
    s.flags.shield = false;
    return { kind: 'saved', title: 'Your lawyer stopped you!', text: `${why} Your lawyer caught it before it was sent. Nothing lost.` };
  }
  takeFromHand(s, c.uid);
  const paid = payFee(s, card);
  s.hand.push(inst('rejected', { ttl: 1 }));
  s.stats.rejections++; s.stats.waitCards++;
  s.tags.push('rejected');
  history(s, '❌', `${card.name} was rejected (too early)`);
  const next = nextId && stepDef(nextId).card ? ` Your next step is "${CARDS[stepDef(nextId).card].name}".` : '';
  return { kind: 'rejected', stamp: 'REJECTED', title: 'Rejected!', text: `${why}${paid ? ` ${paid} Fees are not refunded.` : ''}${next}` };
}

export function playCard(s, u) {
  const c = s.hand.find((h) => h.uid === u);
  if (!c) return { kind: 'info', text: 'Card not found.' };
  const card = CARDS[c.id];
  if (card.type === 'action') return useAction(s, c, card);
  if (card.type !== 'form') return { kind: 'info', text: 'Only forms and help cards can be played.' };
  if (['left', 'canada'].includes(s.status)) return { kind: 'info', text: 'Your U.S. journey has ended.' };

  const stepId = stepForCard(s, c.id);
  const order = s.order.includes(stepId) ? s.order : s.permOrder;
  if (order === s.permOrder && !s.flags.sponsored) {
    return reject(s, c, card, 'Seasonal farm work can\'t lead to a green card. You\'d need a year-round employer to sponsor you.', null);
  }
  const t = stepDef(stepId);
  const st = s.steps[stepId];
  const cur = currentIndex(s, order);
  const idx = order.indexOf(stepId);

  if (st.status === 'approved') {
    if (s.track === 'h2a' && order === s.order) return { kind: 'info', title: 'Already done', text: `${t.name} is already done this season. Keep this card for next season.` };
    takeFromHand(s, u);
    return { kind: 'info', title: 'Already done', text: 'You already finished this step, so the extra card was recycled.' };
  }
  if (st.status === 'pending' || st.status === 'missing') {
    takeFromHand(s, u);
    return { kind: 'info', title: 'Already sent', text: 'This is already sent and waiting, so the extra copy was recycled.' };
  }
  if (t.kind === 'lottery' && !['opt', 'student'].includes(s.status)) return { kind: 'info', text: 'You already have a work visa.' };
  if (idx > cur) return reject(s, c, card, `Too early! ${card.tip}`, order[cur]);

  takeFromHand(s, u);
  const paid = payFee(s, card);
  st.filedYear = yearOf(s);
  if (t.kind === 'lottery') {
    st.status = 'pending';
    history(s, '🎟️', 'Entered the work visa lottery');
    return { kind: 'filed', stamp: 'ENTERED', title: 'You\'re in the lottery!', text: `${paid} Results come next turn.` };
  }
  const missing = stepDocs(t).filter((d) => !hasDoc(s, d));
  if (missing.length) {
    st.status = 'missing';
    st.missing = missing;
    history(s, '📎', `${card.name} is waiting on missing papers`);
    return { kind: 'missing', stamp: 'MISSING PAPERS', title: 'Right step! But papers are missing', text: `${paid} It will wait until you get: ${missing.map((d) => CARDS[d].name).join(' and ')}.` };
  }
  let turns = t.turns || 0;
  if (s.flags.fast && t.by === 'boss' && turns) { turns = 0; s.flags.fast = false; }
  else if (s.flags.slowNext && t.by === 'boss' && turns) { turns++; s.flags.slowNext = false; }
  st.status = 'pending';
  st.timer = turns;
  history(s, '📄', `Sent: ${card.name}`);
  if (turns <= 0) {
    const notes = [];
    const stamp = approve(s, stepId, notes);
    return { kind: 'approved', stamp, title: 'Approved!', text: `${paid} ${notes.map((n) => n.text).join(' ')}` };
  }
  return { kind: 'filed', stamp: 'SENT', title: 'Sent!', text: `${paid} You'll hear back next turn.` };
}

function useAction(s, c, card) {
  const cost = card.cost?.[s.track] ?? 0;
  const pay = () => { if (cost) { s.money -= cost; s.stats.feesYou += cost; } takeFromHand(s, c.uid); };
  const reveal = (n) => {
    const out = [];
    for (const order of [s.order, ...(s.flags.sponsored ? [s.permOrder] : [])]) {
      for (const id of order) {
        const st = s.steps[id];
        const t = stepDef(id);
        if (st.status !== 'approved' && !st.shown && t.card && out.length < n) { st.shown = true; out.push(CARDS[t.card].name); }
      }
    }
    return out;
  };
  switch (card.effect) {
    case 'lawyer': { pay(); s.flags.shield = true; const r = reveal(2); return { kind: 'help', title: 'Lawyer hired', text: `${cost ? `You paid ${money$(cost)}. ` : ''}${r.length ? `Coming up: ${r.join(' → ')}. ` : ''}Your next mistake will be caught.` }; }
    case 'clinic': { pay(); const r = reveal(1); return { kind: 'help', title: 'Free legal clinic', text: r.length ? `A volunteer lawyer says your next step is "${r[0]}".` : 'The clinic says you\'re on the right track.' }; }
    case 'organize': pay(); s.flags.organize = true; return { kind: 'help', title: 'Organized!', text: 'Your next pack will have the form you need.' };
    case 'fast': {
      pay();
      const target = ['visa', 'line', 'perm'].find((id) => s.steps[id]?.status === 'pending');
      if (target) { const notes = []; const stamp = approve(s, target, notes); return { kind: 'approved', stamp, title: 'Fast Track!', text: `Your boss paid $2,965 to speed it up. ${notes.map((n) => n.text).join(' ')}` }; }
      s.flags.fast = true;
      return { kind: 'help', title: 'Fast Track ready', text: 'The next form your boss sends will be decided right away.' };
    }
    case 'rights': pay(); s.flags.knowRights = true; return { kind: 'help', title: 'You know your rights', text: 'You learned what farms must give you: fair pay, free housing, travel costs, and water and rest in the heat.' };
    default: return { kind: 'info', text: 'Nothing happens.' };
  }
}

export function discard(s, u) {
  const c = s.hand.find((h) => h.uid === u);
  if (!c || CARDS[c.id].type === 'wait') return false;
  takeFromHand(s, u);
  return true;
}

// ───────────────────────────── decisions ─────────────────────────────
export function pickDilemma(s) {
  if (s.dilemma) return DILEMMAS.find((d) => d.id === s.dilemma);
  const r = rng(s);
  const pool = DILEMMAS.filter((d) => !d.forced && (d.track === 'all' || d.track === s.track) && !s.used.includes(d.id) && d.when(s));
  if (!pool.length) return null;
  const d = r.weighted(pool, (x) => x.weight || 1);
  s.dilemma = d.id;
  saveRng(s, r);
  return d;
}

export function resolveDilemma(s, key) {
  const d = DILEMMAS.find((x) => x.id === s.dilemma);
  if (!d) return null;
  const opt = d.options.find((o) => o.key === key);
  const r = rng(s);
  const h = {
    money: (n) => { s.money += n; },
    addCard: (id) => { const card = CARDS[id]; s.hand.push(inst(id, card.type === 'wait' ? { ttl: card.ttl } : {})); if (card.type === 'wait') s.stats.waitCards++; },
    history: (icon, text) => history(s, icon, text),
    restartGreenCard: () => restartGreenCard(s),
    end: (outcome) => { s.over = true; s.outcome = outcome; s.status = outcome; },
    sponsor: () => { s.flags.sponsored = true; s.chart = 'mexico-eb3'; },
  };
  const text = opt.apply(s, h, r);
  s.used.push(d.id);
  s.dilemma = null;
  saveRng(s, r);
  return { title: opt.label, text };
}

// ───────────────────────────── end of turn ─────────────────────────────
export function endTurn(s) {
  const lines = [];
  const add = (icon, text, amt) => { lines.push({ icon, text, amt }); if (amt) s.money += amt; };
  if (s.track === 'h1b') {
    const base = { opt: 6000, student: -8000, h1b: 11000, gc: 12000 }[s.status] ?? 0;
    const bonus = ['h1b', 'gc'].includes(s.status) ? s.incomeBonus : 0;
    if (base) add(base > 0 ? '💼' : '🎓', base > 0 ? 'Pay left after rent, taxes & food' : 'Living costs while in school', base + bonus);
  } else {
    if (s.status === 'season') {
      const pay = Math.round(16000 * s.wageMult * s.season.mult) + s.season.bonus - (s.flags.seasonCut || 0);
      s.flags.seasonCut = 0;
      s.seasons++; s.workedLast = true;
      add('🧺', `Harvest pay (season #${s.seasons})`, pay);
      if (!s.steps.interview.auto) add('↩️', 'Farm paid back your visa & border fees', CARDS['visa-interview'].fee + CARDS.border.fee);
      if (s.remitTax && !s.flags.bank) add('🏦', '1% tax on cash sent home', -Math.round(pay * 0.01));
      add('🚌', 'Season over. The H-2A visa is temporary, so you ride home.', 0);
      s.status = 'home';
      s.tags.push('season');
      history(s, '🧺', `Worked harvest season #${s.seasons}`);
    } else {
      s.workedLast = false;
      s.flags.seasonCut = 0;
      s.tags.push('missed');
      add('🏠', 'Missed the U.S. season. Local work at home', 2500);
      history(s, '🏠', 'Missed the harvest season');
    }
    add('👨‍👩‍👧‍👦', 'Family costs for the year', -6000);
  }
  s.hand = s.hand.filter((h) => { if (h.ttl === undefined) return true; h.ttl -= 1; return h.ttl > 0; });
  s.phase = 'end';
  return lines;
}

export const handOver = (s) => Math.max(0, s.hand.length - HAND_LIMIT);
export const discardable = (s) => s.hand.filter((h) => CARDS[h.id].type !== 'wait');

export function nextTurn(s) {
  if (s.over || s.turn >= TURNS) { s.over = true; s.phase = 'over'; s.outcome = s.outcome || s.status; return false; }
  s.turn++;
  return true;
}

export function progress(s) {
  const order = s.order.filter((id) => stepDef(id).kind !== 'season');
  return { done: order.filter((id) => s.steps[id].status === 'approved').length, total: order.length };
}
