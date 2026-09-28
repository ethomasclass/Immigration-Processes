// Game rules. Pure state + functions; the UI (main.js) calls these and animates the results.
import { CARDS, FILLER } from './data/cards.js';
import { CHARACTERS } from './data/characters.js';
import { getScenario, NEWS } from './data/scenarios.js';
import { Rng } from './rng.js';

export const MAX_YEARS = 12;
export const START_CAL = 2027;
export const HAND_LIMIT = 7;
export const PACK_SIZE = 5;

// Visa Bulletin model: the "final action date" cutoff for each line at the start of the game,
// and roughly how many years it moves forward each real year.
export const CHARTS = {
  // Based on the Sept 2026 Visa Bulletin: EB-2 rest of world was "Current"; EB-2 India's last cutoff
  // was July 15, 2014; EB-3 Other Workers Mexico was Apr 1, 2022.
  row: { label: 'EB-2 · All other countries (incl. Germany)', start: START_CAL - 0.1, speed: 1.0 },
  india: { label: 'EB-2 · India', start: 2014.6, speed: 0.4 },
  'india-eb1': { label: 'EB-1 · India', start: 2023.0, speed: 0.8 },
  'mexico-eb3': { label: 'EB-3 Other Workers · Mexico', start: 2022.4, speed: 0.6 },
};

export const TRACKS = {
  h1b: [
    { id: 'lottery', card: 'h1b-reg', label: 'H-1B Lottery', agency: 'USCIS', kind: 'lottery', by: 'employer' },
    { id: 'h1b', card: 'i129-h1b', label: 'H-1B Petition', agency: 'USCIS', process: 1, by: 'employer' },
    { id: 'perm', card: 'perm', label: 'PERM Labor Cert.', agency: 'DOL', process: 2, by: 'employer' },
    { id: 'i140', card: 'i140', label: 'Immigrant Petition', agency: 'USCIS', process: 1, by: 'employer' },
    { id: 'bulletin', kind: 'bulletin', label: 'Visa Bulletin', agency: 'DOS', by: 'wait' },
    { id: 'i485', card: 'i485', label: 'Green Card', agency: 'USCIS', process: 1, by: 'you' },
    { id: 'n400', card: 'n400', label: 'Citizenship', agency: 'USCIS', process: 1, by: 'you' },
  ],
  h2a: [
    { id: 'labor', card: 'eta9142a', label: 'Labor Cert.', agency: 'DOL', process: 0, by: 'employer' },
    { id: 'petition', card: 'i129-h2a', label: 'H-2A Petition', agency: 'USCIS', process: 0, by: 'employer' },
    { id: 'visa', card: 'ds160', label: 'Visa Application', agency: 'DOS', process: 0, by: 'you' },
    { id: 'entry', card: 'poe', label: 'Port of Entry', agency: 'CBP', process: 0, by: 'you' },
    { id: 'season', kind: 'season', label: 'Work the Season', agency: 'LIFE', by: 'you' },
  ],
  // Marco's permanent path, unlocked only by the rare "Year-Round Job Offer" card.
  h2aPerm: [
    { id: 'pperm', card: 'perm', label: 'PERM Labor Cert.', agency: 'DOL', process: 2, by: 'employer' },
    { id: 'pi140', card: 'i140', label: 'Immigrant Petition', agency: 'USCIS', process: 1, by: 'employer', docs: [] },
    { id: 'pbulletin', kind: 'bulletin', label: 'Visa Bulletin', agency: 'DOS', by: 'wait' },
    { id: 'pds260', card: 'ds260', label: 'Immigrant Visa', agency: 'DOS', process: 1, by: 'you' },
  ],
};

const BY_LABEL = { employer: 'Filed by your employer', you: 'Filed by you', wait: 'A waiting line' };

let uidCounter = 1;
const mkUid = () => 'c' + (uidCounter++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
const inst = (id, extra = {}) => ({ uid: mkUid(), id, ...extra });
const cal = (s) => START_CAL + s.year - 1;
export const fmtMoney = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
export const fmtDate = (d) => {
  const y = Math.floor(d);
  const m = Math.min(11, Math.floor((d - y) * 12));
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] + ' ' + y;
};

function rngOf(s) {
  const r = new Rng(0);
  r.s = s.rngS >>> 0;
  return r;
}
function saveRng(s, r) {
  s.rngS = r.s;
}

// ───────────────────────────── setup ─────────────────────────────
export function newGame({ code, charId, name }) {
  const ch = CHARACTERS[charId];
  const scenario = getScenario(code);
  const seed = new Rng(`${scenario.code}|${charId}|${name}|${Date.now()}|${Math.random()}`).s;
  const s = {
    v: 1, code: scenario.code, scenario, charId, name: name || ch.name, track: ch.track,
    year: 1, phase: 'news', over: false, outcome: null,
    money: ch.startMoney, feeMult: 1, wageMult: 1, remitTax: 0, incomeBonus: 0,
    hand: ch.startHand.map((id) => inst(id)),
    folder: ch.startFolder.map((id) => inst(id)),
    steps: {}, order: TRACKS[ch.track].map((t) => t.id), permOrder: ch.track === 'h2a' ? TRACKS.h2aPerm.map((t) => t.id) : [],
    status: ch.track === 'h1b' ? 'opt' : 'home',
    h1b: null, lotteryTries: 0, pd: null, keptPd: null, chart: ch.chart, gcYear: null,
    bulletin: Object.fromEntries(Object.entries(CHARTS).map(([k, c]) => [k, c.start])),
    flags: { shield: 0, organize: false, premium: false, knowRights: false, portfolio: false, sponsored: false },
    pity: {}, seasons: 0, workedLast: false, rehire: true, seasonMult: 1, seasonBonus: 0, waiver: false, noRehire: false,
    rngS: seed, pack: null, packOpened: false, draftOpts: null, pendingChoice: null,
    journal: [], history: [],
    stats: { feesYou: 0, feesEmployer: 0, rejections: 0, rfes: 0, waitCards: 0, cardsOpened: 0, yearsInLine: 0, earned: 0, scammed: false, seasonsMissed: 0 },
  };
  for (const t of allSteps(s)) s.steps[t.id] = { status: 'todo', timer: 0, revealed: false, missing: [] };
  // First step is shown so students know how to begin.
  if (s.track === 'h1b') s.steps.lottery.revealed = true;
  else {
    s.steps.labor.status = 'approved'; s.steps.labor.revealed = true; s.steps.labor.auto = true;
    s.steps.petition.status = 'approved'; s.steps.petition.revealed = true; s.steps.petition.auto = true;
  }
  return s;
}

