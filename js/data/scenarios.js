// Table codes. Partners type the SAME code so both games get the same world news
// at the same time — no internet connection between computers is needed.
// Each scenario is a predetermined 12-year script. Any other code makes a random
// (but repeatable) scenario.

import { Rng } from '../rng.js';

export const NEWS = {
  'new-year': {
    icon: '🗓️', headline: 'Your journey begins',
    body: { h1b: 'Every March, employers enter workers in the H-1B lottery. Your lottery entry is already in your hand — file it on your Paper Trail!', h2a: 'Your employer already filed the Labor Certification and H-2A Petition. Now you need a Visa Interview and to cross at a Port of Entry before the season starts.' },
  },
  quiet: {
    icon: '📰', headline: 'A quiet year in Washington',
    body: { all: 'No big changes to immigration law this year. But waiting is its own challenge: lines only move as fast as the law allows.' },
  },
  'record-lottery': {
    icon: '🎟️', headline: 'H-1B lottery gets hundreds of thousands of entries',
    body: { h1b: 'There are only 85,000 new H-1B visas a year (65,000 regular + 20,000 for U.S. master’s grads). In the 2025 lottery, about 344,000 entries competed and only about 35% were picked.', h2a: 'Skilled workers enter a lottery for H-1B visas. H-2A farm visas have no yearly limit — if a farm is approved, it can hire as many workers as it needs.' },
  },
  'weighted-lottery': {
    icon: '⚖️', headline: 'H-1B lottery now favors higher salaries',
    body: { h1b: 'Under a rule that started in 2026, workers get 1 to 4 lottery entries based on their pay level. Entry-level workers get just 1 entry, so new graduates have lower odds.', h2a: 'A new rule changes the H-1B lottery for skilled workers. It does not affect H-2A farm visas.' },
  },
  'fee-100k': {
    icon: '💸', headline: 'Court fight over a $100,000 H-1B fee',
    body: { h1b: 'In 2025, a presidential proclamation required a $100,000 payment for many new H-1B workers coming from abroad. Students already in the U.S., like you, were exempt. In 2026 a federal court blocked the fee, and a new proposal would charge it even to students. Your company is nervous about sponsoring anyone new.', h2a: 'A $100,000 fee fight is about H-1B skilled-worker visas. It does not apply to H-2A farm visas.' },
  },
  'fee-hike': {
    icon: '📈', headline: 'Immigration fees go up',
    body: { all: 'Filing fees increase by 15%. USCIS gets most of its money from fees, not taxes.' },
    effect: { feeMult: 1.15 },
  },
  layoffs: {
    icon: '📉', headline: 'Tech companies announce layoffs',
    body: { h1b: 'If an H-1B worker loses their job, they have only 60 days to find a new sponsor, change status, or leave the U.S. (In 2026 the government even proposed removing those 60 days.)', h2a: 'Tech layoffs don’t affect farm work — but the economy is shaky.' },
    effect: { layoff: true },
  },
  retrogression: {
    icon: '⏪', headline: 'Visa Bulletin moves BACKWARD',
    body: { all: 'Too many people applied for green cards this year, so the State Department moved some cutoff dates backward. This is called “retrogression.” People who thought they were close now have to wait longer.' },
    effect: { bulletin: { india: -1.5, row: -0.5, 'india-eb1': -1, 'mexico-eb3': -1 } },
  },
  'bulletin-jump': {
    icon: '⏩', headline: 'Green card line jumps forward',
    body: { all: 'Unused visas from last year were added to this year’s total, so some lines moved forward faster than normal.' },
    effect: { bulletin: { india: 0.5, row: 1, 'india-eb1': 1, 'mexico-eb3': 0.5 } },
  },
  slowdown: {
    icon: '🐢', headline: 'Processing slowdown at USCIS',
    body: { all: 'Staff shortages and extra security checks slow down case processing. Pending cases take one extra year.' },
    effect: { slowdown: 1 },
  },
  'strong-economy': {
    icon: '📊', headline: 'Strong economy, lots of jobs',
    body: { all: 'Businesses are hiring. Workers get raises, and farms need extra hands.' },
    effect: { money: { h1b: 1500, h2a: 400 } },
  },
  recession: {
    icon: '🌧️', headline: 'Economic downturn',
    body: { all: 'Prices rise and money is tight for many families.' },
    effect: { money: { h1b: -1500, h2a: -300 } },
  },
  'heat-wave': {
    icon: '🌡️', headline: 'Record heat wave hits farm country',
    body: { h2a: 'Extreme heat shortens work days in the fields. Farmworkers are among the workers most at risk from heat illness. Your season pay will be 15% lower.', h1b: 'A record heat wave hits farm regions. Farmworkers face the highest risk of heat illness of any job.' },
    effect: { season: 0.85 },
  },
  drought: {
    icon: '🏜️', headline: 'Drought: farms cut back',
    body: { h2a: 'A drought means smaller harvests. Your farm is not hiring guest workers this year. You need a new employer to file a Labor Certification and H-2A Petition for you.', h1b: 'A drought hits farms. Many H-2A guest workers lose their seasonal jobs this year.' },
    effect: { noRehire: true },
  },
  'record-harvest': {
    icon: '🍑', headline: 'Record harvest!',
    body: { h2a: 'Great weather means a huge harvest and lots of extra hours. If you work the season, you earn $2,000 extra.', h1b: 'Farms have a record harvest. U.S. farms depend on guest workers to pick crops.' },
    effect: { seasonBonus: 2000 },
  },
  'aewr-change': {
    icon: '🧮', headline: 'Farm wage rules change',
    body: { h2a: 'The Labor Department changes how the minimum H-2A wage (the “AEWR”) is calculated, and lets farms subtract money for the free housing they provide. Your pay drops 10% from now on. (A real 2025 rule did this; in 2026 a court called it unlawful and ordered a new method.)', h1b: 'New rules lower the minimum pay for many H-2A farmworkers. Courts are fighting over whether the change is legal.' },
    effect: { wageMult: 0.9 },
  },
  waiver: {
    icon: '✅', headline: 'Returning workers skip the interview',
    body: { h2a: 'Returning H-2A workers whose last visa expired within 12 months can renew without an interview. Your employer’s agent submits your application with the group — if you worked last season, your Visa step is done for you!', h1b: 'Returning H-2A farmworkers can renew their visas without an interview. Skilled workers renewing H-1B stamps often wait months for appointments.' },
    effect: { waiver: true },
  },
  'remit-tax': {
    icon: '🏦', headline: 'New 1% tax on money sent home',
    body: { h2a: 'Since January 2026, sending money abroad costs a 1% federal tax when you pay in cash. (Transfers from a bank account or debit card are exempt, but many farmworkers don’t have U.S. bank accounts.) Mexicans abroad sent home about $62 billion in 2025.', h1b: 'Since 2026, there’s a 1% tax on money sent abroad when paid in cash. Transfers from bank accounts are exempt.' },
    effect: { remitTax: 0.01 },
  },
  'consulate-busy': {
    icon: '📆', headline: 'Consulate appointments fill up',
    body: { all: 'U.S. consulates have long waits for visa interviews this year.' },
    effect: { addWait: { h2a: 'appt-wait' } },
  },
  'civics-test': {
    icon: '🗽', headline: 'New citizenship test',
    body: { all: 'The civics test for new citizens now asks up to 20 questions from a list of 128. Applicants must answer 12 correctly.' },
  },
  'opt-debate': {
    icon: '🎓', headline: 'Congress debates student work permits',
    body: { h1b: 'The government says it is re-thinking OPT, the program that lets international students work after graduation. A 2026 rule already limits how long students can stay. For now, OPT continues.', h2a: 'Officials debate student work permits. Farm visa rules stay the same.' },
  },
};

