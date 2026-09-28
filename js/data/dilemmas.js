// One decision per turn. Each option's apply(s, h) changes the game and returns what happened.
// h = helper functions from the engine (money, addCard, restartGreenCard, end, etc.).

export const DILEMMAS = [
  // ───────────── Skilled workers (Priya & Lukas) ─────────────
  {
    id: 'opt-end', track: 'h1b', forced: true, art: 'hourglass',
    title: 'Your student permit is ending',
    text: 'You weren\'t picked in the lottery in time. Without a visa, you must leave the U.S. Some people go back to school just to stay and keep trying.',
    when: () => false,
    options: [
      { key: 'school', label: 'Go back to school', hint: '−$30,000 tuition · keep trying the lottery',
        apply: (s, h) => { h.money(-30000); s.status = 'student'; h.history('🎓', 'Went back to school to stay in the U.S.'); return 'You signed up for another degree. It costs a lot, but you can keep entering the lottery.'; } },
      { key: 'home', label: 'Move back home', hint: 'Your U.S. journey ends',
        apply: (s, h) => { h.end('left'); h.history('✈️', 'Student permit ran out. Moved home.'); return 'You packed up and flew home. Many talented students leave this way every year.'; } },
    ],
  },
  {
    id: 'grandparent', track: 'h1b', art: 'plane', weight: 2,
    title: 'Grandma is in the hospital',
    text: 'Your family wants you home. But if you leave the U.S., you need a new visa stamp to come back, and that can take months.',
    when: (s) => s.turn >= 2,
    options: [
      { key: 'fly', label: 'Fly home now', hint: '−$1,800 · next pack has 1 fewer card',
        apply: (s, h) => { h.money(-1800); s.flags.smallPack = true; h.history('✈️', 'Flew home to see Grandma'); return 'You made it in time, and Grandma squeezed your hand. Getting back into the U.S. took weeks of waiting for a visa appointment.'; } },
      { key: 'stay', label: 'Stay and video call', hint: 'No cost',
        apply: (s, h) => { h.history('📱', 'Stayed in the U.S. while Grandma was sick'); return 'You stayed so your paperwork wouldn\'t be at risk. Many visa holders miss big family moments for years.'; } },
    ],
  },
  {
    id: 'better-job', track: 'h1b', art: 'briefcase', weight: 2,
    title: 'A better job offer',
    text: 'Another company offers you 30% more pay. But switching jobs on a work visa usually restarts your green card paperwork.',
    when: (s) => s.status === 'h1b' && s.steps.gc.status !== 'pending',
    options: [
      { key: 'switch', label: 'Take the new job', hint: '+$2,000 every turn · green card steps restart',
        apply: (s, h) => { s.incomeBonus += 2000; const kept = h.restartGreenCard(); h.history('💼', `Switched jobs. Green card steps restarted${kept ? ' (kept ticket number)' : ''}.`); return kept ? 'You got the raise. Your new boss must redo "Prove No American Applied" and "Get in Line," but you keep your ticket number.' : 'You got the raise. But your new boss must start your green card steps over from the beginning.'; } },
      { key: 'stay', label: 'Stay and keep your progress', hint: 'No change',
        apply: (s, h) => 'You turned it down. Many visa workers feel stuck in one job for years because of this.' },
    ],
  },
  {
    id: 'weekends', track: 'h1b', art: 'briefcase', weight: 1.5,
    title: 'Unpaid weekends',
    text: 'Your manager wants you to work weekends with no extra pay. Your visa depends on this job.',
    when: (s) => s.status === 'h1b',
    options: [
      { key: 'speak', label: 'Speak up', hint: '+$1,500 back pay · your next boss form takes 1 extra turn',
        apply: (s, h) => { h.money(1500); s.flags.slowNext = true; h.history('📣', 'Spoke up about unpaid work'); return 'The law says you must be paid, and you got back pay. But your manager is slow with your green card paperwork now.'; } },
      { key: 'quiet', label: 'Stay quiet', hint: 'No change',
        apply: (s, h) => 'You kept the peace. Many workers on visas stay quiet because their boss controls their visa.' },
    ],
  },
  {
    id: 'side-gig', track: 'h1b', art: 'cash', weight: 1,
    title: 'A side job',
    text: 'A friend offers you $1,500 to build an app on weekends.',
    when: (s) => s.status === 'h1b',
    options: [
      { key: 'yes', label: 'Take the money', hint: '+$1,500 · but is it allowed?',
        apply: (s, h) => { h.money(1500); h.addCard('rejected'); h.history('⚠️', 'Took a side job that broke visa rules'); return 'On an H-1B, you may only work for the company that sponsored you. A lawyer friend warns you to stop before it hurts your green card.'; } },
      { key: 'no', label: 'Say no', hint: 'No change',
        apply: () => 'Good call. H-1B workers may only work for their sponsor.' },
    ],
  },
  {
    id: 'lawyer-home', track: 'h1b', art: 'scales', weight: 1.2,
    title: 'Where should your savings go?',
    text: 'Your family needs help with a big bill. You were also thinking about hiring a lawyer.',
    when: (s) => s.turn >= 2 && !['gc'].includes(s.status),
    options: [
      { key: 'lawyer', label: 'Hire a lawyer', hint: '−$2,500 · get a Lawyer card',
        apply: (s, h) => { h.money(-2500); h.addCard('lawyer'); return 'A lawyer card is now in your hand. It shows your next steps and stops your next mistake.'; } },
      { key: 'home', label: 'Send money home', hint: '−$2,000',
        apply: (s, h) => { h.money(-2000); h.history('💸', 'Sent money home to family'); return 'Your family paid the bill. Many immigrants support family back home.'; } },
    ],
  },
  {
    id: 'invent', track: 'h1b', art: 'bulb', weight: 2,
    title: 'A late-night invention',
    text: 'You have an idea for a better robot arm. Building it means nights and weekends, plus lawyer fees for a patent.',
    when: (s) => s.status === 'h1b' && !s.talent.includes('patent'),
    options: [
      { key: 'build', label: 'Build it and patent it', hint: '−$1,200 · get a Patent (Top Talent)',
        apply: (s, h) => { h.money(-1200); h.addCard('patent'); h.history('💡', 'Patented an invention'); return 'You got the patent! It counts as Top Talent proof. Collect 3 to unlock a faster green card line.'; } },
      { key: 'rest', label: 'Rest instead', hint: 'No change',
        apply: () => 'You kept your weekends. Top Talent proof takes a lot of extra work.' },
    ],
  },
  {
    id: 'conference', track: 'h1b', art: 'plane', weight: 2,
    title: 'Speak at a conference?',
    text: 'You\'re invited to speak at a big tech conference in Canada. Leaving the U.S. on a visa means a new visa stamp to come back.',
    when: (s) => s.status === 'h1b' && !s.talent.includes('press'),
    options: [
      { key: 'go', label: 'Go and give the talk', hint: '−$800 · next pack has 1 fewer card · get In the News (Top Talent)',
        apply: (s, h) => { h.money(-800); s.flags.smallPack = true; h.addCard('press'); return 'Your talk went viral, and a magazine wrote about you. That\'s Top Talent proof, but getting back into the U.S. took weeks.'; } },
      { key: 'skip', label: 'Stay home', hint: 'No change',
        apply: () => 'You played it safe. Many visa holders skip trips abroad because of the risk.' },
    ],
  },
  {
    id: 'canada', track: 'h1b', art: 'maple', weight: 2,
    title: 'Canada is recruiting',
    text: 'Canada offers permanent residency to skilled workers in about a year. You would give up your place in the U.S. line.',
    when: (s) => s.turn >= 5 && s.steps.wait.status === 'waiting',
    options: [
      { key: 'go', label: 'Move to Canada', hint: 'Your U.S. journey ends',
        apply: (s, h) => { h.end('canada'); h.history('🍁', 'Moved to Canada'); return 'You moved to Toronto and got permanent residency there. Experts call this "brain drain."'; } },
      { key: 'stay', label: 'Keep waiting', hint: 'No change',
        apply: () => 'You decide to keep waiting in the U.S. line.' },
    ],
  },
  // ───────────── Everyone ─────────────
  {
    id: 'notario', track: 'all', art: 'flyer', weight: 1.5,
    title: '"Guaranteed green card!"',
    text: 'A flyer says: "Notario Público. Green card in 30 days, 100% guaranteed. Only $1,000!"',
    when: (s) => s.turn >= 2,
    options: [
      { key: 'pay', label: 'Pay the notario', hint: '−$1,000',
        apply: (s, h) => { h.money(-1000); h.addCard('rejected'); s.stats.scammed = true; h.history('🚩', 'Lost $1,000 to a notario scam'); return 'It was a scam. In the U.S., a notary is NOT a lawyer. No one can guarantee a green card.'; } },
      { key: 'clinic', label: 'Ask a free legal clinic', hint: 'Get a Free Legal Clinic card',
        apply: (s, h) => { h.addCard('clinic'); return 'The clinic says it\'s a scam. Real immigration forms are free to download, and no one can guarantee approval.'; } },
    ],
  },
  // ───────────── Guest worker (Marco) ─────────────
  {
    id: 'recruiter', track: 'h2a', art: 'flyer', weight: 2,
    title: 'A recruiter wants a fee',
    text: 'A man says he can get you on a farm next season, for $1,500 cash.',
    when: (s) => s.turn >= 2,
    options: [
      { key: 'pay', label: 'Pay him', hint: '−$1,500 · a farm files for you next season',
        apply: (s, h) => { h.money(-1500); s.flags.recruited = true; h.history('💵', 'Paid an illegal recruiting fee'); return 'He got you a spot. But charging workers a recruiting fee is illegal under H-2A rules, and many workers go into debt this way.'; } },
      { key: 'report', label: 'Report him', hint: 'Get a Know Your Rights card',
        apply: (s, h) => { h.addCard('rights'); return 'A worker center explained that farms and recruiters may not charge you fees.'; } },
    ],
  },
  {
    id: 'quince', track: 'h2a', art: 'cake', weight: 1.5,
    title: 'Sofi\'s quinceañera',
    text: 'Your daughter\'s 15th birthday party is in the middle of the harvest season.',
    when: (s) => s.turn >= 3 && !s.used.includes('quince'),
    options: [
      { key: 'home', label: 'Go home early', hint: '−$4,000 of season pay',
        apply: (s, h) => { s.flags.seasonCut = 4000; h.history('🎂', 'Went home for Sofi\'s quinceañera'); return 'You danced with Sofi. You lost weeks of pay, and the visa ended when you left.'; } },
      { key: 'stay', label: 'Stay and send a video', hint: 'No cost',
        apply: (s, h) => { h.history('📱', 'Missed Sofi\'s quinceañera to keep working'); return 'You watched it on your phone after a 12-hour shift. Guest workers miss many family moments.'; } },
    ],
  },
  {
    id: 'short-pay', track: 'h2a', art: 'cash', weight: 2.5,
    title: 'Your paycheck is short',
    text: 'Your last check was $1,500 less than it should be. Your visa is tied to this farm.',
    when: (s) => s.workedLast,
    options: [
      { key: 'report', label: 'Report it', hint: '+$1,500 back pay · the farm might not hire you again',
        apply: (s, h, r) => { h.money(1500); const safe = s.flags.knowRights || r.chance(0.5); if (!safe) s.flags.noRehireNext = true; h.history('📣', 'Reported missing wages'); return safe ? 'You got your back pay. Your Know Your Rights training helped you document everything.' : 'You got your back pay. But the farm said it won\'t need you next season. Punishing workers for this is illegal, but it happens.'; } },
      { key: 'quiet', label: 'Stay quiet', hint: 'Lose $1,500 · keep your job',
        apply: (s, h) => { h.money(-1500); return 'You let it go so the farm would hire you again. Many guest workers do the same.'; } },
    ],
  },
  {
    id: 'water', track: 'h2a', art: 'sun', weight: 1.5,
    title: 'No water breaks',
    text: 'It\'s 104°F. Your crew leader says no breaks until the row is done.',
    when: (s) => s.turn >= 2,
    options: [
      { key: 'speak', label: 'Speak up', hint: 'No cost',
        apply: () => 'Your crew got water and shade. Farmworkers face the highest heat risk of any job.' },
      { key: 'keep', label: 'Keep working', hint: '−$900 clinic bill',
        apply: (s, h) => { h.money(-900); h.history('🌡️', 'Got sick from the heat'); return 'You got heat exhaustion and needed a clinic. Heat illness can be deadly.'; } },
    ],
  },
  {
    id: 'dairy', track: 'h2a', art: 'cow', weight: 1, legendary: true,
    title: 'A year-round job offer!',
    text: 'A dairy farm in Wisconsin offers year-round work and to sponsor your green card. The line is long, and you\'d live far from home.',
    when: (s) => s.seasons >= 3 && !s.flags.sponsored,
    options: [
      { key: 'accept', label: 'Accept the offer', hint: 'Unlocks a green card path',
        apply: (s, h) => { h.sponsor(); h.history('🐄', 'A dairy farm offered to sponsor a green card'); return 'A new row opened on your road. Seasonal farm jobs can\'t lead to a green card, but year-round jobs can.'; } },
      { key: 'decline', label: 'Stay seasonal', hint: 'No change',
        apply: () => 'You keep coming home between seasons. Your family is glad.' },
    ],
  },
  {
    id: 'send-money', track: 'h2a', art: 'envelope', weight: 1,
    title: 'Sending money home',
    text: 'How will you send your pay to Rosa?',
    when: (s) => s.turn >= 2 && !s.flags.bank,
    options: [
      { key: 'cash', label: 'Cash transfer shop', hint: '−$200 in fees and taxes',
        apply: (s, h) => { h.money(-200); return 'Transfer shops are easy, but there\'s a fee, and since 2026 a 1% tax on cash transfers.'; } },
      { key: 'bank', label: 'Open a bank account', hint: '−$50 once · cheaper later',
        apply: (s, h) => { h.money(-50); s.flags.bank = true; return 'Bank transfers don\'t have the new 1% tax. Opening an account took a long day in town.'; } },
    ],
  },
  {
    id: 'english', track: 'h2a', art: 'book', weight: 1,
    title: 'Night English class',
    text: 'A church near the farm offers free English classes after long workdays.',
    when: (s) => !s.flags.knowRights,
    options: [
      { key: 'go', label: 'Go to class', hint: 'Get a Know Your Rights card',
        apply: (s, h) => { h.addCard('rights'); return 'You learned English, and the teacher also explained workers\' rights.'; } },
      { key: 'rest', label: 'Rest instead', hint: 'No change',
        apply: () => 'You needed the sleep. Farm days start before sunrise.' },
    ],
  },
  {
    id: 'cousin', track: 'h2a', art: 'phone', weight: 1,
    title: 'Your cousin wants to come too',
    text: 'Your cousin Luis wants to work next season. He needs help with forms and the bus fare.',
    when: (s) => s.turn >= 3,
    options: [
      { key: 'help', label: 'Help him', hint: '−$300',
        apply: (s, h) => { h.money(-300); return 'Luis got on the same crew. It\'s nice to have family nearby.'; } },
      { key: 'no', label: 'Not this year', hint: 'No cost',
        apply: () => 'Money is too tight this year. Luis understands.' },
    ],
  },
];