export function allSteps(s) {
  return s.track === 'h1b' ? TRACKS.h1b : [...TRACKS.h2a, ...TRACKS.h2aPerm];
}
export function stepDef(id) {
  return [...TRACKS.h1b, ...TRACKS.h2a, ...TRACKS.h2aPerm].find((t) => t.id === id);
}
export function stepDocs(t) {
  if (t.docs) return t.docs;
  return (t.card && CARDS[t.card].docs) || [];
}
export function stepHint(t) {
  return `${BY_LABEL[t.by] || ''}`;
}
function currentIndex(s, order) {
  const i = order.findIndex((id) => s.steps[id].status !== 'approved');
  return i === -1 ? order.length : i;
}
function orderOf(s, stepId) {
  return s.order.includes(stepId) ? s.order : s.permOrder;
}
export function hasDoc(s, id) {
  return s.folder.some((f) => f.id === id && (!f.expires || f.expires >= s.year));
}

function addHistory(s, icon, text) {
  s.history.push({ year: s.year, cal: cal(s), icon, text });
}
function log(lines, icon, text, tone = 'info') {
  lines.push({ icon, text, tone });
}

// ───────────────────────────── status helpers ─────────────────────────────
export function security(s) {
  if (s.status === 'canada') return 4;
  if (s.status === 'citizen') return 5;
  if (s.status === 'gc') return 4;
  if (s.track === 'h1b') {
    if (s.status === 'left') return 0;
    if (s.status === 'h1b') return s.steps.i140.status === 'approved' ? 3 : 2;
    return 1;
  }
  if (s.steps.pi140.status === 'approved') return 3;
  return s.workedLast || s.status === 'season' ? 1 : 0;
}
export const SECURITY_LABELS = ['No U.S. status', 'Temporary', 'Work visa', 'Waiting in line', 'Permanent resident', 'U.S. citizen'];

export function statusLabel(s) {
  switch (s.status) {
    case 'opt': return 'F-1 student · OPT work permit';
    case 'student': return 'F-1 student · back in school';
    case 'h1b': return `H-1B work visa · valid through ${START_CAL + s.h1b.expire - 1}`;
    case 'gc': return 'Green card holder (permanent resident)';
    case 'citizen': return 'U.S. citizen';
    case 'left': return 'Left the United States';
    case 'canada': return 'Permanent resident of Canada';
    case 'season': return 'H-2A guest worker · in the U.S. for the season';
    case 'home': return s.seasons ? 'At home in Mexico between seasons' : 'At home in Mexico';
    default: return s.status;
  }
}

export function bulletinInfo(s) {
  const chart = s.chart;
  return { chart, label: CHARTS[chart].label, cutoff: s.bulletin[chart], pd: s.pd, current: s.pd != null && s.pd <= s.bulletin[chart] };
}

export function estimateWait(s) {
  const b = bulletinInfo(s);
  if (b.pd == null) return null;
  const gap = b.pd - b.cutoff;
  if (gap <= 0) return 0;
  return Math.ceil(gap / CHARTS[b.chart].speed);
}

// ───────────────────────────── year start ─────────────────────────────
export function startYear(s) {
  const lines = [];
  const r = rngOf(s);
  const newsId = s.scenario.news[s.year - 1] || 'quiet';
  const news = NEWS[newsId];
  s.packOpened = false;
  s.pack = null;
  s.draftOpts = null;
  s.seasonMult = 1;
  s.seasonBonus = 0;
  s.waiver = false;
  s.noRehire = false;

  // Visa Bulletin moves forward each year.
  if (s.year > 1) for (const k of Object.keys(CHARTS)) s.bulletin[k] += CHARTS[k].speed;

  // News effects
  const eff = news.effect || {};
  if (eff.feeMult) s.feeMult *= eff.feeMult;
  if (eff.wageMult && s.track === 'h2a') s.wageMult *= eff.wageMult;
  if (eff.remitTax) s.remitTax = eff.remitTax;
  if (eff.season && s.track === 'h2a') s.seasonMult = eff.season;
  if (eff.seasonBonus && s.track === 'h2a') s.seasonBonus = eff.seasonBonus;
  if (eff.waiver) s.waiver = true;
  if (eff.noRehire) s.noRehire = true;
  if (eff.bulletin) for (const [k, v] of Object.entries(eff.bulletin)) s.bulletin[k] += v;
  if (eff.money && eff.money[s.track]) {
    s.money += eff.money[s.track];
    log(lines, eff.money[s.track] > 0 ? '💵' : '🧾', `${eff.money[s.track] > 0 ? 'You gain' : 'You lose'} ${fmtMoney(Math.abs(eff.money[s.track]))}.`, eff.money[s.track] > 0 ? 'good' : 'bad');
  }
  if (eff.addWait && eff.addWait[s.track]) {
    s.hand.push(inst(eff.addWait[s.track], { ttl: CARDS[eff.addWait[s.track]].ttl }));
    s.stats.waitCards++;
    log(lines, '⏳', `A “${CARDS[eff.addWait[s.track]].title}” card was added to your hand.`, 'bad');
  }
  if (eff.slowdown) {
    for (const t of allSteps(s)) {
      const st = s.steps[t.id];
      if (st.status === 'pending' && t.kind !== 'lottery') {
        st.timer += eff.slowdown;
        log(lines, '🐢', `${t.label} will take ${eff.slowdown} extra year.`, 'bad');
      }
    }
  }

  // Layoffs (scenario-scripted per character)
  const lay = s.scenario.layoff && s.scenario.layoff[s.year];
  if (s.track === 'h1b' && lay && lay[s.charId]) layoff(s, lines);

  if (s.track === 'h1b') startYearH1B(s, r, lines);
  else startYearH2A(s, r, lines);

  s.phase = 'news';
  saveRng(s, r);
  return { newsId, news, lines };
}