const S = (id, name, level, summary, news, extra = {}) => ({ id, name, level, summary, news, ...extra });

export const SCENARIOS = [
  S('MAPLE', 'Steady Times', 'Start here',
    'Few surprises. Both H-1B players win the lottery on the first try, so the only difference between Priya and Lukas is country of birth.',
    ['new-year', 'record-lottery', 'quiet', 'strong-economy', 'civics-test', 'quiet', 'bulletin-jump', 'heat-wave', 'quiet', 'record-harvest', 'quiet', 'quiet'],
    { lottery: { priya: [true], lukas: [true] }, layoff: {} }),
  S('CEDAR', 'Luck of the Draw', 'Lottery luck',
    'Lukas loses the H-1B lottery twice while Priya wins right away. Does an early lead help Priya in the end?',
    ['new-year', 'record-lottery', 'weighted-lottery', 'quiet', 'fee-hike', 'quiet', 'heat-wave', 'quiet', 'bulletin-jump', 'quiet', 'recession', 'quiet'],
    { lottery: { priya: [true], lukas: [false, false, true] }, layoff: {} }),
  S('RIVER', 'Boom and Bust', 'Economy',
    'A strong economy, then layoffs in Year 7. Who is safe depends on status: a green card protects you; a visa tied to one job does not.',
    ['new-year', 'strong-economy', 'record-lottery', 'drought', 'quiet', 'strong-economy', 'layoffs', 'recession', 'quiet', 'waiver', 'quiet', 'quiet'],
    { lottery: { priya: [true], lukas: [false, true] }, layoff: { 7: { priya: true, lukas: true } } }),
  S('SUMMIT', 'Policy Shake-Up', 'Policy change',
    'New fees, a new lottery system, new farm-wage rules and a backward-moving Visa Bulletin. Policy can change the game mid-play.',
    ['new-year', 'fee-100k', 'weighted-lottery', 'aewr-change', 'fee-hike', 'remit-tax', 'retrogression', 'slowdown', 'quiet', 'consulate-busy', 'opt-debate', 'quiet'],
    { lottery: { priya: [false, true], lukas: [true] }, layoff: {} }),
  S('HARBOR', 'Long Lines', 'Backlogs',
    'Processing slowdowns and retrogression. Everyone waits longer — but some wait much longer than others.',
    ['new-year', 'record-lottery', 'slowdown', 'quiet', 'retrogression', 'quiet', 'consulate-busy', 'quiet', 'bulletin-jump', 'quiet', 'civics-test', 'quiet'],
    { lottery: { priya: [true], lukas: [true] }, layoff: {} }),
  S('PRAIRIE', 'Harvest Seasons', 'Guest workers',
    'Built around the H-2A guest worker: weather, wage rules, interview waivers and a drought.',
    ['new-year', 'record-harvest', 'heat-wave', 'waiver', 'drought', 'aewr-change', 'record-harvest', 'remit-tax', 'heat-wave', 'quiet', 'strong-economy', 'quiet'],
    { lottery: { priya: [true], lukas: [true] }, layoff: {} }),
];

