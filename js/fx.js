// Visual & sound effects: particle bursts, stamps, and tiny synthesized sounds (no audio files).

const canvas = document.getElementById('fx-canvas');
const ctx = canvas.getContext('2d');
let parts = [];
let running = false;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

function loop() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.vy += p.g;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 'spark') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }
  if (parts.length) requestAnimationFrame(loop);
  else running = false;
}

export function burst(x, y, { colors = ['#f5c451', '#ffffff', '#60a5fa'], count = 40, power = 7, shape = 'confetti', gravity = 0.18 } = {}) {
  if (reduce) return;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = power * (0.4 + Math.random() * 0.8);
    parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.4, g: gravity,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, size: shape === 'spark' ? 1.5 + Math.random() * 2.5 : 6 + Math.random() * 7,
      color: colors[i % colors.length], life: 60 + Math.random() * 50, shape,
    });
  }
  if (!running) { running = true; requestAnimationFrame(loop); }
}

export function burstAt(el, opts) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

export function confettiRain() {
  if (reduce) return;
  const colors = ['#f5c451', '#22c55e', '#60a5fa', '#f472b6', '#ffffff'];
  for (let i = 0; i < 140; i++) {
    parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 3, g: 0.05,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, size: 7 + Math.random() * 7, color: colors[i % colors.length], life: 220, shape: 'confetti' });
  }
  if (!running) { running = true; requestAnimationFrame(loop); }
}

// ───────────── stamp ─────────────
const STAMP_COLORS = {
  APPROVED: 'green', FILED: 'blue', REJECTED: 'red', RFE: 'amber', SELECTED: 'gold', 'NOT SELECTED': 'red', CURRENT: 'gold',
  'GREEN CARD': 'green', CITIZEN: 'gold', EXTENDED: 'green', SCAM: 'red', 'EB-1': 'gold', CANADA: 'red', SPONSOR: 'gold', DENIED: 'red',
};
export function stamp(text) {
  if (!text) return;
  const wrap = document.createElement('div');
  wrap.className = 'stamp-wrap';
  wrap.innerHTML = `<div class="stamp ${STAMP_COLORS[text] || 'blue'}">${text}</div>`;
  document.body.appendChild(wrap);
  const bad = ['REJECTED', 'NOT SELECTED', 'SCAM', 'DENIED'].includes(text);
  setTimeout(() => {
    sound(bad ? 'bad' : 'stamp');
    if (bad) {
      document.getElementById('app').classList.add('screen-shake');
      setTimeout(() => document.getElementById('app').classList.remove('screen-shake'), 450);
    } else if (['GREEN CARD', 'CITIZEN', 'SELECTED', 'CURRENT'].includes(text)) {
      confettiRain();
      sound('fanfare');
    } else burst(innerWidth / 2, innerHeight / 2, { colors: ['#4ade80', '#bbf7d0', '#fff'], count: 30 });
  }, 180);
  setTimeout(() => wrap.remove(), 1900);
}

// ───────────── sound (Web Audio, synthesized) ─────────────
let actx = null;
let muted = true;
try { muted = localStorage.getItem('pt-sound') !== 'on'; } catch { /* storage blocked */ }
export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('pt-sound', m ? 'off' : 'on'); } catch { /* ignore */ }
  if (!m) sound('flip');
}
function ac() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, { type = 'sine', vol = 0.12, delay = 0, slide = 0 } = {}) {
  const a = ac();
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.15, delay = 0, hp = 800 } = {}) {
  const a = ac();
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}
export function sound(name) {
  if (muted) return;
  try {
    switch (name) {
      case 'flip': noise(0.06, { vol: 0.12, hp: 2500 }); tone(900, 0.05, { vol: 0.04 }); break;
      case 'tear': noise(0.35, { vol: 0.2, hp: 1500 }); break;
      case 'rare': [660, 880, 1320].forEach((f, i) => tone(f, 0.25, { vol: 0.08, delay: i * 0.07, type: 'triangle' })); break;
      case 'legendary': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, { vol: 0.08, delay: i * 0.08, type: 'triangle' })); break;
      case 'coin': tone(1320, 0.08, { vol: 0.08, type: 'square' }); tone(1760, 0.12, { vol: 0.06, delay: 0.07, type: 'square' }); break;
      case 'stamp': noise(0.12, { vol: 0.3, hp: 100 }); tone(90, 0.18, { vol: 0.25, slide: -40 }); break;
      case 'bad': tone(220, 0.25, { type: 'sawtooth', vol: 0.07, slide: -100 }); noise(0.12, { vol: 0.25, hp: 100 }); break;
      case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, { vol: 0.09, delay: 0.1 + i * 0.12, type: 'triangle' })); break;
      case 'click': tone(700, 0.04, { vol: 0.05 }); break;
      case 'whoosh': noise(0.25, { vol: 0.1, hp: 400 }); break;
      default: break;
    }
  } catch { /* audio unavailable */ }
}