function approve(s, stepId, lines) {
  const t = stepDef(stepId);
  const st = s.steps[stepId];
  st.status = 'approved';
  st.revealed = true;
  st.approvedYear = s.year;
  let stamp = 'APPROVED';
  switch (stepId) {
    case 'h1b':
      s.status = 'h1b';
      s.h1b = { start: s.year, expire: s.year + 2 };
      log(lines, '🛂', 'H-1B approved! You can work in the U.S. for 3 years, only for this employer.', 'good');
      addHistory(s, '🛂', 'H-1B work visa approved');
      break;
    case 'perm':
    case 'pperm':
      log(lines, '🏛️', 'PERM labor certification approved by the Department of Labor.', 'good');
      addHistory(s, '🏛️', 'PERM labor certification approved');
      break;
    case 'i140':
    case 'pi140': {
      const permFiled = s.steps[stepId === 'i140' ? 'perm' : 'pperm'].filedCal;
      s.pd = Math.min(permFiled ?? cal(s), s.keptPd ?? Infinity);
      log(lines, '🎫', `I-140 approved! Your priority date (place in line) is ${fmtDate(s.pd)}.`, 'good');
      addHistory(s, '🎫', `I-140 approved · priority date ${fmtDate(s.pd)}`);
      break;
    }
    case 'bulletin':
    case 'pbulletin':
      log(lines, '📬', 'Your priority date is CURRENT! You can apply for your green card now.', 'good');
      addHistory(s, '📬', 'Priority date became current');
      stamp = 'CURRENT';
      break;
    case 'i485':
    case 'pds260':
      s.status = 'gc';
      s.gcYear = s.year;
      log(lines, '🟩', 'GREEN CARD APPROVED! You are now a lawful permanent resident.', 'great');
      addHistory(s, '🟩', 'Became a lawful permanent resident (green card)');
      stamp = 'GREEN CARD';
      break;
    case 'n400':
      s.status = 'citizen';
      log(lines, '🇺🇸', 'You passed your citizenship interview and took the oath. You are a U.S. citizen!', 'great');
      addHistory(s, '🇺🇸', 'Became a U.S. citizen');
      stamp = 'CITIZEN';
      break;
    case 'visa':
      log(lines, '🛂', 'Visa approved! An H-2A visa is placed in your passport.', 'good');
      break;
    case 'entry':
      s.status = 'season';
      log(lines, '🚌', 'CBP admits you at the border. Time to work the season!', 'good');
      break;
    default:
      log(lines, '✅', `${t.label} approved.`, 'good');
  }
  return stamp;
}

function startYearH1B(s, r, lines) {
  // Lottery results
  const lot = s.steps.lottery;
  if (lot.status === 'pending') {
    s.lotteryTries++;
    const script = s.scenario.lottery?.[s.charId];
    const selected = script && script[s.lotteryTries - 1] !== undefined ? script[s.lotteryTries - 1] : r.chance(0.3);
    if (selected) {
      approve(s, 'lottery', lines);
      lot.selected = true;
      log(lines, '🎉', `SELECTED in the H-1B lottery (try #${s.lotteryTries})! Your employer can now file your H-1B Petition.`, 'great');
      addHistory(s, '🎟️', `Picked in the H-1B lottery on try #${s.lotteryTries}`);
      s.lastStamp = 'SELECTED';
    } else {
      lot.status = 'todo';
      s.hand.push(inst('h1b-reg'));
      log(lines, '😞', `Not selected in the H-1B lottery (try #${s.lotteryTries}). Your lottery card is back in your hand — enter again this year.`, 'bad');
      addHistory(s, '🎟️', `Not picked in the H-1B lottery (try #${s.lotteryTries})`);
      s.lastStamp = 'NOT SELECTED';
    }
  }
  processPending(s, lines);

  // Visa Bulletin gate
  const b = s.steps.bulletin;
  if (s.steps.i140.status === 'approved' && b.status !== 'approved' && s.status !== 'left') {
    b.revealed = true;
    if (bulletinInfo(s).current) {
      s.lastStamp = approve(s, 'bulletin', lines);
    } else {
      b.status = 'waiting';
      s.stats.yearsInLine++;
      const n = s.stats.yearsInLine > 2 ? 2 : 1;
      for (let i = 0; i < n; i++) s.hand.push(inst('not-current', { ttl: CARDS['not-current'].ttl }));
      s.stats.waitCards += n;
      const est = estimateWait(s);
      log(lines, '⏳', `Visa Bulletin: the ${CHARTS[s.chart].label} line is at ${fmtDate(bulletinInfo(s).cutoff)}. Your date is ${fmtDate(s.pd)}. At this speed: about ${est} more year${est === 1 ? '' : 's'}. (+${n} Wait card${n > 1 ? 's' : ''})`, 'bad');
    }
  }

  // Student work permit (OPT) runs out after 3 years
  if (s.status === 'opt' && s.year === 4 && s.steps.lottery.status !== 'approved') {
    s.pendingChoice = { id: 'opt-end' };
  }
  // Warnings
  if (s.status === 'h1b' && s.year >= s.h1b.expire - 1) {
    log(lines, '⚠️', `Your H-1B ends after ${START_CAL + s.h1b.expire - 1}. File an H-1B Extension ${s.year === s.h1b.expire ? 'THIS YEAR' : 'soon'}!`, 'warn');
  }
  if (s.status === 'gc' && s.year === s.gcYear + 4) {
    log(lines, '🗽', 'You’ve almost had your green card for 5 years. You can now apply for citizenship (N-400)!', 'good');
  }
}

function startYearH2A(s, r, lines) {
  processPending(s, lines);
  // A new season starts: reset the seasonal steps.
  if (s.year > 1) {
    for (const id of s.order) Object.assign(s.steps[id], { status: 'todo', timer: 0, missing: [], auto: false });
    s.status = 'home';
    const rehired = !s.noRehire && (s.workedLast || r.chance(0.5));
    if (rehired && !s.workedLast) {
      for (const id of ['labor', 'petition']) Object.assign(s.steps[id], { status: 'approved', revealed: true, auto: true });
      log(lines, '📨', 'A recruiter for a farm in North Carolina found you! The new employer filed the Labor Certification and H-2A Petition.', 'good');
    } else if (rehired) {
      for (const id of ['labor', 'petition']) Object.assign(s.steps[id], { status: 'approved', revealed: true, auto: true });
      log(lines, '📨', 'Your employer asked for you again! It filed the Labor Certification and H-2A Petition for you.', 'good');
    } else if (s.noRehire) {
      log(lines, '🏜️', 'No farm has filed for you yet. You need a Labor Certification and an H-2A Petition before you can get a visa.', 'bad');
    } else {
      log(lines, '📭', 'You missed last season, so your old employer hired someone else. A new farm needs to file a Labor Certification and H-2A Petition for you.', 'bad');
    }
    if (s.waiver && s.workedLast && !s.noRehire) {
      Object.assign(s.steps.visa, { status: 'approved', revealed: true, auto: true });
      log(lines, '✅', 'Interview waiver: your visa was renewed without an interview.', 'good');
    }
  }
  // Permanent path gate
  if (s.flags.sponsored && s.steps.pi140.status === 'approved' && s.steps.pbulletin.status !== 'approved') {
    s.steps.pbulletin.revealed = true;
    if (bulletinInfo(s).current) s.lastStamp = approve(s, 'pbulletin', lines);
    else {
      s.steps.pbulletin.status = 'waiting';
      s.stats.yearsInLine++;
      s.hand.push(inst('not-current', { ttl: 2 }));
      s.stats.waitCards++;
      const est = estimateWait(s);
      log(lines, '⏳', `Visa Bulletin: the ${CHARTS[s.chart].label} line is at ${fmtDate(bulletinInfo(s).cutoff)}. Your date is ${fmtDate(s.pd)}. About ${est} more years. (+1 Wait card)`, 'bad');
    }
  }
}

