// Hand-drawn SVG art for cards, portraits and the card back.
// Style: riso print — flat ink colors, thick black outlines, halftone dots,
// and a slightly off-register pink layer underneath.

const K = '#1b1a1f';
const P = '#f6f0e2';
const Y = '#ffd84a';
const PINK = '#ff5fa2';
const BLUE = '#2f6fd6';
const SKY = '#a9d4ff';
const GREEN = '#1fa463';
const MINT = '#9be3b8';
const RED = '#ef4b3f';
const ORANGE = '#ff8a3d';
const PURPLE = '#7a5cc4';
const TAN = '#e2b476';
const GREY = '#a7a3ad';

const o = (d, fill = 'none', extra = '') => `<path class="o" d="${d}" fill="${fill}" ${extra}/>`;
const rect = (x, y, w, h, fill, rx = 0, extra = '') => `<rect class="o" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const circ = (cx, cy, r, fill, extra = '') => `<circle class="o" cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const txt = (x, y, t, size, fill = K, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" font-family="'Big Shoulders Display', Impact, sans-serif" font-weight="900" ${extra}>${t}</text>`;
const star = (cx, cy, r, fill) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return `<polygon class="o" points="${pts.join(' ')}" fill="${fill}"/>`;
};

// Each drawing lives on a 160 × 100 stage.
const ART = {
  ticket: `<g transform="rotate(-9 80 52)">${o('M26 30H134V44A8 8 0 0 0 134 60V74H26V60A8 8 0 0 0 26 44Z', Y)}${o('M52 32V72', 'none', 'stroke-dasharray="3 5"')}${star(95, 52, 15, PINK)}${txt(39, 57, 'H-1B', 11, K, 'transform="rotate(-90 39 52)"')}</g>`,
  visa: `${rect(38, 16, 84, 68, P, 4)}${o('M80 16V84')}${rect(86, 24, 28, 38, SKY, 2)}${circ(100, 38, 7, P)}${o('M91 54H109')}${o('M46 30H72M46 40H72M46 50H64')}${`<g transform="rotate(-14 62 68)">${rect(46, 60, 34, 16, 'none', 3, `stroke="${RED}" style="stroke:${RED}"`)}${txt(63, 72.5, 'OK', 12, RED)}</g>`}`,
  helpwanted: `${rect(34, 14, 92, 72, P, 3)}${rect(42, 22, 76, 18, K)}${txt(80, 36, 'HELP WANTED', 13, Y)}${o('M42 50H118M42 60H118M42 70H92')}${circ(112, 70, 13, SKY)}${o('M121 79L134 92')}`,
  deli: `${o('M50 14H110L118 44H42Z', RED)}${circ(80, 29, 8, P)}${txt(80, 33, '?', 11)}<g transform="rotate(5 80 66)">${rect(58, 44, 44, 44, P, 2)}${txt(80, 72, '42', 26)}${o('M62 82H98', 'none', 'stroke-dasharray="2 4"')}</g>`,
  greencard: `${rect(24, 20, 112, 66, MINT, 8)}${rect(34, 32, 30, 40, P, 3)}<circle cx="49" cy="46" r="7.5" fill="${K}"/>${o('M37 72C39 60 59 60 61 72Z', K)}${o('M72 36H124M72 46H124M72 56H104')}${star(118, 70, 9, Y)}${rect(24, 20, 112, 9, GREEN, 0)}`,
  barn: `${o('M18 86H142')}${o('M34 86V48L64 24L94 48V86Z', RED)}${rect(54, 60, 20, 26, P)}${o('M54 60L74 86M74 60L54 86')}${o('M50 44H78')}${circ(118, 40, 19, MINT)}${o('M109 40L115 46L128 33')}`,
  crate: `${circ(62, 44, 9, RED)}${circ(80, 40, 10, RED)}${circ(98, 45, 9, RED)}${o('M62 35V31M80 30V26M98 36V32', 'none')}${rect(40, 50, 80, 34, TAN, 2)}${o('M40 62H120M40 73H120')}<g transform="rotate(10 124 40)">${rect(112, 18, 30, 38, P, 2)}${o('M118 28H136M118 36H136M118 44H130')}</g>`,
  window: `${rect(26, 16, 108, 66, SKY, 4)}${o('M80 16V58')}${rect(20, 58, 120, 12, P)}${o('M40 34H70')}<path class="o" d="M88 24H122A6 6 0 0 1 128 30V42A6 6 0 0 1 122 48H104L96 56V48H88A6 6 0 0 1 82 42V30A6 6 0 0 1 88 24Z" fill="${P}"/>${txt(105, 42, '?', 16)}${circ(52, 46, 8, TAN)}${o('M40 58C42 50 62 50 64 58')}`,
  gate: `${o('M62 100L76 58H84L98 100Z', GREY)}${o('M80 64V72M80 80V92', 'none', `stroke="${P}" style="stroke:${P}"`)}${rect(104, 38, 32, 44, P)}${o('M100 38H140L134 26H106Z', BLUE)}${rect(110, 46, 20, 14, SKY)}${rect(98, 52, 8, 34, K)}<g transform="rotate(-6 60 56)">${rect(22, 52, 80, 9, P)}${rect(30, 52, 10, 9, RED)}${rect(52, 52, 10, 9, RED)}${rect(74, 52, 10, 9, RED)}</g>`,
  stamped: `${rect(38, 18, 60, 72, BLUE, 5)}${circ(68, 46, 14, 'none', `stroke="${Y}" style="stroke:${Y}"`)}${o('M54 46H82M68 32C62 40 62 52 68 60C74 52 74 40 68 32', 'none', `stroke="${Y}" style="stroke:${Y}"`)}<g transform="rotate(-12 110 50)">${circ(110, 50, 22, 'none', `stroke="${GREEN}" style="stroke:${GREEN};stroke-width:4"`)}${txt(110, 55, 'ADMITTED', 9, GREEN)}</g>`,
  passport: `${rect(50, 14, 60, 76, BLUE, 5)}${circ(80, 44, 15, 'none', `stroke="${Y}" style="stroke:${Y}"`)}${o('M65 44H95M80 29C73 38 73 50 80 59C87 50 87 38 80 29', 'none', `stroke="${Y}" style="stroke:${Y}"`)}${txt(80, 78, 'PASSPORT', 9, Y)}`,
  diploma: `${rect(34, 30, 92, 44, P, 4)}${circ(34, 52, 10, TAN)}${circ(126, 52, 10, TAN)}${o('M52 44H108M52 54H108M60 64H100')}${circ(104, 70, 9, RED)}${o('M100 78L96 92L104 86L112 92L108 78', RED)}`,
  medical: `${rect(44, 16, 72, 74, P, 5)}${rect(64, 10, 32, 12, GREY, 3)}${o('M80 34V64M65 49H95', 'none', `stroke="${RED}" style="stroke:${RED};stroke-width:9;stroke-linecap:butt"`)}${o('M56 76H104')}`,
  certificate: `${rect(38, 14, 84, 74, P, 3)}${o('M50 28H110M50 38H110M50 48H96')}${star(98, 70, 13, Y)}<ellipse class="o" cx="60" cy="68" rx="6" ry="9" fill="${PINK}"/>${circ(56, 56, 2.2, PINK)}${circ(61, 55, 2.2, PINK)}${circ(66, 56.5, 2.2, PINK)}`,
  cash: `<g transform="rotate(-8 80 50)">${rect(30, 36, 86, 42, MINT, 3)}${circ(73, 57, 11, GREEN)}${txt(73, 62, '$', 16, P)}</g><g transform="rotate(6 90 50)">${rect(44, 26, 86, 42, MINT, 3)}${circ(87, 47, 11, GREEN)}${txt(87, 52, '$', 16, P)}</g>${circ(126, 76, 12, Y)}${txt(126, 81, '¢', 13)}`,
  envelope: `${rect(32, 26, 96, 58, P, 4)}${o('M32 30L80 62L128 30')}${circ(112, 74, 12, RED)}${txt(112, 79, '$', 13, P)}`,
  keys: `${circ(58, 50, 18, Y)}${circ(58, 50, 6, P)}${o('M74 50H128V60M112 50V58M120 50V56', 'none')}${rect(92, 20, 30, 20, P, 3)}`,
  corn: `${o('M80 90C64 70 62 40 80 14C98 40 96 70 80 90Z', Y)}${o('M80 22V84M70 40H90M68 54H92M70 68H90')}${o('M80 90C60 80 50 60 54 40C64 56 72 70 80 90Z', GREEN)}${o('M80 90C100 80 110 60 106 40C96 56 88 70 80 90Z', GREEN)}`,
  house: `${o('M34 88V48L80 18L126 48V88Z', P)}${o('M26 52L80 16L134 52', 'none')}${rect(70, 60, 20, 28, TAN)}${rect(44, 56, 16, 14, SKY)}${rect(100, 56, 16, 14, SKY)}${o('M112 30V16H122V38', RED)}`,
  car: `${o('M26 70V56L42 40H104L122 56H136V70Z', RED)}${o('M50 44L44 56H100L92 44Z', SKY)}${circ(52, 72, 10, K)}${circ(112, 72, 10, K)}<g transform="rotate(35 120 26)">${rect(112, 10, 10, 32, GREY, 3)}${circ(117, 12, 7, GREY)}</g>`,
  backpack: `${rect(50, 30, 60, 60, ORANGE, 12)}${o('M64 30C64 16 96 16 96 30')}${rect(60, 56, 40, 22, Y, 4)}${o('M60 66H100')}`,
  scales: `${o('M80 18V86M56 86H104')}${o('M40 34H120')}${circ(80, 20, 5, Y)}${o('M40 34L28 62H52Z', 'none')}${o('M120 34L108 62H132Z', 'none')}${o('M24 62A16 8 0 0 0 56 62Z', Y)}${o('M104 62A16 8 0 0 0 136 62Z', Y)}`,
  door: `${rect(50, 14, 60, 76, P, 3)}${o('M58 20V90L96 82V26Z', BLUE)}${circ(90, 56, 3, Y)}${o('M120 36C120 28 132 28 132 36C132 44 120 50 120 50C120 50 108 44 108 36C108 28 120 28 120 36Z', PINK)}`,
  folder: `${o('M28 30H66L74 38H132V84H28Z', Y)}${rect(40, 22, 72, 30, P, 2, 'transform="rotate(-4 76 36)"')}${o('M28 46H132V84H28Z', ORANGE)}${rect(38, 56, 26, 8, P, 2)}`,
  stopwatch: `${circ(76, 56, 30, P)}${rect(68, 16, 16, 10, GREY, 2)}${o('M76 56V36M76 56L90 64')}${o('M112 18L98 50H112L100 86L130 44H114L126 18Z', Y)}`,
  shield: `${o('M80 12L118 26V52C118 72 102 86 80 92C58 86 42 72 42 52V26Z', PURPLE)}${o('M62 52L76 66L100 40', 'none', `stroke="${Y}" style="stroke:${Y};stroke-width:7"`)}`,
  dispenser: `${o('M52 10H108L114 50H46Z', RED)}${circ(80, 30, 10, P)}${txt(80, 34.5, 'WAIT', 7.5)}<g transform="rotate(-6 80 72)">${rect(60, 48, 40, 40, P, 2)}${txt(80, 76, '999', 20)}</g>`,
  reject: `${rect(40, 14, 80, 74, P, 3)}${o('M52 28H108M52 38H108M52 48H96M52 58H108')}<g transform="rotate(-14 80 60)">${rect(46, 50, 68, 22, 'none', 4, `stroke="${RED}" style="stroke:${RED};stroke-width:4"`)}${txt(80, 67, 'REJECTED', 15, RED)}</g>`,
  stack: `${rect(56, 70, 50, 14, P, 1, 'transform="rotate(3 80 76)"')}${rect(52, 56, 50, 14, P, 1, 'transform="rotate(-4 76 62)"')}${rect(58, 42, 50, 14, P, 1, 'transform="rotate(5 82 48)"')}${rect(50, 28, 50, 14, P, 1, 'transform="rotate(-3 74 34)"')}${rect(56, 14, 50, 14, P, 1, 'transform="rotate(6 80 20)"')}`,
  calendar: `${rect(38, 18, 84, 70, P, 5)}${rect(38, 18, 84, 16, RED, 5)}${o('M58 12V24M102 12V24')}${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => o(`M${50 + c * 18} ${44 + r * 14}l8 8M${58 + c * 18} ${44 + r * 14}l-8 8`)).join('')).join('')}`,
  // decisions
  plane: `${o('M24 60L136 36L144 44L60 76L50 70L70 60Z', P)}${o('M80 52L64 26H76L102 48Z', SKY)}${o('M48 68L34 82H44L60 72Z', SKY)}${circ(40, 30, 10, Y)}`,
  briefcase: `${rect(34, 34, 92, 54, TAN, 6)}${o('M64 34V24H96V34')}${o('M34 56H126')}${rect(72, 50, 16, 12, Y, 2)}`,
  trophy: `${o('M56 18H104V40C104 56 94 64 80 64C66 64 56 56 56 40Z', Y)}${o('M56 26H42C42 42 50 48 58 48M104 26H118C118 42 110 48 102 48')}${o('M72 64V76H88V64')}${rect(62, 76, 36, 12, TAN, 2)}${star(80, 38, 9, P)}`,
  maple: `${o('M80 10L88 30L104 24L98 44L118 42L106 58L114 66L90 66L84 74V92H76V74L70 66L46 66L54 58L42 42L62 44L56 24L72 30Z', RED)}`,
  flyer: `<g transform="rotate(-6 80 50)">${rect(40, 12, 80, 80, Y, 2)}${txt(80, 34, '100%', 20, RED)}${txt(80, 50, 'GUARANTEED!', 11)}${o('M52 60H108M52 68H108M52 76H90')}</g>${circ(122, 22, 6, RED)}`,
  cake: `${rect(44, 52, 72, 34, PINK, 4)}${rect(52, 34, 56, 20, P, 4)}${o('M44 66C56 72 64 60 80 66C96 72 104 60 116 66')}${o('M66 34V22M80 34V20M94 34V22')}${circ(66, 18, 3, Y)}${circ(80, 16, 3, Y)}${circ(94, 18, 3, Y)}`,
  sun: `${circ(80, 46, 20, Y)}${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path class="o" d="M80 18V8" transform="rotate(${a} 80 46)"/>`).join('')}${o('M20 92C40 80 60 80 80 92C100 80 120 80 140 92', GREEN)}`,
  cow: `${o('M40 44H112C120 44 124 52 124 60V72H40Z', P)}${circ(60, 56, 7, K)}${circ(96, 62, 6, K)}${o('M112 44C112 30 138 30 138 46C138 58 124 60 124 60', P)}${o('M46 72V88M60 72V88M104 72V88M118 72V88')}${circ(130, 44, 2.5, K)}`,
  book: `${o('M80 30C66 22 44 22 30 28V84C44 78 66 78 80 86Z', P)}${o('M80 30C94 22 116 22 130 28V84C116 78 94 78 80 86Z', SKY)}${txt(56, 60, 'A', 18)}${txt(104, 60, 'B', 18)}`,
  phone: `${rect(56, 12, 48, 80, K, 8)}${rect(61, 20, 38, 62, P, 3)}${o('M66 32H92A3 3 0 0 1 95 35V41A3 3 0 0 1 92 44H72L68 48V44H66A3 3 0 0 1 63 41V35A3 3 0 0 1 66 32Z', MINT)}${o('M94 52H70A3 3 0 0 0 67 55V61A3 3 0 0 0 70 64H90L94 68V64A3 3 0 0 0 97 61V55A3 3 0 0 0 94 52Z', PINK)}`,
  hourglass: `${o('M54 14H106M54 88H106')}${o('M60 14C60 36 78 42 78 51C78 60 60 66 60 88H100C100 66 82 60 82 51C82 42 100 36 100 14Z', P)}${o('M66 80C70 72 90 72 94 80Z', Y)}${o('M68 26H92C90 34 84 40 80 42C76 40 70 34 68 26Z', Y)}`,
  road: `${o('M20 90C60 70 40 40 80 30C120 20 110 10 140 8', 'none', 'stroke-width="10"')}${o('M20 90C60 70 40 40 80 30C120 20 110 10 140 8', 'none', `stroke="${Y}" style="stroke:${Y};stroke-width:2;stroke-dasharray:6 6"`)}`,
};

const BG = { form: '#7fb2ff', doc: MINT, money: '#fff08a', bill: '#ffa29a', action: '#c3b1ff', wait: '#ffc08f' };

export function art(key, type = 'form', bg) {
  const a = ART[key] || ART.visa;
  return `<svg class="art" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="160" height="100" fill="${bg || BG[type] || SKY}"/>
    <circle cx="124" cy="22" r="48" fill="#fff" opacity=".22"/>
    <rect width="160" height="100" fill="url(#ht)"/>
    <g class="mis" transform="translate(3.5 3)">${a}</g>
    <g class="ink">${a}</g>
  </svg>`;
}

// Portraits (100 × 100). Simple, friendly, not caricatures.
const PORTRAITS = {
  priya: { bg: PINK, skin: '#a86b4c', hair: `${o('M26 58C22 26 42 14 52 14C68 14 80 26 78 52L74 44C66 40 46 34 34 40Z', K)}${o('M26 58C24 76 30 90 34 96H44C38 84 34 70 36 56Z', K)}`, shirt: Y, extra: `${circ(34, 62, 2.5, Y)}${circ(70, 62, 2.5, Y)}` },
  lukas: { bg: BLUE, skin: '#f1c7a4', hair: o('M30 42C28 22 44 12 56 14C72 14 80 24 76 42C70 32 60 28 52 30C44 32 36 34 30 42Z', '#c89b4b'), shirt: MINT, extra: `${circ(43, 54, 8, 'none')}${circ(63, 54, 8, 'none')}${o('M51 54H55')}` },
  marco: { bg: GREEN, skin: '#b67a52', hair: `${o('M28 40C28 22 46 14 54 14C66 14 78 22 78 38Z', ORANGE)}${o('M74 34H92V40H74Z', ORANGE)}`, shirt: SKY, extra: o('M44 68C48 64 58 64 62 68', K, 'stroke-width="4"') },
};
export function portrait(id) {
  const p = PORTRAITS[id];
  return `<svg class="portrait" viewBox="0 0 100 100" aria-hidden="true">
    <rect width="100" height="100" fill="${p.bg}"/>
    <rect width="100" height="100" fill="url(#ht)"/>
    ${o('M14 100C16 80 32 72 52 72C72 72 88 80 90 100Z', p.shirt)}
    ${o('M44 62V74C48 78 56 78 60 74V62Z', p.skin)}
    <ellipse class="o" cx="52" cy="48" rx="22" ry="25" fill="${p.skin}"/>
    ${p.hair}
    <circle cx="44" cy="52" r="2.6" fill="${K}"/><circle cx="62" cy="52" r="2.6" fill="${K}"/>
    ${o('M46 64C50 67 56 67 60 64')}
    ${p.extra}
  </svg>`;
}

export function cardBack() {
  return `<svg class="back-art" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
    <rect width="100" height="140" fill="${BLUE}"/>
    <rect width="100" height="140" fill="url(#ht-light)"/>
    <g opacity=".9">${[0, 1, 2, 3, 4, 5, 6].map((r) => [0, 1, 2, 3].map((c) => `<circle cx="${c * 30 + (r % 2 ? 15 : 0)}" cy="${r * 22}" r="7" fill="none" stroke="${PINK}" stroke-width="2.5"/>`).join('')).join('')}</g>
    <g transform="translate(50 70) rotate(45)"><rect x="-26" y="-26" width="52" height="52" fill="${Y}" stroke="${K}" stroke-width="3"/></g>
    <text x="50" y="66" text-anchor="middle" font-family="'Big Shoulders Display', Impact, sans-serif" font-weight="900" font-size="14" fill="${K}">PAPER</text>
    <text x="50" y="80" text-anchor="middle" font-family="'Big Shoulders Display', Impact, sans-serif" font-weight="900" font-size="14" fill="${K}">TRAIL</text>
  </svg>`;
}

// Shared SVG defs: halftone patterns and a rough-edge filter for stamps.
export const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <pattern id="ht" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><circle cx="1.5" cy="1.5" r="1.05" fill="#1b1a1f" opacity=".16"/></pattern>
  <pattern id="ht-light" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(20)"><circle cx="2" cy="2" r="1.3" fill="#fff" opacity=".18"/></pattern>
  <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
</defs></svg>`;
