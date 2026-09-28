// Table codes. Partners type the SAME code, so both games get the same news at the
// same time. No internet connection between computers is needed.
// Each scenario is a script for 8 turns. Any other code makes a random (but repeatable) one.

import { Rng } from '../rng.js';

export const NEWS = {
  start: { headline: 'A new job, a new country', text: { h1b: 'Every spring, employers enter workers in the H-1B work visa lottery.', h2a: 'Farms across the U.S. are hiring guest workers for the harvest.' } },
  quiet: { headline: 'A quiet year', text: { all: 'No big changes to immigration law this year.' } },
  'lottery-crowd': { headline: 'Work visa lottery is packed', text: { h1b: 'Hundreds of thousands of people entered for 85,000 spots.', h2a: 'Farm visas have no yearly limit. The lottery is only for skilled workers.' } },
  'lottery-weighted': { headline: 'Lottery now favors higher pay', text: { h1b: 'Since 2026, higher-paid workers get more lottery entries. New graduates get fewer.', h2a: 'A new rule changes the skilled worker lottery. Farm visas don\'t change.' } },
  'fee-fight': { headline: 'Court blocks $100,000 visa fee', text: { h1b: 'A $100,000 fee on new H-1B workers from abroad was blocked by a court in 2026. Students already in the U.S. were not affected.', h2a: 'A court fight over a skilled worker fee doesn\'t touch farm visas.' } },
  'fees-up': { headline: 'Immigration fees go up', text: { all: 'Filing costs rise again. You pay $500 more this year.' }, effect: { money: { h1b: -500, h2a: -150 } } },
  layoffs: { headline: 'Tech layoffs hit Ohio', text: { h1b: 'If a worker on an H-1B loses their job, they have only 60 days to find a new one or leave.', h2a: 'Tech layoffs don\'t affect farms.' }, effect: { layoff: true } },
  'line-backward': { headline: 'Green card line moves BACKWARD', text: { all: 'Too many people applied, so the Now Serving numbers went back in time. People who were close now wait longer.' }, effect: { bulletin: { india: -1.5, row: -1, 'india-eb1': -1, 'mexico-eb3': -1 } } },
  'line-jump': { headline: 'Green card line jumps ahead', text: { all: 'Leftover green cards from last year were added, so some lines moved faster.' }, effect: { bulletin: { india: 0.5, row: 1, 'india-eb1': 1, 'mexico-eb3': 0.5 } } },
  slowdown: { headline: 'Paperwork pile-up', text: { all: 'USCIS is short on staff. Everything waiting takes one more turn.' }, effect: { slowdown: true } },
  boom: { headline: 'Strong economy', text: { all: 'Businesses are hiring and paying more.' }, effect: { money: { h1b: 1500, h2a: 500 } } },
  heat: { headline: 'Record heat wave', text: { h2a: 'Extreme heat cuts work days in the fields. Your season pay drops 15%.', h1b: 'A heat wave hits farm country. Farmworkers face the highest heat risk of any job.' }, effect: { season: 0.85 } },
  drought: { headline: 'Drought hits farms', text: { h2a: 'Your farm isn\'t hiring this year. You need a new farm to file for you.', h1b: 'A drought hits farms. Many guest workers lose their season.' }, effect: { noRehire: true } },
  'big-harvest': { headline: 'Record harvest!', text: { h2a: 'Lots of extra hours. If you work this season, you earn $2,000 more.', h1b: 'U.S. farms have a huge harvest, picked mostly by guest workers.' }, effect: { seasonBonus: 2000 } },
  'wage-rule': { headline: 'Farm pay rules change', text: { h2a: 'A new rule lowers the minimum pay for guest workers. Your season pay drops 10%. (A real 2025 rule did this. A court later called it unlawful.)', h1b: 'A new rule lowers minimum pay for many farmworkers.' }, effect: { wageMult: 0.9 } },
  'remit-tax': { headline: 'New tax on money sent home', text: { h2a: 'Since 2026, sending cash abroad costs a 1% tax. Bank transfers don\'t.', h1b: 'A new 1% tax hits cash sent to family abroad.' }, effect: { remitTax: true } },
  'busy-consulate': { headline: 'Consulates are booked up', text: { all: 'Visa interview appointments are hard to get this year.' }, effect: { addWait: { h2a: 'no-appt' } } },
  'civics-test': { headline: 'A harder citizenship test', text: { all: 'New citizens now answer up to 20 questions about U.S. history and government. They need 12 right.' } },
};