function processPending(s, lines) {
  for (const t of allSteps(s)) {
    const st = s.steps[t.id];
    if (st.status === 'pending' && t.kind !== 'lottery') {
      st.timer -= 1;
      if (st.timer <= 0) s.lastStamp = approve(s, t.id, lines);
      else log(lines, '⏳', `${t.label}: still processing (${st.timer} more year${st.timer > 1 ? 's' : ''}).`, 'info');
    }
  }
}

function layoff(s, lines) {
  if (s.status === 'gc' || s.status === 'citizen') {
    s.money -= 2000;
    log(lines, '📉', 'You were laid off — but with a green card you can take any job. You find a new one in 2 months. (−$2,000)', 'warn');
    addHistory(s, '📉', 'Laid off, found a new job quickly (green card = freedom to switch)');
    return;
  }
  if (s.status === 'h1b') {
    s.money -= 3000;
    const kept = s.steps.i140.status === 'approved';
    if (kept) s.keptPd = s.pd;
    for (const id of ['perm', 'i140', 'bulletin']) Object.assign(s.steps[id], { status: 'todo', timer: 0, missing: [] });
    if (!kept) s.pd = null;
    log(lines, '📉', `You were laid off! You had 60 days to find a new sponsor — and you did. But your new employer must start PERM and the I-140 over. ${kept ? 'Good news: because your I-140 was approved, you KEEP your priority date.' : 'Your place in line is lost.'} (−$3,000)`, 'bad');
    addHistory(s, '📉', `Laid off; new employer restarted PERM & I-140${kept ? ' (kept priority date)' : ''}`);
    return;
  }
  s.money -= 1500;
  log(lines, '📉', 'Your company cut jobs. You found a new job, but lost a month of pay. (−$1,500)', 'warn');
}

// ───────────────────────────── packs ─────────────────────────────
function frontier(s, order) {
  // The first step that still needs a card to be filed.
  for (const id of order) {
    const st = s.steps[id];
    const t = stepDef(id);
    if (st.status === 'approved' || st.status === 'pending' || st.status === 'rfe') continue;
    if (!t.card) return null; // waiting at a gate
    return t;
  }
  return null;
}
const inHand = (s, id) => s.hand.some((h) => h.id === id);

function needs(s) {
  const need = [];
  const decoys = [];
  const docs = [];
  const orders = [s.order];
  if (s.track === 'h2a' && s.flags.sponsored) orders.push(s.permOrder);
  for (const order of orders) {
    if (s.track === 'h2a' && order === s.order) {
      for (const id of order) {
        const t = stepDef(id);
        const st = s.steps[id];
        if (t.card && st.status === 'todo' && !inHand(s, t.card)) need.push(t.card);
      }
    } else {
      const f = frontier(s, order);
      const idx = f ? order.indexOf(f.id) : -1;
      if (f && !inHand(s, f.card)) {
        if (!(f.id === 'n400' && s.year < s.gcYear + 3)) need.push(f.card);
      }
      for (const id of order.slice(Math.max(0, idx + 1))) {
        const t = stepDef(id);
        if (t.card && s.steps[id].status === 'todo' && !inHand(s, t.card)) decoys.push(t.card);
      }
    }
    // Documents for the next two steps that need papers
    let seen = 0;
    for (const id of order) {
      const t = stepDef(id);
      if (s.steps[id].status === 'approved' || !t.card) continue;
      for (const d of stepDocs(t)) if (!hasDoc(s, d) && !docs.includes(d)) docs.push(d);
      if (++seen >= 2) break;
    }
  }
  // Maintenance: H-1B extension when it's about to run out
  if (s.status === 'h1b' && s.year >= s.h1b.expire - 1 && !inHand(s, 'h1b-ext')) need.unshift('h1b-ext');
  return { need, decoys: decoys.filter((d) => !need.includes(d)), docs };
}

export function makePack(s) {
  if (s.pack) return s.pack;
  const r = rngOf(s);
  const { need, decoys, docs } = needs(s);
  const pack = [];
  const multi = s.track === 'h2a';
  const H2A_P = { ds160: 0.8, poe: 0.8, eta9142a: 0.5, 'i129-h2a': 0.5 };
  need.forEach((id, i) => {
    if (pack.length >= 3) return;
    const pity = s.pity[id] || 0;
    const justPicked = id === 'i129-h1b' && s.steps.lottery.approvedYear === s.year; // 90-day filing window
    const forced = s.flags.organize || s.year === 1 || justPicked || id === 'h1b-ext' || pity >= (multi ? 1 : 2);
    const p = multi ? H2A_P[id] ?? 0.45 : i === 0 ? 0.45 : 0.3;
    if (forced || r.chance(p)) {
      pack.push(inst(id, { glow: true }));
      s.pity[id] = 0;
    } else s.pity[id] = pity + 1;
  });
  s.flags.organize = false;
  if (docs.length && pack.length < 4) {
    const d = docs[0];
    const pity = s.pity['doc:' + d] || 0;
    if (pity >= 2 || r.chance(0.5)) {
      pack.push(inst(d));
      s.pity['doc:' + d] = 0;
    } else s.pity['doc:' + d] = pity + 1;
  }
  if (decoys.length && pack.length < 4 && r.chance(0.3)) pack.push(inst(r.pick(decoys), { glow: true }));

  const pool = FILLER[s.track];
  const weights = { money: 30, expense: 24, action: 16, event: 8, wait: 10 };
  if (s.track === 'h1b' && s.status !== 'h1b') weights.event = 0; // job offers only matter on a work visa
  const types = Object.keys(weights).filter((k) => weights[k] > 0 && pool[k]?.length);
  while (pack.length < PACK_SIZE) {
    const type = r.weighted(types, (k) => weights[k]);
    let id = r.pick(pool[type]);
    if (id === 'premium' && !['h1b', 'i140'].some((x) => s.steps[x] && s.steps[x].status !== 'approved')) id = 'organize';
    pack.push(inst(id));
  }
  s.pack = r.shuffle(pack);
  s.stats.cardsOpened += s.pack.length;
  saveRng(s, r);
  return s.pack;
}