const RANDOM_POOL = ['quiet', 'quiet', 'record-lottery', 'weighted-lottery', 'fee-hike', 'retrogression', 'bulletin-jump', 'slowdown',
  'strong-economy', 'recession', 'heat-wave', 'drought', 'record-harvest', 'aewr-change', 'waiver', 'remit-tax', 'consulate-busy', 'civics-test', 'layoffs'];

export function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function getScenario(rawCode) {
  const code = normalizeCode(rawCode) || 'MAPLE';
  const base = code.replace(/[0-9]+$/, '');
  const known = SCENARIOS.find((s) => s.id === code || s.id === base);
  if (known) return { ...known, code };
  // Any other code → a random but repeatable scenario.
  const rng = new Rng('scenario:' + code);
  const news = ['new-year'];
  const used = new Set();
  let layoffYear = null;
  while (news.length < 12) {
    const n = rng.pick(RANDOM_POOL);
    if (n !== 'quiet' && used.has(n)) continue;
    if (n === 'layoffs') {
      if (news.length < 4) continue;
      layoffYear = news.length + 1;
    }
    used.add(n);
    news.push(n);
  }
  const lot = () => { const a = []; for (let i = 0; i < 4; i++) a.push(rng.chance(0.35)); return a; };
  const layoff = {};
  if (layoffYear) layoff[layoffYear] = { priya: rng.chance(0.5), lukas: rng.chance(0.5) };
  return {
    id: code, code, name: 'Custom Scenario', level: 'Random',
    summary: 'A random but repeatable scenario. Everyone who types this code gets the same news.',
    news, lottery: { priya: lot(), lukas: lot() }, layoff,
  };
}
