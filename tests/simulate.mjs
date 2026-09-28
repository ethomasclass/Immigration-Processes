// Plays many automated games to sanity-check the rules and balance. Run: npm run simulate
import * as E from '../js/engine.js';
import { CARDS } from '../js/data/cards.js';
import { SCENARIOS } from '../js/data/scenarios.js';

function bot(s, smart) {
  for (let guard = 0; guard < 30; guard++) {
    let acted = false;
    for (const h of [...s.hand]) {
      const c = CARDS[h.id];
      if (c.type === 'action') {
        if (['notario', 'canada'].includes(c.effect.kind)) continue;
        if (c.effect.kind === 'portfolio' && s.steps.i140?.status !== 'approved') continue;
        const r = E.playCard(s, h.uid); acted = acted || r.ok;
      } else if (c.type === 'form') {
        const stepId = E.findStepForCard(s, h.id);
        if (smart) {
          // only file when it's the current step
          const order = s.order.includes(stepId) ? s.order : s.permOrder;
          const cur = order.find((id) => s.steps[id].status !== 'approved');
          if (h.id !== 'h1b-ext' && cur !== stepId) continue;
        }
        const r = E.playCard(s, h.uid);
        if (r.ok && r.kind !== 'info') acted = true;
      }
      if (s.over) return;
    }
    if (!acted) break;
  }
}

const results = {};
for (const charId of ['priya', 'lukas', 'marco']) {
  for (const sc of [...SCENARIOS.map((x) => x.id), 'RANDOM1', 'ZEBRA']) {
    for (let run = 0; run < 40; run++) {
      const s = E.newGame({ code: sc, charId, name: 'Test' + run });
      while (true) {
        E.startYear(s);
        if (s.pendingChoice) E.resolveChoice(s, s.pendingChoice.id === 'opt-end' ? 'school' : 'stay');
        if (s.over) break;
        const pack = E.makePack(s);
        for (const c of pack) E.collectCard(s, c);
        s.packOpened = true;
        if (s.pendingChoice) E.resolveChoice(s, 'stay');
        E.settleInstant(s);
        bot(s, run % 2 === 0);
        if (s.over) break;
        E.endYear(s);
        while (E.handExcess(s) > 0 && E.discardable(s).length) E.discardCard(s, E.discardable(s)[0].uid);
        if (!s.over && s.year < E.MAX_YEARS) E.takeDraft(s, E.draftOptions(s)[0]);
        if (!E.nextYear(s)) break;
      }
      const key = charId + (run % 2 === 0 ? '-careful' : '-random');
      results[key] = results[key] || { n: 0, sec: {}, money: 0, rej: 0, status: {}, seasons: 0, years: 0 };
      const r = results[key];
      r.n++; r.money += s.money; r.rej += s.stats.rejections; r.seasons += s.seasons;
      const sec = E.security(s); r.sec[sec] = (r.sec[sec] || 0) + 1;
      r.status[s.status] = (r.status[s.status] || 0) + 1;
    }
  }
}
for (const [k, r] of Object.entries(results)) {
  console.log(k, 'games', r.n, 'avg$', Math.round(r.money / r.n), 'avgRej', (r.rej / r.n).toFixed(2), 'avgSeasons', (r.seasons / r.n).toFixed(1));
  console.log('   security', JSON.stringify(r.sec), 'status', JSON.stringify(r.status));
}