// Apply one revealed card. Returns a short result for the pack screen.
export function collectCard(s, c) {
  const card = CARDS[c.id];
  if (card.type === 'money' || card.type === 'expense' || (card.type === 'event' && card.effect?.kind === 'money')) {
    const amt = card.effect.money;
    s.money += amt;
    if (amt > 0) s.stats.earned += amt;
    return { text: `${amt > 0 ? '+' : '−'}${fmtMoney(Math.abs(amt)).replace('−', '')}`, tone: amt > 0 ? 'good' : 'bad', money: amt };
  }
  if (card.type === 'event' && card.effect?.kind === 'choice') {
    s.pendingChoice = { id: card.effect.id };
    return { text: 'Decision!', tone: 'warn' };
  }
  if (card.type === 'doc') {
    const existing = s.folder.find((f) => f.id === c.id);
    if (existing) {
      if (card.expires) {
        existing.expires = s.year + card.expires;
        return { text: 'Renewed', tone: 'good' };
      }
      return { text: 'Already have it', tone: 'info' };
    }
    if (card.fee && card.fee.payer === 'you') {
      const fee = Math.round(card.fee.amt * s.feeMult);
      s.money -= fee;
      s.stats.feesYou += fee;
    }
    s.folder.push({ ...c, expires: card.expires ? s.year + card.expires : undefined });
    const fixed = checkRfes(s);
    return { text: fixed ? 'To folder · RFE fixed!' : 'To folder', tone: 'good', fixed };
  }
  if (card.type === 'wait') {
    s.hand.push({ ...c, ttl: card.ttl });
    s.stats.waitCards++;
    return { text: 'Stuck in hand', tone: 'bad' };
  }
  s.hand.push(c);
  return { text: 'To hand', tone: 'info' };
}

function checkRfes(s) {
  let fixed = false;
  for (const t of allSteps(s)) {
    const st = s.steps[t.id];
    if (st.status !== 'rfe') continue;
    st.missing = st.missing.filter((d) => !hasDoc(s, d));
    if (!st.missing.length) {
      fixed = true;
      st.status = 'pending';
      st.timer = t.process || 0;
      if (st.timer <= 0) st.fixedNow = true;
    }
  }
  return fixed;
}
// Called by the UI after RFEs are fixed so zero-time steps get approved right away.
export function settleInstant(s) {
  const lines = [];
  let stamp = null;
  for (const t of allSteps(s)) {
    const st = s.steps[t.id];
    if (st.status === 'pending' && st.timer <= 0 && t.kind !== 'lottery') stamp = approve(s, t.id, lines);
    delete st.fixedNow;
  }
  return { lines, stamp };
}

// ───────────────────────────── playing cards ─────────────────────────────
export function findStepForCard(s, cardId) {
  const inMain = s.order.find((id) => stepDef(id).card === cardId);
  if (inMain) return inMain;
  return s.permOrder.find((id) => stepDef(id).card === cardId && s.flags.sponsored)
    || s.permOrder.find((id) => stepDef(id).card === cardId);
}

function removeFromHand(s, uid) {
  const i = s.hand.findIndex((h) => h.uid === uid);
  return i >= 0 ? s.hand.splice(i, 1)[0] : null;
}

function feeFor(s, card) {
  return card.fee ? Math.round(card.fee.amt * s.feeMult) : 0;
}

function reject(s, c, card, reason, nextStepId) {
  const lines = [];
  if (s.flags.shield > 0) {
    s.flags.shield--;
    if (nextStepId) s.steps[nextStepId].revealed = true;
    return { ok: false, kind: 'shield', stamp: null, title: 'Your lawyer stopped you!', text: `${reason} Your lawyer caught the mistake before it was filed, so you lost nothing.`, lines };
  }
  removeFromHand(s, c.uid);
  const fee = feeFor(s, card);
  if (card.fee?.payer === 'you') { s.money -= fee; s.stats.feesYou += fee; }
  else if (card.fee) s.stats.feesEmployer += fee;
  s.hand.push(inst('rejection-notice', { ttl: 1 }));
  s.stats.rejections++;
  s.stats.waitCards++;
  if (nextStepId) s.steps[nextStepId].revealed = true;
  addHistory(s, '❌', `${card.title} rejected (filed out of order)`);
  const lost = fee ? ` The ${fmtMoney(fee)} fee is not refunded${card.fee.payer === 'employer' ? ' (your employer lost it)' : ''}.` : '';
  const next = nextStepId ? ` Your next step is: ${stepDef(nextStepId).label}.` : '';
  return { ok: false, kind: 'rejected', stamp: 'REJECTED', title: 'Rejected', text: `${reason}${lost}${next}`, lines };
}

export function canFileHint(s, cardId) {
  const stepId = findStepForCard(s, cardId);
  return stepId ? stepDef(stepId) : null;
}

export function playCard(s, uid) {
  const c = s.hand.find((h) => h.uid === uid);
  if (!c) return { ok: false, text: 'Card not found.' };
  const card = CARDS[c.id];
  if (card.type === 'action') return useAction(s, c, card);
  if (card.type !== 'form') return { ok: false, text: 'This card can’t be played.' };
  if (c.id === 'h1b-ext') return fileExtension(s, c, card);

  const stepId = findStepForCard(s, c.id);
  if (!stepId) return reject(s, c, card, 'This form is not part of your path.', null);
  const order = orderOf(s, stepId);
  if (order === s.permOrder && !s.flags.sponsored) {
    return reject(s, c, card, 'You need an employer willing to sponsor you for a green card before this form can be filed. H-2A work alone does not lead to a green card.', null);
  }
  const t = stepDef(stepId);
  const st = s.steps[stepId];
  const cur = currentIndex(s, order);
  const idx = order.indexOf(stepId);
  const curId = order[Math.min(cur, order.length - 1)];

  if (s.status === 'left' || s.status === 'canada') return { ok: false, text: 'Your U.S. journey has ended.' };
  if (st.status === 'approved') {
    if (s.track === 'h2a' && order === s.order) return { ok: false, kind: 'info', title: 'Already done this season', text: `${t.label} is already done for this season. Keep this card for next year.` };
    removeFromHand(s, uid);
    return { ok: true, kind: 'info', title: 'Already approved', text: `You already finished ${t.label}. You don’t need this card anymore, so it was recycled.` };
  }
  if (st.status === 'pending' || st.status === 'rfe') {
    removeFromHand(s, uid);
    return { ok: true, kind: 'info', title: 'Already filed', text: `${t.label} is already filed and waiting. Filing twice would waste the fee, so you recycled this copy.` };
  }
  // Is it too early?
  let tooEarly = idx > cur;
  let reason = `Too early! ${card.why}`;
  if (!tooEarly && stepId === 'n400' && s.year < s.gcYear + 4) {
    tooEarly = true;
    reason = `Too early! You must have your green card for about 5 years first (you got it in ${START_CAL + s.gcYear - 1}).`;
  }
  if (!tooEarly && stepId === 'lottery' && !['opt', 'student'].includes(s.status)) {
    return { ok: false, kind: 'info', title: 'No need', text: 'You already have an H-1B.' };
  }
  if (tooEarly) {
    const nextId = order[cur] && stepDef(order[cur]).card ? order[cur] : null;
    return reject(s, c, card, reason, nextId);
  }

  // Right step — pay the fee and check documents.
  removeFromHand(s, uid);
  const fee = feeFor(s, card);
  if (card.fee?.payer === 'you') { s.money -= fee; s.stats.feesYou += fee; }
  else if (card.fee) s.stats.feesEmployer += fee;
  st.revealed = true;
  st.filedYear = s.year;
  st.filedCal = cal(s) + 0.25;
  const lines = [];
  const missing = stepDocs(t).filter((d) => !hasDoc(s, d));
  const payer = card.fee ? (card.fee.payer === 'you' ? `You paid ${fmtMoney(fee)}.` : `Your employer paid ${fmtMoney(fee)}.`) : '';
  if (t.kind === 'lottery') {
    st.status = 'pending';
    addHistory(s, '🎟️', 'Entered the H-1B lottery');
    return { ok: true, kind: 'filed', stamp: 'FILED', title: 'Entered in the lottery!', text: `${payer} Results come at the start of next year.`, lines };
  }
  if (missing.length) {
    st.status = 'rfe';
    st.missing = missing;
    st.deadline = t.process ? s.year + 1 : s.year;
    s.stats.rfes++;
    const names = missing.map((d) => CARDS[d].title).join(', ');
    addHistory(s, '📨', `Request for Evidence on ${t.label}`);
    return { ok: true, kind: 'rfe', stamp: 'RFE', title: 'Request for Evidence', text: `Right step! ${payer} But you’re missing: ${names}. Find ${missing.length > 1 ? 'them' : 'it'} by the end of ${t.process ? 'next year' : 'this year'} or the application will be denied.`, lines };
  }
  let timer = t.process || 0;
  if (s.flags.premium && ['i129-h1b', 'i140'].includes(c.id)) { timer = 0; s.flags.premium = false; }
  st.status = 'pending';
  st.timer = timer;
  addHistory(s, '📄', `Filed ${card.sub || card.title}`);
  if (timer <= 0) {
    const stamp = approve(s, stepId, lines);
    return { ok: true, kind: 'approved', stamp, title: 'Approved!', text: `${payer} ${lines.map((l) => l.text).join(' ')}`, lines };
  }
  return { ok: true, kind: 'filed', stamp: 'FILED', title: 'Filed!', text: `${payer} Decision expected in about ${timer} year${timer > 1 ? 's' : ''}.`, lines };
}

