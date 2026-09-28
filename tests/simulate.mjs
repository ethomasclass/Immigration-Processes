// Plays many automated games to sanity-check the rules and balance. Run: node tests/simulate.mjs
import * as E from '../js/engine.js';
import { CARDS } from '../js/data/cards.js';
import { SCENARIOS } from '../js/data/scenarios.js';

function play(s, careful) {
  for (let g = 0; g < 20; g++) {
    let acted = false;
    for (const h of [...s.hand]) {
      const c = CARDS[h.id];
      if (c.type === 'action') { const r = E.playCard(s, h.uid); acted = acted || r.kind !== 'info'; continue; }
      if (c.type !== 'form') continue;
      if (careful) {
        const stepId = E.stepForCard(s, h.id);
        const order = s.order.includes(stepId) ? s.order : s.permOrder;
        const cur = order.find((id) => s.steps[id].status !== 'approved');
        if (cur !== stepId) continue;
      }
      const r = E.playCard(s, h.uid);
      if (!['info'].includes(r.kind)) acted = true;
      if (s.over) return;
    }
    if (!acted) break;
  }
}

const results = {};
for (const charId of ['priya', 'lukas', 'marco']) {
  for (const sc of [...SCENARIOS.map((x) => x.id), 'ROOM12', 'ZEBRA']) {
    for (let run = 0; run < 40; run++) {
      const s = E.newGame({ code: sc, charId, name: 'T' + run });
      const careful = run % 2 === 0;
      while (true) {
        E.startTurn(s);
        if (s.dilemma) E.resolveDilemma(s, E.pickDilemma(s).options[0].key === 'school' ? 'school' : E.pickDilemma(s).options[0].key);
        if (s.over) break;
        for (const c of E.makePack(s)) E.collectCard(s, c);
        s.packOpened = true;
        E.settle(s);
        play(s, careful);
        if (s.over) break;
        const d = E.pickDilemma(s);
        if (d) E.resolveDilemma(s, d.options[run % d.options.length].key);
        if (s.over) break;
        E.endTurn(s);
        while (E.handOver(s) && E.discardable(s).length) E.discard(s, E.discardable(s)[0].uid);
        if (!E.nextTurn(s)) break;
      }
      const key = charId + (careful ? '-careful' : '-random');
      const r = (results[key] ||= { n: 0, lad: {}, money: 0, rej: 0, seasons: 0, status: {} });
      r.n++; r.money += s.money; r.rej += s.stats.rejections; r.seasons += s.seasons;
      const l = E.ladder(s); r.lad[l] = (r.lad[l] || 0) + 1;
      r.status[s.status] = (r.status[s.status] || 0) + 1;
    }
  }
}
for (const [k, r] of Object.entries(results)) {
  console.log(k.padEnd(15), 'avg$', String(Math.round(r.money / r.n)).padStart(7), 'rej', (r.rej / r.n).toFixed(2), 'seasons', (r.seasons / r.n).toFixed(1), 'ladder', JSON.stringify(r.lad), JSON.stringify(r.status));
}