const S = (id, name, level, summary, news, lottery = {}, layoff = {}) => ({ id, name, level, summary, news, lottery, layoff });

export const SCENARIOS = [
  S('MAPLE', 'Steady Times', 'Start here',
    'Few surprises. Priya and Lukas both win the lottery on the first try, so the only difference between them is where they were born.',
    ['start', 'lottery-crowd', 'quiet', 'boom', 'civics-test', 'line-jump', 'quiet', 'big-harvest'],
    { priya: [true], lukas: [true] }),
  S('CEDAR', 'Luck of the Draw', 'Lottery luck',
    'Lukas loses the lottery twice while Priya wins right away. Does her head start last?',
    ['start', 'lottery-crowd', 'lottery-weighted', 'fees-up', 'quiet', 'heat', 'line-jump', 'quiet'],
    { priya: [true], lukas: [false, false, true] }),
  S('RIVER', 'Boom and Bust', 'Economy',
    'Good times, then layoffs on turn 6. A green card protects you. A visa tied to one job does not.',
    ['start', 'boom', 'lottery-crowd', 'drought', 'quiet', 'layoffs', 'quiet', 'boom'],
    { priya: [true], lukas: [false, true] }, { 6: { priya: true, lukas: true } }),
  S('SUMMIT', 'Policy Shake-Up', 'Policy change',
    'New fees, a new lottery, new farm pay rules and a line that moves backward. The rules change while you play.',
    ['start', 'fee-fight', 'lottery-weighted', 'wage-rule', 'fees-up', 'remit-tax', 'line-backward', 'busy-consulate'],
    { priya: [false, true], lukas: [true] }),
  S('HARBOR', 'Long Lines', 'Backlogs',
    'Paperwork pile-ups and a line that goes backward. Everyone waits longer, but some wait much longer.',
    ['start', 'lottery-crowd', 'slowdown', 'quiet', 'line-backward', 'busy-consulate', 'line-jump', 'quiet'],
    { priya: [true], lukas: [true] }),
  S('PRAIRIE', 'Harvest Seasons', 'Guest workers',
    'Built around the farmworker: heat, drought, pay rules and a record harvest.',
    ['start', 'big-harvest', 'heat', 'drought', 'wage-rule', 'remit-tax', 'big-harvest', 'quiet'],
    { priya: [true], lukas: [true] }),
];

const POOL = ['quiet', 'quiet', 'lottery-crowd', 'lottery-weighted', 'fees-up', 'line-backward', 'line-jump', 'slowdown', 'boom', 'heat', 'drought', 'big-harvest', 'wage-rule', 'remit-tax', 'busy-consulate', 'civics-test', 'layoffs', 'fee-fight'];

export function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function getScenario(raw) {
  const code = normalizeCode(raw) || 'MAPLE';
  const base = code.replace(/[0-9]+$/, '');
  const known = SCENARIOS.find((s) => s.id === code || s.id === base);
  if (known) return { ...known, code };
  const rng = new Rng('scenario:' + code);
  const news = ['start'];
  const used = new Set();
  let layoffTurn = null;
  while (news.length < 8) {
    const n = rng.pick(POOL);
    if (n !== 'quiet' && used.has(n)) continue;
    if (n === 'layoffs') { if (news.length < 3) continue; layoffTurn = news.length + 1; }
    used.add(n);
    news.push(n);
  }
  const lot = () => [0, 1, 2, 3].map(() => rng.chance(0.35));
  const layoff = layoffTurn ? { [layoffTurn]: { priya: rng.chance(0.5), lukas: rng.chance(0.5) } } : {};
  return { id: code, code, name: 'Custom Table', level: 'Random', summary: 'A random scenario. Everyone who types this code gets the same news.', news, lottery: { priya: lot(), lukas: lot() }, layoff };
}