function fileExtension(s, c, card) {
  if (s.status !== 'h1b') return { ok: false, kind: 'info', title: 'Not needed', text: s.status === 'gc' || s.status === 'citizen' ? 'You have a green card — no more visa extensions needed!' : 'You don’t have an H-1B to extend yet. Keep this card.' };
  if (s.year < s.h1b.expire - 1) return { ok: false, kind: 'info', title: 'Too early', text: `Your H-1B is good through ${START_CAL + s.h1b.expire - 1}. Keep this card and file it in the year before it runs out.` };
  const usedYears = s.h1b.expire - s.h1b.start + 1;
  const i140ok = s.steps.i140.status === 'approved';
  const permFiledLongAgo = s.steps.perm.filedYear != null && s.steps.perm.status !== 'todo' && s.year - s.steps.perm.filedYear >= 1;
  if (usedYears >= 6 && !i140ok && !permFiledLongAgo) {
    return reject(s, c, card, 'Denied: you have used all 6 years of H-1B time. You can only extend past 6 years if your PERM was filed over a year ago or your I-140 is approved.', null);
  }
  removeFromHand(s, c.uid);
  const fee = feeFor(s, card);
  s.stats.feesEmployer += fee;
  const add = usedYears >= 6 && !i140ok ? 1 : 3;
  s.h1b.expire += add;
  addHistory(s, '🔁', `H-1B extended ${add} more year${add > 1 ? 's' : ''}`);
  const why = usedYears >= 6 ? (i140ok ? ' Going past 6 years is only possible because your I-140 is approved (a law called AC21).' : ' Because your PERM was filed over a year ago, the law (AC21) allows a 1-year extension past 6 years. Get your I-140 approved to extend 3 years at a time!') : '';
  return { ok: true, kind: 'approved', stamp: 'EXTENDED', title: 'H-1B extended!', text: `Your employer paid ${fmtMoney(fee)}. Your H-1B is now good through ${START_CAL + s.h1b.expire - 1}.${why}` };
}

function useAction(s, c, card) {
  const cost = (card.cost && card.cost[s.track]) || 0;
  const k = card.effect.kind;
  const nextHidden = (n) => {
    const out = [];
    for (const order of [s.order, ...(s.flags.sponsored ? [s.permOrder] : [])]) {
      for (const id of order) {
        const st = s.steps[id];
        if (st.status !== 'approved' && !st.revealed && out.length < n) { st.revealed = true; out.push(stepDef(id).label); }
      }
    }
    return out;
  };
  const pay = () => { if (cost) { s.money -= cost; s.stats.feesYou += cost; } removeFromHand(s, c.uid); };
  switch (k) {
    case 'lawyer': {
      pay();
      s.flags.shield++;
      const rev = nextHidden(2);
      return { ok: true, kind: 'action', title: 'Lawyer hired', text: `You paid ${fmtMoney(cost)}. ${rev.length ? `Your lawyer mapped out your next steps: ${rev.join(' → ')}.` : 'Your path is already clear.'} Your next filing mistake will be caught.` };
    }
    case 'legalaid': {
      pay();
      const rev = nextHidden(1);
      return { ok: true, kind: 'action', title: 'Free legal clinic', text: rev.length ? `A volunteer lawyer explains your next step: ${rev[0]}.` : 'The clinic confirms your plan is on track.' };
    }
    case 'organize':
      pay();
      s.flags.organize = true;
      return { ok: true, kind: 'action', title: 'Organized!', text: 'Next year’s pack will include the form you need.' };
    case 'premium': {
      pay();
      const target = ['h1b', 'i140'].find((id) => s.steps[id].status === 'pending');
      if (target) {
        const lines = [];
        const stamp = approve(s, target, lines);
        return { ok: true, kind: 'approved', stamp, title: 'Premium processing', text: `Your employer paid $2,965 to speed things up. ${lines.map((l) => l.text).join(' ')}` };
      }
      s.flags.premium = true;
      return { ok: true, kind: 'action', title: 'Premium processing ready', text: 'Your next H-1B Petition or I-140 will be decided right away. Your employer pays $2,965.' };
    }
    case 'notario':
      pay();
      s.stats.scammed = true;
      s.hand.push(inst('rejection-notice', { ttl: 1 }));
      s.stats.waitCards++;
      addHistory(s, '🚩', 'Lost money to a “notario” scam');
      return { ok: false, kind: 'rejected', stamp: 'SCAM', title: 'It was a scam!', text: `The “notario” took your ${fmtMoney(cost)} and filed the wrong papers. In the U.S., a notary public is NOT a lawyer and can’t give legal advice. Real help comes from licensed lawyers or DOJ-accredited representatives.` };
    case 'knowrights':
      pay();
      s.flags.knowRights = true;
      return { ok: true, kind: 'action', title: 'You know your rights', text: 'You learned what H-2A employers must provide: the required wage, free housing, travel costs, and pay for at least 3/4 of the promised hours. You’re ready if something goes wrong.' };
    case 'portfolio': {
      if (s.steps.i140.status !== 'approved') return { ok: false, kind: 'info', title: 'Not yet', text: 'You need an approved I-140 first. Keep this card.' };
      pay();
      s.flags.portfolio = true;
      if (s.chart === 'india') {
        s.chart = 'india-eb1';
        addHistory(s, '🏆', 'Upgraded to the EB-1 line');
        return { ok: true, kind: 'approved', stamp: 'EB-1', title: 'Upgraded to EB-1!', text: `Your employer filed a new EB-1 petition. You keep your priority date (${fmtDate(s.pd)}) but move into the EB-1 India line, now at ${fmtDate(s.bulletin['india-eb1'])}.` };
      }
      return { ok: true, kind: 'action', title: 'EB-1 filed', text: 'Your line was already short, so the upgrade doesn’t change much for you.' };
    }
    case 'canada':
      pay();
      s.status = 'canada';
      addHistory(s, '🍁', 'Moved to Canada through Express Entry');
      s.over = true;
      s.outcome = 'canada';
      return { ok: true, kind: 'approved', stamp: 'CANADA', title: 'Welcome to Canada', text: 'You gave up your place in the U.S. line and moved to Canada as a permanent resident.' };
    case 'sponsor':
      pay();
      s.flags.sponsored = true;
      s.chart = 'mexico-eb3';
      s.steps.pperm.revealed = true;
      addHistory(s, '🐄', 'A year-round employer offered to sponsor a green card');
      return { ok: true, kind: 'approved', stamp: 'SPONSOR', title: 'A permanent path opens', text: 'A dairy farm will sponsor you for an EB-3 green card. A new row has appeared on your Paper Trail: PERM → I-140 → Visa Bulletin → Immigrant Visa. You keep working seasons while you wait.' };
    default:
      return { ok: false, text: 'Nothing happens.' };
  }
}

export function discardCard(s, uid) {
  const c = s.hand.find((h) => h.uid === uid);
  if (!c || CARDS[c.id].type === 'wait') return false;
  removeFromHand(s, uid);
  return true;
}

// ───────────────────────────── choices ─────────────────────────────
export function choiceInfo(s) {
  const ch = s.pendingChoice;
  if (!ch) return null;
  if (ch.id === 'job-offer') {
    if (s.status === 'gc' || s.status === 'citizen') {
      return { id: ch.id, title: 'Better Job Offer', icon: '💼', text: 'A company offers you 30% more pay. With a green card, you can switch jobs freely!', options: [{ key: 'switch', label: 'Take the job (+$3,000/yr)' }, { key: 'stay', label: 'Stay where you are' }] };
    }
    const kept = s.steps.i140.status === 'approved';
    return {
      id: ch.id, title: 'Better Job Offer', icon: '💼',
      text: `A company offers you 30% more pay. On an H-1B, switching jobs means your new employer must restart PERM and the I-140. ${kept ? 'Because your I-140 is approved, you would KEEP your priority date.' : 'You have no approved I-140 yet, so you would lose your progress toward a green card.'}`,
      options: [{ key: 'switch', label: 'Switch jobs (+$3,000/yr, restart PERM)' }, { key: 'stay', label: 'Stay and keep your progress' }],
    };
  }
  if (ch.id === 'opt-end') {
    return {
      id: ch.id, title: 'Your work permit is ending', icon: '🎓',
      text: 'You weren’t picked in the H-1B lottery before your 3 years of OPT ran out. Without a new status, you must leave the U.S. Many people in this spot go back to school for another degree just to keep trying.',
      options: [{ key: 'school', label: 'Go back to school (−$30,000 tuition, keep entering the lottery)' }, { key: 'home', label: 'Move back home (your U.S. journey ends)' }],
    };
  }
  return null;
}

export function resolveChoice(s, key) {
  const ch = s.pendingChoice;
  s.pendingChoice = null;
  if (!ch) return null;
  if (ch.id === 'job-offer') {
    if (key === 'stay') return { title: 'You stayed', text: 'You kept your job and your green card progress. Many H-1B workers turn down better jobs for this reason.' };
    s.incomeBonus += 3000;
    if (s.status === 'gc' || s.status === 'citizen') {
      addHistory(s, '💼', 'Switched to a better job');
      return { title: 'New job!', text: 'Green card holders can change jobs without any new immigration paperwork.' };
    }
    if (s.status !== 'h1b') {
      addHistory(s, '💼', 'Switched to a better job');
      return { title: 'New job!', text: 'Your new employer took over your OPT job. You got a raise.' };
    }
    const kept = s.steps.i140.status === 'approved';
    if (kept) s.keptPd = s.pd;
    else s.pd = null;
    for (const id of ['perm', 'i140', 'bulletin']) Object.assign(s.steps[id], { status: 'todo', timer: 0, missing: [] });
    addHistory(s, '💼', `Switched jobs; PERM & I-140 restarted${kept ? ' (kept priority date)' : ''}`);
    return { title: 'New job!', text: `Your new employer filed an H-1B transfer. You got a raise, but PERM and the I-140 must be done again.${kept ? ' You kept your priority date.' : ''}` };
  }
  if (ch.id === 'opt-end') {
    if (key === 'school') {
      s.money -= 30000;
      s.status = 'student';
      addHistory(s, '🎓', 'Went back to school to stay in the U.S.');
      return { title: 'Back to school', text: 'You enrolled in another degree program (−$30,000). You can keep entering the H-1B lottery, but you earn less while studying.' };
    }
    s.status = 'left';
    s.over = true;
    s.outcome = 'left';
    addHistory(s, '✈️', 'Work permit ran out; moved back home');
    return { title: 'Moving home', text: 'Your student work permit ran out. Your U.S. journey ends here.' };
  }
  return null;
}

// ───────────────────────────── end of year ─────────────────────────────
export function endYear(s) {
  const lines = [];
  const r = rngOf(s);
  if (s.track === 'h1b') {
    const base = { opt: 5000, student: -8000, h1b: 8000, gc: 9000, citizen: 9000, left: 2000 }[s.status] ?? 0;
    const inc = base + (['h1b', 'gc', 'citizen'].includes(s.status) ? s.incomeBonus : 0);
    s.money += inc;
    if (inc > 0) s.stats.earned += inc;
    log(lines, inc >= 0 ? '💼' : '🎓', `${inc >= 0 ? 'Salary left after taxes, rent & living costs' : 'Living costs while studying'}: ${inc >= 0 ? '+' : ''}${fmtMoney(inc)}`, inc >= 0 ? 'good' : 'bad');
  } else {
    if (s.status === 'season') {
      let pay = Math.round(16000 * s.wageMult * s.seasonMult) + s.seasonBonus;
      s.seasons++;
      s.workedLast = true;
      log(lines, '🧺', `Season wages (after food & phone costs): +${fmtMoney(pay)}`, 'good');
      const reimb = Math.round(CARDS.ds160.fee.amt * s.feeMult);
      if (!s.steps.visa.auto) { s.money += reimb; log(lines, '↩️', `Your employer paid you back for visa & border fees in your first week, as H-2A rules require: +${fmtMoney(reimb)}`, 'good'); }
      if (r.chance(0.25)) {
        if (s.flags.knowRights) log(lines, '⚖️', 'Your paycheck was short $1,500 — but you knew your rights, reported it, and got it back.', 'good');
        else { pay -= 1500; log(lines, '⚠️', 'Missing wages: your employer shorted your pay by $1,500. (A “Know Your Rights” card would have helped.)', 'bad'); addHistory(s, '⚠️', 'Lost $1,500 to unpaid wages'); }
      }
      if (s.remitTax) {
        const tax = Math.round(pay * s.remitTax);
        pay -= tax;
        log(lines, '🏦', `1% tax on money sent home: −${fmtMoney(tax)}`, 'bad');
      }
      s.money += pay;
      s.stats.earned += pay;
      addHistory(s, '🧺', `Worked season #${s.seasons} in the U.S.`);
      log(lines, '🚌', 'The season is over. H-2A is temporary, so you return home to Mexico.', 'info');
      s.status = 'home';
    } else {
      s.workedLast = false;
      s.stats.seasonsMissed++;
      s.money += 2500;
      log(lines, '🏠', 'You missed the U.S. season. Local work at home: +$2,500', 'bad');
      addHistory(s, '🏠', 'Missed the season');
    }
    s.money -= 6000;
    log(lines, '👨‍👩‍👧‍👦', 'Family living costs for the year: −$6,000', 'info');
  }
  if (s.money < 0) {
    const interest = Math.round(-s.money * 0.08);
    s.money -= interest;
    log(lines, '💳', `You’re in debt. Interest on borrowed money: −${fmtMoney(interest)}`, 'bad');
  }

  // Requests for Evidence that ran out of time
  for (const t of allSteps(s)) {
    const st = s.steps[t.id];
    if (st.status === 'rfe' && s.year >= st.deadline) {
      Object.assign(st, { status: 'todo', missing: [] });
      log(lines, '❌', `${t.label} was DENIED because the missing evidence never arrived. You must file again with a new form card.`, 'bad');
      addHistory(s, '❌', `${t.label} denied (missing evidence)`);
    }
  }
  // Wait cards count down; medical exams expire
  s.hand = s.hand.filter((h) => {
    if (h.ttl === undefined) return true;
    h.ttl -= 1;
    return h.ttl > 0;
  });
  s.folder = s.folder.filter((f) => {
    if (f.expires && f.expires <= s.year) {
      log(lines, '🩺', `Your ${CARDS[f.id].title} expired.`, 'bad');
      return false;
    }
    return true;
  });
  // Visa running out
  if (s.track === 'h1b' && s.status === 'h1b' && s.year >= s.h1b.expire) {
    s.status = 'left';
    s.over = true;
    s.outcome = 'expired';
    log(lines, '✈️', 'Your H-1B ran out without an extension. You had to leave the United States.', 'bad');
    addHistory(s, '✈️', 'H-1B expired; had to leave the U.S.');
  }
  saveRng(s, r);
  s.phase = 'end';
  return { lines, over: s.over || s.year >= MAX_YEARS, handOver: Math.max(0, s.hand.filter((h) => CARDS[h.id].type !== 'wait').length + s.hand.filter((h) => CARDS[h.id].type === 'wait').length - HAND_LIMIT) };
}

export function handExcess(s) {
  return Math.max(0, s.hand.length - HAND_LIMIT);
}
export function discardable(s) {
  return s.hand.filter((h) => CARDS[h.id].type !== 'wait');
}

// ───────────────────────────── draft ─────────────────────────────
export function draftOptions(s) {
  if (s.draftOpts) return s.draftOpts;
  const r = rngOf(s);
  const pool = [];
  const add = (id, w) => pool.push({ id, w });
  if (s.track === 'h1b') {
    const done = ['gc', 'citizen'].includes(s.status);
    add('organize', 3);
    if (!done) { add('lawyer', 2); add('legal-aid', 1.2); }
    if (['h1b', 'i140'].some((id) => s.steps[id].status === 'pending' || (s.steps[id].status === 'todo' && s.status !== 'gc'))) add('premium', 1.5);
    add('savings', 2);
    for (const d of ['lca', 'pwd', 'birth-cert', 'medical']) if (!hasDoc(s, d) && !done) add(d, d === 'medical' && s.steps.i140.status !== 'approved' ? 0.6 : 2);
    if (done && !hasDoc(s, 'civics')) add('civics', 3);
    if (s.steps.bulletin.status === 'waiting' && s.chart === 'india' && !s.flags.portfolio) add('portfolio', 2);
    if (s.year >= 5 && !done && s.steps.bulletin.status === 'waiting') add('canada', 1.3);
  } else {
    add('organize', 3);
    add('lawyer', 0.8);
    add('legal-aid', 1);
    if (!s.flags.knowRights) add('know-rights', 2);
    add('extra-shift', 2);
    if (s.seasons >= 3 && !s.flags.sponsored) add('sponsor', 0.15);
    if (s.flags.sponsored) for (const d of ['pwd', 'birth-cert', 'medical']) if (!hasDoc(s, d)) add(d, 2);
  }
  const opts = [];
  while (opts.length < 3 && pool.length) {
    const pick = r.weighted(pool, (p) => p.w);
    opts.push(pick.id);
    pool.splice(pool.indexOf(pick), 1);
  }
  s.draftOpts = opts;
  saveRng(s, r);
  return opts;
}

export function takeDraft(s, id) {
  const card = CARDS[id];
  s.phase = 'sync';
  const c = inst(id);
  return collectCard(s, c);
}

export function nextYear(s) {
  if (s.year >= MAX_YEARS || s.over) {
    s.over = true;
    s.phase = 'over';
    if (!s.outcome) s.outcome = s.status;
    return false;
  }
  s.year += 1;
  return true;
}

export function yearLabel(s) {
  return cal(s);
}

// ───────────────────────────── summaries ─────────────────────────────
export function progress(s) {
  const order = s.order.filter((id) => stepDef(id).kind !== 'season');
  const done = order.filter((id) => s.steps[id].status === 'approved').length;
  return { done, total: order.length };
}

export function scoreLine(s) {
  const ch = CHARACTERS[s.charId];
  return `${ch.name} · ${SECURITY_LABELS[security(s)]} · ${fmtMoney(s.money)}`;
}
