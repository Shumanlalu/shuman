'use strict';

/* ============================================================
   Utilities
   ============================================================ */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const pad = (n) => String(n).padStart(2, '0');
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const setText = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };

const STORE_PREFIX = 'shuman:';
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(STORE_PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage unavailable — app still works */
    }
  },
};

const todayKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const PALETTES = {
  gold: { dark: '#e9b872', light: '#9a6a23', inkDark: '#171208', inkLight: '#fffaf1' },
  mint: { dark: '#8fe3c4', light: '#27785f', inkDark: '#081713', inkLight: '#f5fffb' },
  iris: { dark: '#a9a8ff', light: '#5553bf', inkDark: '#0c0b1c', inkLight: '#f7f6ff' },
  rose: { dark: '#ffa6ba', light: '#a83e5a', inkDark: '#1a0910', inkLight: '#fff7f8' },
  sky: { dark: '#8fd3ff', light: '#226b93', inkDark: '#06141d', inkLight: '#f4fbff' },
  ember: { dark: '#ffb38a', light: '#9a4b1f', inkDark: '#1b0b03', inkLight: '#fff8f3' },
  sage: { dark: '#b9d9a0', light: '#4b6a2f', inkDark: '#0b1405', inkLight: '#f8fff3' },
  mono: { dark: '#e6e2d8', light: '#3b352c', inkDark: '#14110d', inkLight: '#fffdf8' },
};

const THEME_MODES = ['auto', 'dark', 'light'];
const FACES = ['heritage', 'neon', 'minimal', 'roman', 'orbit'];
const BACKDROPS = ['aurora', 'mesh', 'grid', 'plain'];
const ROMAN_HOURS = ['I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const DEFAULT_CUSTOM_ACCENT = '#e9b872';

const MOODS = {
  editorial: {
    label: 'Editorial', themeMode: 'dark', accent: 'gold', face: 'roman',
    backdrop: 'aurora', starfield: true, living: false,
  },
  arcade: {
    label: 'Arcade', themeMode: 'dark', accent: 'mint', face: 'neon',
    backdrop: 'grid', starfield: true, living: true,
  },
  paper: {
    label: 'Paper', themeMode: 'light', accent: 'mono', face: 'minimal',
    backdrop: 'plain', starfield: false, living: false,
  },
  cosmos: {
    label: 'Cosmos', themeMode: 'dark', accent: 'iris', face: 'orbit',
    backdrop: 'mesh', starfield: true, living: true,
  },
};

/* 15 original loops, generated for shuman and released under CC0 1.0. */
const ALARM_SOUNDS = [
  { id: 'golden-chime', name: 'Golden Chime', note: 'Warm bells' },
  { id: 'morning-marimba', name: 'Morning Marimba', note: 'Bright and wooden' },
  { id: 'glass-sunrise', name: 'Glass Sunrise', note: 'Airy glass' },
  { id: 'quiet-bells', name: 'Quiet Bells', note: 'Slow and calm' },
  { id: 'analog-dawn', name: 'Analog Dawn', note: 'Soft synth' },
  { id: 'harp-glow', name: 'Harp Glow', note: 'Plucked and warm' },
  { id: 'celesta-waltz', name: 'Celesta Waltz', note: 'Twinkling waltz' },
  { id: 'ocean-bell', name: 'Ocean Bell', note: 'Waves and bells' },
  { id: 'digital-bloom', name: 'Digital Bloom', note: 'Modern pulse' },
  { id: 'wooden-droplet', name: 'Wooden Droplet', note: 'Playful wood' },
  { id: 'star-pulse', name: 'Star Pulse', note: 'Deep and slow' },
  { id: 'clockwork', name: 'Clockwork', note: 'Tick-tock chime' },
  { id: 'bamboo-flute', name: 'Bamboo Flute', note: 'Breathy melody' },
  { id: 'cathedral-light', name: 'Cathedral Light', note: 'Reverent pad' },
  { id: 'first-light', name: 'First Light', note: 'Cinematic swell' },
];
const ALARM_SOUND_IDS = new Set(ALARM_SOUNDS.map((sound) => sound.id));
const DEFAULT_ALARM_SOUND = ALARM_SOUNDS[0].id;
const CUSTOM_ALARM_SOUND = 'custom';

function hexToRgb(hex) {
  const value = String(hex || '').replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function normalizeHex(value) {
  const text = String(value || '').trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(text);
  if (match) return `#${match[1].toLowerCase()}`;
  const short = /^#?([0-9a-f]{3})$/i.exec(text);
  if (short) return `#${short[1].split('').map((c) => c + c).join('').toLowerCase()}`;
  return null;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 1);
  const lightness = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hue < 60) { rp = c; gp = x; }
  else if (hue < 120) { rp = x; gp = c; }
  else if (hue < 180) { gp = c; bp = x; }
  else if (hue < 240) { gp = x; bp = c; }
  else if (hue < 300) { rp = x; bp = c; }
  else { rp = c; bp = x; }
  const toHex = (value) => {
    const channel = Math.round((value + m) * 255);
    return channel.toString(16).padStart(2, '0');
  };
  return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function customPalette(hex) {
  const base = normalizeHex(hex) || DEFAULT_CUSTOM_ACCENT;
  const { r, g, b } = hexToRgb(base);
  const { h, s, l } = rgbToHsl(r, g, b);
  const saturation = Math.max(s, 0.38);
  const dark = relativeLuminance(base) < 0.3 ? hslToHex(h, saturation, 0.62) : base;
  const light = relativeLuminance(base) > 0.52 ? hslToHex(h, saturation, 0.38) : base;
  return {
    dark,
    light,
    inkDark: relativeLuminance(dark) > 0.48 ? '#111111' : '#fffaf1',
    inkLight: relativeLuminance(light) > 0.48 ? '#111111' : '#fffaf1',
  };
}

function paletteFor(accent = state.accent) {
  if (accent === 'custom') return customPalette(state.customAccent);
  return PALETTES[accent] || PALETTES.gold;
}

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

/* ============================================================
   State
   ============================================================ */
const storedThemeMode = store.get('themeMode', store.get('theme', 'dark'));

const state = {
  format24: store.get('format24', true),
  themeMode: THEME_MODES.includes(storedThemeMode)
    ? storedThemeMode
    : storedThemeMode === 'light' ? 'light' : 'dark',
  theme: 'dark',
  accent: store.get('accent', 'gold'),
  customAccent: normalizeHex(store.get('customAccent', DEFAULT_CUSTOM_ACCENT)) || DEFAULT_CUSTOM_ACCENT,
  face: store.get('face', 'heritage'),
  backdrop: store.get('backdrop', 'aurora'),
  motion: store.get('motion', 'full') === 'reduced' ? 'reduced' : 'full',
  starfield: store.get('starfield', true) !== false,
  living: store.get('living', false) === true,
  signature: store.get('signature', ''),
  ambient: false,
  chime: store.get('chime', true),
  timerName: store.get('timerName', 'Tea timer'),
  intention: store.get('intention', ''),
  alarms: store.get('alarms', []),
  focusStats: store.get('focusStats', { date: todayKey(), sessions: 0, minutes: 0 }),
};

state.theme = state.themeMode === 'auto'
  ? (systemThemeQuery.matches ? 'dark' : 'light')
  : state.themeMode;

if (!PALETTES[state.accent] && state.accent !== 'custom') state.accent = 'gold';
if (!FACES.includes(state.face)) state.face = 'heritage';
if (!BACKDROPS.includes(state.backdrop)) state.backdrop = 'aurora';
if (typeof state.signature !== 'string') state.signature = '';
state.signature = state.signature.slice(0, 40);
state.living = Boolean(state.living);
if (!Array.isArray(state.alarms)) state.alarms = [];
if (!state.focusStats || state.focusStats.date !== todayKey()) {
  state.focusStats = { date: todayKey(), sessions: 0, minutes: 0 };
}

/* ============================================================
   DOM cache
   ============================================================ */
const ui = {
  html: document.documentElement,
  favicon: $('#favicon'),
  themeMeta: $('meta[name="theme-color"]'),

  heroHM: $('#heroHM'),
  heroSec: $('#heroSec'),
  heroAmPm: $('#heroAmPm'),
  heroDate: $('#heroDate'),
  localZone: $('#localZone'),
  dayPct: $('#dayPct'),
  dayFill: $('#dayFill'),
  analogHero: $('#analogHero'),
  handHour: $('#handHour'),
  handMinute: $('#handMinute'),
  handSecond: $('#handSecond'),

  wordClock: $('#wordClock'),
  wordSub: $('#wordSub'),
  binaryClock: $('#binaryClock'),
  cycles: $('#cycles'),

  worldGrid: $('#worldGrid'),
  worldLocal: $('#worldLocal'),

  zenOverlay: $('#zenOverlay'),
  zenBtn: $('#zenBtn'),
  zenClose: $('#zenClose'),
  zenTime: $('#zenTime'),
  zenDate: $('#zenDate'),
  zenWords: $('#zenWords'),
  zenZone: $('#zenZone'),
  copyBtn: $('#copyBtn'),

  formatToggle: $('#formatToggle'),
  themeToggle: $('#themeToggle'),
  personalizeBtn: $('#personalizeBtn'),
  soundToggle: $('#soundToggle'),

  focusToday: $('#focusToday'),
  pomoRing: $('#pomoRing'),
  pomoLabel: $('#pomoLabel'),
  pomoTime: $('#pomoTime'),
  pomoSub: $('#pomoSub'),
  pomoStart: $('#pomoStart'),
  pomoReset: $('#pomoReset'),
  pomoDots: $('#pomoDots'),
  pomoModes: $('#pomoModes'),
  pomoIntention: $('#pomoIntention'),
  intentionInput: $('#intentionInput'),
  focusStats: $('#focusStats'),
  focusMeter: $('#focusMeter'),
  ambientSwitch: $('#ambientSwitch'),
  chimeTest: $('#chimeTest'),

  timerRing: $('#timerRing'),
  timerLabel: $('#timerLabel'),
  timerTime: $('#timerTime'),
  timerSub: $('#timerSub'),
  timerStatus: $('#timerStatus'),
  timerPresets: $('#timerPresets'),
  customMinutes: $('#customMinutes'),
  setCustom: $('#setCustom'),
  timerStart: $('#timerStart'),
  timerReset: $('#timerReset'),
  timerName: $('#timerName'),
  chimeSwitch: $('#chimeSwitch'),
  ambientShortcut: $('#ambientShortcut'),

  swMain: $('#swMain'),
  swCs: $('#swCs'),
  swStatus: $('#swStatus'),
  swToggle: $('#swToggle'),
  swLap: $('#swLap'),
  swReset: $('#swReset'),
  lapList: $('#lapList'),
  lapCount: $('#lapCount'),

  nextAlarm: $('#nextAlarm'),
  alarmClockTime: $('#alarmClockTime'),
  alarmClockPeriod: $('#alarmClockPeriod'),
  alarmDate: $('#alarmDate'),
  alarmTime: $('#alarmTime'),
  alarmLabel: $('#alarmLabel'),
  alarmDays: $('#alarmDays'),
  alarmRepeatHint: $('#alarmRepeatHint'),
  alarmSound: $('#alarmSound'),
  alarmSoundPreview: $('#alarmSoundPreview'),
  alarmCustom: $('#alarmCustom'),
  alarmCustomPick: $('#alarmCustomPick'),
  alarmCustomName: $('#alarmCustomName'),
  alarmSave: $('#alarmSave'),
  alarmCancel: $('#alarmCancel'),
  alarmList: $('#alarmList'),
  alarmEmpty: $('#alarmEmpty'),
  alarmCount: $('#alarmCount'),
  alarmPermission: $('#alarmPermission'),
  alarmPermissionStatus: $('#alarmPermissionStatus'),

  personalizeSheet: $('#personalizeSheet'),
  themeModes: $('#themeModes'),
  accentGrid: $('#accentGrid'),
  accentColor: $('#accentColor'),
  accentValue: $('#accentValue'),
  faceChoices: $('#faceChoices'),
  backdropChoices: $('#backdropChoices'),
  moodGrid: $('#moodGrid'),
  motionToggle: $('#motionToggle'),
  starfieldToggle: $('#starfieldToggle'),
  livingToggle: $('#livingToggle'),
  signatureInput: $('#signatureInput'),
  footerSignature: $('#footerSignature'),
  personalizeReset: $('#personalizeReset'),

  toast: $('#toast'),
};

/* ============================================================
   Formatting
   ============================================================ */
const dateLong = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});
const dateShort = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', month: 'long', day: 'numeric',
});
const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';

function fmtHM(hours, minutes) {
  if (state.format24) return `${pad(hours)}:${pad(minutes)}`;
  return `${pad(hours % 12 || 12)}:${pad(minutes)}`;
}

function fmtCountdown(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/* ============================================================
   Preferences & theme
   ============================================================ */
let starRGB = hexToRgb('#e9b872');

function applyPreferences() {
  ui.html.dataset.theme = state.theme;
  ui.html.dataset.accent = state.accent;
  ui.html.dataset.motion = state.motion;
  ui.html.dataset.backdrop = state.backdrop;
  applyAccent();

  ui.formatToggle.textContent = state.format24 ? '24H' : '12H';
  ui.formatToggle.setAttribute('aria-label', state.format24 ? 'Use 12-hour time' : 'Use 24-hour time');

  ui.themeToggle.setAttribute('aria-label', state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  ui.themeMeta.content = state.theme === 'dark' ? '#08080b' : '#f2ede3';

  if (window.ShumanAndroid && typeof window.ShumanAndroid.setTheme === 'function') {
    window.ShumanAndroid.setTheme(state.theme);
  }

  ui.analogHero.dataset.face = state.face;
  syncClockNumerals();
  $$('.face-btn').forEach((btn) => {
    const active = btn.dataset.face === state.face;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  $$('.swatch').forEach((btn) => {
    const active = btn.dataset.accent === state.accent;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  syncPersonalizationUI();
  syncSignature();
  syncLivingAccent();
  updateStarfieldVisibility();

  ui.localZone.textContent = `Local time · ${localZone.replace(/_/g, ' ')}`;
  ui.zenZone.textContent = `Local time · ${localZone.replace(/_/g, ' ')}`;

  buildFavicon(new Date());
}

function syncSignature() {
  if (!ui.footerSignature) return;
  const text = state.signature.trim();
  ui.footerSignature.textContent = text ? `— ${text}` : '— time, in motion.';
  if (ui.signatureInput && document.activeElement !== ui.signatureInput) {
    ui.signatureInput.value = state.signature;
  }
}

function syncClockNumerals() {
  $$('.numeral', ui.analogHero).forEach((node, index) => {
    node.textContent = state.face === 'roman' ? ROMAN_HOURS[index] : String(index + 1);
  });
}

function syncPersonalizationUI() {
  $$('.mode-btn', ui.themeModes).forEach((btn) => {
    const active = btn.dataset.themeMode === state.themeMode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  $$('.accent-chip', ui.accentGrid).forEach((btn) => {
    const active = btn.dataset.accent === state.accent;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  $$('.face-choice', ui.faceChoices).forEach((btn) => {
    const active = btn.dataset.face === state.face;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  $$('.backdrop-choice', ui.backdropChoices).forEach((btn) => {
    const active = btn.dataset.backdrop === state.backdrop;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if (ui.accentColor) ui.accentColor.value = state.customAccent;
  if (ui.accentValue) ui.accentValue.textContent = state.customAccent.toUpperCase();

  ui.motionToggle.classList.toggle('is-on', state.motion !== 'reduced');
  ui.motionToggle.setAttribute('aria-checked', state.motion !== 'reduced' ? 'true' : 'false');

  ui.starfieldToggle.classList.toggle('is-on', state.starfield);
  ui.starfieldToggle.setAttribute('aria-checked', state.starfield ? 'true' : 'false');

  ui.livingToggle.classList.toggle('is-on', state.living);
  ui.livingToggle.setAttribute('aria-checked', state.living ? 'true' : 'false');
}

function livingAccent(base) {
  const { r, g, b } = hexToRgb(base);
  const { h, s, l } = rgbToHsl(r, g, b);
  const shift = Math.sin((Date.now() / 210000) * Math.PI * 2) * 26;
  return hslToHex(h + shift, Math.max(s, 0.24), l);
}

let livingTimer = 0;

function syncLivingAccent() {
  if (livingTimer) {
    clearInterval(livingTimer);
    livingTimer = 0;
  }
  if (!state.living) return;
  livingTimer = window.setInterval(() => {
    if (state.living) applyAccent();
  }, 6000);
}

function applyAccent() {
  const palette = paletteFor();
  const base = state.theme === 'dark' ? palette.dark : palette.light;
  const accent = state.living ? livingAccent(base) : base;
  ui.html.style.setProperty('--accent', accent);
  ui.html.style.setProperty('--on-accent', state.theme === 'dark' ? palette.inkDark : palette.inkLight);
  starRGB = hexToRgb(accent);
  lastFaviconKey = '';
  buildFavicon(new Date());
}

/* ============================================================
   Analog hero clock
   ============================================================ */
function buildClockFace() {
  const ticks = $('#heroTicks');
  const numerals = $('#heroNumerals');
  let tickMarkup = '';

  for (let i = 0; i < 60; i += 1) {
    const angle = (i / 60) * Math.PI * 2;
    const major = i % 5 === 0;
    const cardinal = i % 15 === 0;
    const outer = major ? 89 : 90.5;
    const inner = cardinal ? 78 : major ? 82 : 86.5;
    const x1 = 100 + Math.sin(angle) * outer;
    const y1 = 100 - Math.cos(angle) * outer;
    const x2 = 100 + Math.sin(angle) * inner;
    const y2 = 100 - Math.cos(angle) * inner;
    const cls = cardinal ? 'tick tick--major tick--cardinal' : major ? 'tick tick--major' : 'tick';
    tickMarkup += `<line class="${cls}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" />`;
  }

  ticks.innerHTML = tickMarkup;

  let numeralMarkup = '';
  for (let i = 1; i <= 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const x = 100 + Math.sin(angle) * 71;
    const y = 100 - Math.cos(angle) * 71;
    numeralMarkup += `<text class="numeral" x="${x.toFixed(2)}" y="${y.toFixed(2)}">${i}</text>`;
  }
  numerals.innerHTML = numeralMarkup;
  syncClockNumerals();
}

function rotateHand(group, degrees, cx = 100, cy = 100) {
  group.setAttribute('transform', `rotate(${degrees.toFixed(2)} ${cx} ${cy})`);
}

function updateAnalogHands(now) {
  const ms = now.getMilliseconds();
  const seconds = now.getSeconds() + ms / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;

  rotateHand(ui.handHour, hours * 30);
  rotateHand(ui.handMinute, minutes * 6);
  rotateHand(ui.handSecond, seconds * 6);
}

/* ============================================================
   Favicon — a tiny live clock
   ============================================================ */
let lastFaviconKey = '';

function buildFavicon(now) {
  const palette = paletteFor();
  const base = state.theme === 'dark' ? palette.dark : palette.light;
  const accent = state.living ? livingAccent(base) : base;
  const dark = state.theme === 'dark';
  const key = `${state.theme}|${state.accent}|${accent}|${now.getHours()}|${now.getMinutes()}`;
  if (key === lastFaviconKey) return;
  lastFaviconKey = key;

  const bg = dark ? '#0f0f15' : '#fbf7ef';
  const fg = dark ? '#f5f1e8' : '#211d17';
  const h = (now.getHours() % 12) + now.getMinutes() / 60;
  const m = now.getMinutes() + now.getSeconds() / 60;
  const hand = (angle, length, width, color) =>
    `<line x1="32" y1="32" x2="32" y2="${32 - length}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" transform="rotate(${angle.toFixed(1)} 32 32)"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${bg}"/><circle cx="32" cy="32" r="24" fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="1.4"/>${hand(h * 30, 13, 4, fg)}${hand(m * 6, 19, 2.4, fg)}<circle cx="32" cy="32" r="2.8" fill="${accent}"/></svg>`;
  ui.favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ============================================================
   Hero readout
   ============================================================ */
function updateHero(now) {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  setText(ui.heroHM, fmtHM(h, m));
  setText(ui.heroSec, pad(s));
  setText(ui.heroDate, dateLong.format(now));

  if (state.format24) {
    ui.heroAmPm.hidden = true;
  } else {
    ui.heroAmPm.hidden = false;
    setText(ui.heroAmPm, h < 12 ? 'AM' : 'PM');
  }

  const percent = ((h * 3600 + m * 60 + s) / 86400) * 100;
  ui.dayFill.style.width = `${percent.toFixed(2)}%`;
  setText(ui.dayPct, `${Math.floor(percent)}%`);

  setText(ui.worldLocal, `${fmtHM(h, m)}:${pad(s)}${state.format24 ? '' : ` ${h < 12 ? 'AM' : 'PM'}`}`);
  buildFavicon(now);

  const title = `${fmtHM(h, m)}${state.format24 ? '' : ` ${h < 12 ? 'AM' : 'PM'}`} · shuman`;
  if (document.title !== title) document.title = title;

  if (!ui.zenOverlay.hidden) updateZen(now);
}

/* ============================================================
   Word clock
   ============================================================ */
const HOUR_WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
const MINUTE_WORDS = { 5: 'five', 10: 'ten', 20: 'twenty', 25: 'twenty-five' };
let lastWordKey = '';

function timeAsWords(now) {
  let total = Math.round((now.getHours() * 60 + now.getMinutes()) / 5) * 5;
  total = ((total % 1440) + 1440) % 1440;
  const hours24 = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  const hourWord = HOUR_WORDS[hours24 % 12];
  const nextWord = HOUR_WORDS[(hours24 + 1) % 12];

  const num = (text) => ({ text, cls: 'wc-num' });
  const link = (text) => ({ text, cls: 'wc-func' });
  const tokens = [{ text: 'It’s', cls: '' }];

  if (minutes === 0) {
    tokens.push(num(hourWord), link('o’clock'));
  } else if (minutes === 15) {
    tokens.push(num('quarter'), link('past'), num(hourWord));
  } else if (minutes === 30) {
    tokens.push(num('half'), link('past'), num(hourWord));
  } else if (minutes === 45) {
    tokens.push(num('quarter'), link('to'), num(nextWord));
  } else if (minutes < 30) {
    tokens.push(num(MINUTE_WORDS[minutes]), link('past'), num(hourWord));
  } else {
    tokens.push(num(MINUTE_WORDS[60 - minutes]), link('to'), num(nextWord));
  }

  const period = hours24 < 4 ? 'at night'
    : hours24 < 12 ? 'in the morning'
      : hours24 < 17 ? 'in the afternoon'
        : hours24 < 21 ? 'in the evening' : 'at night';
  period.split(' ').forEach((word) => tokens.push(link(word)));

  const text = tokens.map((token) => token.text).join(' ');
  return { tokens, text: `${text}.`, key: text };
}

function updateWordClock(now) {
  const words = timeAsWords(now);
  if (words.key !== lastWordKey) {
    lastWordKey = words.key;
    ui.wordClock.innerHTML = words.tokens
      .map((token, index) => {
        const period = index === words.tokens.length - 1 ? '.' : '';
        return `<span class="${token.cls}" style="--i:${index}">${token.text}${period}</span>`;
      })
      .join('');
    ui.wordClock.setAttribute('aria-label', words.text);
  }
  const ampm = now.getHours() < 12 ? 'AM' : 'PM';
  setText(ui.wordSub, `${fmtHM(now.getHours(), now.getMinutes())}${state.format24 ? '' : ` ${ampm}`} · rounded to five minutes`);
}

/* ============================================================
   Binary clock
   ============================================================ */
let binaryColumns = [];

function buildBinaryClock() {
  const groups = ['HRS', 'MIN', 'SEC'];
  let markup = '';
  groups.forEach((label) => {
    markup += '<div class="bin-group"><div class="bin-group__bits">';
    for (let column = 0; column < 2; column += 1) {
      markup += '<div class="bin-col">';
      for (let bit = 8; bit >= 1; bit /= 2) {
        markup += `<span class="bit" data-bit="${bit}"></span>`;
      }
      markup += '</div>';
    }
    markup += `</div><span class="bin-group__label">${label}</span></div>`;
  });
  ui.binaryClock.innerHTML = markup;
  binaryColumns = $$('.bin-col', ui.binaryClock);
}

function updateBinaryClock(now) {
  const digits = [
    Math.floor(now.getHours() / 10), now.getHours() % 10,
    Math.floor(now.getMinutes() / 10), now.getMinutes() % 10,
    Math.floor(now.getSeconds() / 10), now.getSeconds() % 10,
  ];
  binaryColumns.forEach((column, index) => {
    Array.from(column.children).forEach((dot, bitIndex) => {
      const bit = 8 >> bitIndex;
      dot.classList.toggle('is-on', (digits[index] & bit) !== 0);
    });
  });
  ui.binaryClock.setAttribute(
    'aria-label',
    `Binary clock: ${pad(now.getHours())} ${pad(now.getMinutes())} ${pad(now.getSeconds())}`,
  );
}

/* ============================================================
   Cycles
   ============================================================ */
let cycleRefs = [];

function buildCycles() {
  const defs = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ];
  ui.cycles.innerHTML = defs.map((def) => `
    <div class="cycle" data-cycle="${def.key}">
      <div class="cycle__ring" title="${def.label} progress">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle class="cycle__track" cx="32" cy="32" r="27" />
          <circle class="cycle__arc" cx="32" cy="32" r="27" pathLength="100" />
        </svg>
        <span class="cycle__pct">0</span>
      </div>
      <span class="cycle__label">${def.label}</span>
    </div>
  `).join('');
  cycleRefs = defs.map((def) => {
    const card = $(`[data-cycle="${def.key}"]`, ui.cycles);
    return {
      arc: $('.cycle__arc', card),
      pct: $('.cycle__pct', card),
      wrap: $('.cycle__ring', card),
      label: def.label,
    };
  });
}

function updateCycles(now) {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayFraction = (now.getTime() - startOfDay) / 86400000;
  const mondayIndex = (now.getDay() + 6) % 7;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1).getTime();

  const values = [
    dayFraction * 100,
    ((mondayIndex + dayFraction) / 7) * 100,
    ((now.getDate() - 1 + dayFraction) / daysInMonth) * 100,
    ((now.getTime() - startOfYear) / (endOfYear - startOfYear)) * 100,
  ];

  cycleRefs.forEach((ref, index) => {
    const value = clamp(values[index], 0, 100);
    ref.arc.style.strokeDashoffset = String(100 - value);
    ref.pct.textContent = String(Math.round(value));
    ref.wrap.title = `${ref.label}: ${Math.round(value)}% complete`;
  });
}

/* ============================================================
   World clocks
   ============================================================ */
const CITIES = [
  { city: 'Los Angeles', country: 'United States', tz: 'America/Los_Angeles' },
  { city: 'New York', country: 'United States', tz: 'America/New_York' },
  { city: 'London', country: 'United Kingdom', tz: 'Europe/London' },
  { city: 'Paris', country: 'France', tz: 'Europe/Paris' },
  { city: 'Dubai', country: 'United Arab Emirates', tz: 'Asia/Dubai' },
  { city: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore' },
  { city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo' },
  { city: 'Sydney', country: 'Australia', tz: 'Australia/Sydney' },
];

const zoneFormatters = new Map();
let cityRefs = [];

const sunIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const moonIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.2 8.2 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5Z"/></svg>';

function zoneParts(timeZone, date) {
  let formatter = zoneFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    zoneFormatters.set(timeZone, formatter);
  }
  const parts = {};
  formatter.formatToParts(date).forEach((part) => { parts[part.type] = part.value; });
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function zoneOffsetMinutes(timeZone, date) {
  const p = zoneParts(timeZone, date);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

function offsetLabel(diff) {
  if (diff === 0) return 'Same as you';
  const sign = diff > 0 ? '+' : '−';
  const abs = Math.abs(diff);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `${sign}${hours}${minutes ? `:${pad(minutes)}` : 'h'}`;
}

function dayLabel(cityParts, now) {
  const localDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const cityDay = Date.UTC(cityParts.year, cityParts.month - 1, cityParts.day);
  const diff = Math.round((cityDay - localDay) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(new Date(cityDay));
}

function miniDialMarkup() {
  let ticks = '';
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const major = i % 3 === 0;
    const outer = 50;
    const inner = major ? 44.5 : 47;
    const x1 = 60 + Math.sin(angle) * outer;
    const y1 = 60 - Math.cos(angle) * outer;
    const x2 = 60 + Math.sin(angle) * inner;
    const y2 = 60 - Math.cos(angle) * inner;
    ticks += `<line class="mini-tick${major ? ' mini-tick--major' : ''}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" />`;
  }
  return `
    <svg class="mini-clock__svg" viewBox="0 0 120 120" aria-hidden="true">
      <circle class="mini-face" cx="60" cy="60" r="55" />
      ${ticks}
      <g data-hand="hour"><line class="mini-hand mini-hand--hour" x1="60" y1="63" x2="60" y2="36" /></g>
      <g data-hand="minute"><line class="mini-hand mini-hand--minute" x1="60" y1="65" x2="60" y2="27" /></g>
      <g data-hand="second"><line class="mini-hand mini-hand--second" x1="60" y1="67" x2="60" y2="23" /></g>
      <circle class="mini-pin" cx="60" cy="60" r="2.6" />
    </svg>`;
}

function buildWorldClocks() {
  ui.worldGrid.innerHTML = CITIES.map((item) => `
    <article class="world-card card" data-tz="${item.tz}" data-phase="day">
      <header class="world-card__top">
        <div>
          <h2 class="world-card__city">${item.city}</h2>
          <p class="world-card__country">${item.country}</p>
        </div>
        <span class="phase-ico">${sunIcon}</span>
      </header>
      <div class="world-card__dial">
        <span class="world-card__ring"></span>
        ${miniDialMarkup()}
      </div>
      <div class="world-card__time-row">
        <span class="world-card__time">00:00</span>
        <span class="world-card__ampm" hidden>AM</span>
      </div>
      <footer class="world-card__meta">
        <span class="world-card__offset">—</span>
        <span class="world-card__day">—</span>
      </footer>
    </article>
  `).join('');

  cityRefs = CITIES.map((item) => {
    const card = $(`[data-tz="${item.tz}"]`, ui.worldGrid);
    return {
      ...item,
      card,
      hourHand: $('[data-hand="hour"]', card),
      minuteHand: $('[data-hand="minute"]', card),
      secondHand: $('[data-hand="second"]', card),
      time: $('.world-card__time', card),
      ampm: $('.world-card__ampm', card),
      offset: $('.world-card__offset', card),
      day: $('.world-card__day', card),
      icon: $('.phase-ico', card),
      phase: '',
    };
  });
}

function updateWorldClocks(now) {
  const localAhead = -now.getTimezoneOffset();

  cityRefs.forEach((ref) => {
    const p = zoneParts(ref.tz, now);
    rotateHand(ref.hourHand, (p.hour % 12 + p.minute / 60) * 30, 60, 60);
    rotateHand(ref.minuteHand, (p.minute + p.second / 60) * 6, 60, 60);
    rotateHand(ref.secondHand, p.second * 6, 60, 60);

    setText(ref.time, fmtHM(p.hour, p.minute));
    if (state.format24) {
      ref.ampm.hidden = true;
    } else {
      ref.ampm.hidden = false;
      setText(ref.ampm, p.hour < 12 ? 'AM' : 'PM');
    }

    const diff = zoneOffsetMinutes(ref.tz, now) - localAhead;
    setText(ref.offset, offsetLabel(diff));
    setText(ref.day, dayLabel(p, now));

    const phase = p.hour >= 6 && p.hour < 18 ? 'day' : 'night';
    if (phase !== ref.phase) {
      ref.phase = phase;
      ref.card.dataset.phase = phase;
      ref.icon.innerHTML = phase === 'day' ? sunIcon : moonIcon;
    }
  });
}

/* ============================================================
   Tabs & zen mode
   ============================================================ */
const VIEWS = ['clock', 'world', 'alarm', 'focus', 'timer', 'stopwatch'];
let activeView = 'clock';
let lastZenFocus = null;

function switchView(name, { updateHash = true } = {}) {
  const next = VIEWS.includes(name) ? name : 'clock';
  activeView = next;

  VIEWS.forEach((view) => {
    const tab = $(`#tab-${view}`);
    const panel = $(`#view-${view}`);
    const isActive = view === next;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.tabIndex = isActive ? 0 : -1;
    panel.hidden = !isActive;
  });

  if (updateHash) {
    try {
      history.replaceState(null, '', `#${next}`);
    } catch {
      /* fragmented navigation can be restricted in some contexts */
    }
    window.scrollTo({ top: 0, behavior: motionIsReduced() ? 'auto' : 'smooth' });
  }

  if (next === 'world') updateWorldClocks(new Date());
  if (next === 'clock') updateCycles(new Date());
  if (next === 'alarm') {
    updateAlarmView(new Date());
    refreshAlarmPermissions();
  } else {
    stopAlarmPreview();
  }
}

function updateZen(now) {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const period = state.format24 ? '' : `<span class="zen__period">${h < 12 ? 'AM' : 'PM'}</span>`;
  ui.zenTime.innerHTML = `${fmtHM(h, m)}<span class="zen__seconds">${pad(s)}</span>${period}`;
  ui.zenDate.textContent = dateLong.format(now);
  ui.zenWords.textContent = timeAsWords(now).text.replace(/^It’s /, '');
}

function openZen() {
  lastZenFocus = document.activeElement;
  ui.zenOverlay.hidden = false;
  document.body.classList.add('no-scroll');
  updateZen(new Date());
  ui.zenClose.focus();
}

function closeZen() {
  ui.zenOverlay.hidden = true;
  document.body.classList.remove('no-scroll');
  if (lastZenFocus && typeof lastZenFocus.focus === 'function') lastZenFocus.focus();
}

function toggleZen() {
  if (ui.zenOverlay.hidden) openZen();
  else closeZen();
}

/* ============================================================
   Toast & clipboard
   ============================================================ */
let toastTimer = null;

function toast(message, duration = 2800) {
  setText(ui.toast, message);
  ui.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('is-visible'), duration);
}

async function copyTime() {
  const now = new Date();
  const time = `${fmtHM(now.getHours(), now.getMinutes())}:${pad(now.getSeconds())}${state.format24 ? '' : ` ${now.getHours() < 12 ? 'AM' : 'PM'}`}`;
  const text = `${dateLong.format(now)} · ${time} (${localZone})`;
  try {
    await navigator.clipboard.writeText(text);
    toast('Time copied to clipboard.');
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      toast('Time copied to clipboard.');
    } catch {
      toast('Could not copy the time.');
    }
    area.remove();
  }
}

/* ============================================================
   Audio — ambient noise & chimes
   ============================================================ */
let audioCtx = null;
let ambientNodes = null;

function initAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function buildAmbient(ctx) {
  const length = Math.floor(ctx.sampleRate * 4);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = clamp(last * 3.2, -1, 1);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 620;
  filter.Q.value = 0.35;

  const gain = ctx.createGain();
  gain.gain.value = 0.0001;

  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.055;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 160;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  lfo.start();

  ambientNodes = { source, filter, gain, lfo };
}

function setAmbient(next, announce = false) {
  state.ambient = Boolean(next);

  if (state.ambient) {
    const ctx = initAudio();
    if (!ctx) {
      state.ambient = false;
      syncSoundUI();
      toast('Audio is not available in this browser.');
      return;
    }
    if (!ambientNodes) buildAmbient(ctx);
    const now = ctx.currentTime;
    ambientNodes.gain.gain.cancelScheduledValues(now);
    ambientNodes.gain.gain.setValueAtTime(Math.max(ambientNodes.gain.gain.value, 0.0001), now);
    ambientNodes.gain.gain.linearRampToValueAtTime(0.055, now + 1.2);
    if (announce) toast('Soundscape on — warm brown noise.');
  } else if (ambientNodes && audioCtx) {
    const now = audioCtx.currentTime;
    ambientNodes.gain.gain.cancelScheduledValues(now);
    ambientNodes.gain.gain.setValueAtTime(Math.max(ambientNodes.gain.gain.value, 0.0001), now);
    ambientNodes.gain.gain.linearRampToValueAtTime(0.0001, now + 0.7);
    if (announce) toast('Soundscape off.');
  }

  syncSoundUI();
}

function playChime(force = false) {
  if (!force && !state.chime) return;
  const ctx = initAudio();
  if (!ctx) return;
  const notes = [659.25, 783.99, 987.77, 1318.51];
  const start = ctx.currentTime + 0.05;
  notes.forEach((frequency, index) => {
    const at = start + index * 0.16;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.12, at + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 1.5);
  });
}

function syncSoundUI() {
  const on = state.ambient;
  ui.soundToggle.classList.toggle('is-on', on);
  ui.soundToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
  ui.ambientSwitch.classList.toggle('is-on', on);
  ui.ambientSwitch.setAttribute('aria-checked', on ? 'true' : 'false');
  setText(ui.ambientShortcut, on ? 'Turn off soundscape' : 'Turn on soundscape');
}

function syncChimeUI() {
  ui.chimeSwitch.classList.toggle('is-on', state.chime);
  ui.chimeSwitch.setAttribute('aria-checked', state.chime ? 'true' : 'false');
}

/* ============================================================
   Starfield
   ============================================================ */
const starCanvas = $('#starfield');
const starCtx = starCanvas.getContext('2d');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

function motionIsReduced() {
  return state.motion === 'reduced' || reducedMotionQuery.matches;
}

function updateStarfieldVisibility() {
  if (starCanvas) starCanvas.style.display = state.starfield ? '' : 'none';
}

let starField = [];
let starWidth = 0;
let starHeight = 0;

function resizeStars() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  starWidth = window.innerWidth;
  starHeight = window.innerHeight;
  starCanvas.width = Math.floor(starWidth * dpr);
  starCanvas.height = Math.floor(starHeight * dpr);
  starCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.round(clamp((starWidth * starHeight) / 21000, 36, 120));
  starField = Array.from({ length: count }, () => ({
    x: Math.random() * starWidth,
    y: Math.random() * starHeight,
    radius: Math.random() * 1.2 + 0.25,
    alpha: Math.random() * 0.45 + 0.1,
    twinkle: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.05 + 0.012,
  }));
}

function drawStars(time) {
  starCtx.clearRect(0, 0, starWidth, starHeight);
  if (!state.starfield) {
    window.requestAnimationFrame(drawStars);
    return;
  }
  const dim = state.theme === 'light' ? 0.45 : 1;
  const still = motionIsReduced();

  for (let i = 0; i < starField.length; i += 1) {
    const star = starField[i];
    if (!still) {
      star.y -= star.speed;
      star.x += Math.sin(time * 0.00008 + star.twinkle) * 0.035;
      if (star.y < -2) { star.y = starHeight + 2; star.x = Math.random() * starWidth; }
      if (star.x < -2) star.x = starWidth + 2;
      if (star.x > starWidth + 2) star.x = -2;
    }
    const twinkle = star.alpha + (still ? 0 : Math.sin(time * 0.0009 + star.twinkle) * 0.1);
    const alpha = clamp(twinkle, 0.03, 0.7) * dim;
    starCtx.beginPath();
    starCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    starCtx.fillStyle = `rgba(${starRGB.r}, ${starRGB.g}, ${starRGB.b}, ${alpha.toFixed(3)})`;
    starCtx.fill();
  }

  window.requestAnimationFrame(drawStars);
}

/* ============================================================
   Countdown engine
   ============================================================ */
class Countdown {
  constructor(durationMs, handlers = {}) {
    this.duration = durationMs;
    this.remaining = durationMs;
    this.running = false;
    this.ended = false;
    this.endAt = 0;
    this.rafId = 0;
    this.handlers = handlers;
    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.running) return;
    if (this.ended || this.remaining <= 0) {
      this.remaining = this.duration;
      this.ended = false;
    }
    this.running = true;
    this.endAt = performance.now() + this.remaining;
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.loop);
    if (this.handlers.onState) this.handlers.onState('running');
  }

  loop() {
    if (!this.running) return;
    this.remaining = Math.max(0, this.endAt - performance.now());
    if (this.handlers.onTick) this.handlers.onTick(this.remaining, this.duration);
    if (this.remaining <= 0) {
      this.running = false;
      this.ended = true;
      if (this.handlers.onState) this.handlers.onState('done');
      if (this.handlers.onDone) this.handlers.onDone();
      return;
    }
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (!this.running) return;
    this.remaining = Math.max(0, this.endAt - performance.now());
    this.running = false;
    cancelAnimationFrame(this.rafId);
    if (this.handlers.onTick) this.handlers.onTick(this.remaining, this.duration);
    if (this.handlers.onState) this.handlers.onState('paused');
  }

  reset(durationMs = this.duration) {
    this.running = false;
    this.ended = false;
    cancelAnimationFrame(this.rafId);
    this.duration = durationMs;
    this.remaining = durationMs;
    if (this.handlers.onTick) this.handlers.onTick(this.remaining, this.duration);
    if (this.handlers.onState) this.handlers.onState('ready');
  }

  setDuration(durationMs) {
    this.running = false;
    this.ended = false;
    cancelAnimationFrame(this.rafId);
    this.duration = durationMs;
    this.remaining = durationMs;
    if (this.handlers.onTick) this.handlers.onTick(this.remaining, this.duration);
    if (this.handlers.onState) this.handlers.onState('ready');
  }
}

/* ============================================================
   Timer
   ============================================================ */
const timerCountdown = new Countdown(5 * 60 * 1000, {
  onTick(remaining, duration) {
    const fraction = duration > 0 ? remaining / duration : 0;
    ui.timerRing.style.strokeDashoffset = String(100 * (1 - fraction));
    setText(ui.timerTime, fmtCountdown(remaining));
  },
  onState() {
    syncTimerUI();
  },
  onDone() {
    playChime();
    toast(`${timerLabelText()} finished — time’s up.`);
  },
});

function timerLabelText() {
  const name = typeof state.timerName === 'string' ? state.timerName.trim() : '';
  return name || 'Timer';
}

function timerMinutesLabel() {
  const minutes = Math.round(timerCountdown.duration / 60000);
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

function syncTimerUI() {
  let status = 'ready';
  if (timerCountdown.ended) status = 'done';
  else if (timerCountdown.running) status = 'running';
  else if (timerCountdown.remaining < timerCountdown.duration) status = 'paused';

  setText(ui.timerStatus, { ready: 'Ready', running: 'Running', paused: 'Paused', done: 'Done' }[status]);
  setText(ui.timerSub, status === 'done' ? 'Time’s up' : timerMinutesLabel());
  setText(ui.timerStart, {
    ready: 'Start timer',
    running: 'Pause timer',
    paused: 'Resume',
    done: 'Start again',
  }[status]);
}

function syncTimerName() {
  if (typeof state.timerName !== 'string') state.timerName = 'Tea timer';
  ui.timerName.value = state.timerName;
  setText(ui.timerLabel, timerLabelText());
}

function markPreset(durationMs) {
  $$('.preset', ui.timerPresets).forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.min) * 60000 === durationMs);
  });
}

function setTimerDuration(durationMs) {
  timerCountdown.pause();
  timerCountdown.reset(durationMs);
  markPreset(durationMs);
  syncTimerUI();
}

function applyCustomTimer() {
  const raw = Number(ui.customMinutes.value);
  if (!Number.isFinite(raw) || raw <= 0) {
    toast('Choose a duration between 1 and 180 minutes.');
    return;
  }
  const minutes = clamp(Math.round(raw), 1, 180);
  ui.customMinutes.value = String(minutes);
  setTimerDuration(minutes * 60000);
  toast(`Timer set for ${minutes} minute${minutes === 1 ? '' : 's'}.`);
}

/* ============================================================
   Pomodoro focus
   ============================================================ */
const POMO_DURATIONS = {
  focus: 25 * 60 * 1000,
  short: 5 * 60 * 1000,
  long: 15 * 60 * 1000,
};

let pomoCycle = 0;
const pomo = { mode: 'focus' };

function ensureFocusStats() {
  if (!state.focusStats || state.focusStats.date !== todayKey()) {
    state.focusStats = { date: todayKey(), sessions: 0, minutes: 0 };
    store.set('focusStats', state.focusStats);
  }
}

function updateFocusStats() {
  ensureFocusStats();
  const { sessions, minutes } = state.focusStats;
  setText(ui.focusStats, `${sessions} session${sessions === 1 ? '' : 's'} · ${minutes} min`);
  setText(ui.focusToday, `${sessions} session${sessions === 1 ? '' : 's'}`);
  ui.focusMeter.style.width = `${Math.min(100, (sessions / 4) * 100)}%`;
}

const pomoCountdown = new Countdown(POMO_DURATIONS.focus, {
  onTick(remaining, duration) {
    const fraction = duration > 0 ? remaining / duration : 0;
    ui.pomoRing.style.strokeDashoffset = String(100 * (1 - fraction));
    setText(ui.pomoTime, fmtCountdown(remaining));
  },
  onState() {
    syncPomoChrome();
  },
  onDone() {
    handlePomoDone();
  },
});

function pomoLabel(mode) {
  return mode === 'focus' ? 'Focus session' : mode === 'short' ? 'Short break' : 'Long break';
}

function pomoStartLabel() {
  if (pomoCountdown.running) return 'Pause';
  if (!pomoCountdown.ended && pomoCountdown.remaining < pomoCountdown.duration) return 'Resume';
  return pomo.mode === 'focus' ? 'Start focus' : 'Start break';
}

function syncPomoChrome() {
  setText(ui.pomoLabel, pomoLabel(pomo.mode));
  setText(ui.pomoSub, pomo.mode === 'focus'
    ? `Session ${clamp(pomoCycle + 1, 1, 4)} of 4`
    : `${Math.min(pomoCycle, 4)} of 4 sessions complete`);
  setText(ui.pomoStart, pomoStartLabel());

  const dots = $$('.pomo-dot', ui.pomoDots);
  dots.forEach((dot, index) => dot.classList.toggle('is-done', index < Math.min(pomoCycle, 4)));

  $$('.seg__btn', ui.pomoModes).forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.mode === pomo.mode);
  });
}

function buildPomoDots() {
  ui.pomoDots.innerHTML = '<span class="pomo-dot"></span>'.repeat(4);
}

function setPomoMode(mode) {
  if (!POMO_DURATIONS[mode]) return;
  pomoCountdown.pause();
  pomo.mode = mode;
  pomoCountdown.setDuration(POMO_DURATIONS[mode]);
  syncPomoChrome();
}

function handlePomoDone() {
  playChime();

  if (pomo.mode === 'focus') {
    pomoCycle = clamp(pomoCycle + 1, 0, 4);
    ensureFocusStats();
    state.focusStats.sessions += 1;
    state.focusStats.minutes += 25;
    store.set('focusStats', state.focusStats);
    updateFocusStats();

    if (pomoCycle >= 4) {
      toast('Four sessions down. Take a long break — you earned it.');
      setPomoMode('long');
    } else {
      toast('Focus session complete. Breathe for a minute.');
      setPomoMode('short');
    }
  } else {
    const wasLong = pomo.mode === 'long';
    if (wasLong) pomoCycle = 0;
    toast(wasLong ? 'Long break over. A fresh start.' : 'Break over. One thing at a time.');
    setPomoMode('focus');
  }
}

function syncIntention() {
  if (typeof state.intention !== 'string') state.intention = '';
  ui.intentionInput.value = state.intention;
  const value = state.intention.trim();
  setText(ui.pomoIntention, value ? `“${value}”` : '“One thing at a time.”');
}

/* ============================================================
   Stopwatch
   ============================================================ */
const stopwatch = {
  running: false,
  startedAt: 0,
  elapsed: 0,
  laps: [],
  rafId: 0,
};

function stopwatchElapsed() {
  return stopwatch.running ? performance.now() - stopwatch.startedAt : stopwatch.elapsed;
}

function formatStopwatch(ms) {
  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return {
    main: hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`,
    cs: pad(centiseconds),
  };
}

function renderStopwatch() {
  const value = formatStopwatch(stopwatchElapsed());
  setText(ui.swMain, value.main);
  setText(ui.swCs, `.${value.cs}`);
}

function stopwatchFrame() {
  if (!stopwatch.running) return;
  renderStopwatch();
  stopwatch.rafId = requestAnimationFrame(stopwatchFrame);
}

function syncStopwatchUI() {
  setText(ui.swToggle, stopwatch.running ? 'Pause' : stopwatch.elapsed > 0 ? 'Resume' : 'Start');
  ui.swLap.disabled = !stopwatch.running;
  ui.swReset.disabled = !stopwatch.running && stopwatch.elapsed === 0 && stopwatch.laps.length === 0;
  setText(ui.swStatus, stopwatch.running
    ? 'Running · space to pause'
    : stopwatch.elapsed > 0 ? 'Paused — take a breath' : 'Ready when you are');
}

function startStopwatch() {
  if (stopwatch.running) return;
  stopwatch.running = true;
  stopwatch.startedAt = performance.now() - stopwatch.elapsed;
  stopwatch.rafId = requestAnimationFrame(stopwatchFrame);
  syncStopwatchUI();
}

function pauseStopwatch() {
  if (!stopwatch.running) return;
  stopwatch.elapsed = performance.now() - stopwatch.startedAt;
  stopwatch.running = false;
  cancelAnimationFrame(stopwatch.rafId);
  renderStopwatch();
  syncStopwatchUI();
}

function toggleStopwatch() {
  if (stopwatch.running) pauseStopwatch();
  else startStopwatch();
}

function recordLap() {
  if (!stopwatch.running) return;
  stopwatch.laps.push(stopwatchElapsed());
  renderLaps();
}

function resetStopwatch() {
  stopwatch.running = false;
  cancelAnimationFrame(stopwatch.rafId);
  stopwatch.elapsed = 0;
  stopwatch.laps = [];
  renderStopwatch();
  renderLaps();
  syncStopwatchUI();
}

function renderLaps() {
  ui.lapCount.textContent = String(stopwatch.laps.length).padStart(2, '0');
  if (stopwatch.laps.length === 0) {
    ui.lapList.innerHTML = '<li class="laps__empty">Your splits will land here.</li>';
    return;
  }

  const rows = [];
  for (let i = stopwatch.laps.length - 1; i >= 0; i -= 1) {
    const total = stopwatch.laps[i];
    const previous = i > 0 ? stopwatch.laps[i - 1] : 0;
    const split = total - previous;
    const latest = i === stopwatch.laps.length - 1;
    rows.push(`
      <li class="lap-row${latest ? ' is-latest' : ''}">
        <span class="lap-row__n">${pad(i + 1)}</span>
        <span>${formatStopwatch(split).main}.${formatStopwatch(split).cs}</span>
        <span>${formatStopwatch(total).main}.${formatStopwatch(total).cs}</span>
      </li>
    `);
  }
  ui.lapList.innerHTML = rows.join('');
}

/* ============================================================
   Alarms
   ============================================================ */
let editingAlarmId = null;
let selectedDays = new Set();
let draftSound = DEFAULT_ALARM_SOUND;
let draftCustomSound = '';
let draftCustomSoundName = '';
let alarmPreviewAudio = null;
let alarmPreviewKey = '';
let permissionRefreshTimer = 0;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function makeAlarmId() {
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeAlarm(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const hour = Math.round(Number(raw.hour));
  const minute = Math.round(Number(raw.minute));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const days = Array.isArray(raw.days)
    ? Array.from(new Set(raw.days.map(Number).filter((day) => day >= 0 && day <= 6))).sort()
    : [];
  const once = days.length === 0;
  const at = Number(raw.at);
  const customSound = typeof raw.customSound === 'string' ? raw.customSound.slice(0, 120) : '';
  const customSoundName = typeof raw.customSoundName === 'string' ? raw.customSoundName.slice(0, 60) : '';
  let sound = typeof raw.sound === 'string' ? raw.sound : DEFAULT_ALARM_SOUND;
  if (sound === CUSTOM_ALARM_SOUND && !customSound) sound = DEFAULT_ALARM_SOUND;
  if (sound !== CUSTOM_ALARM_SOUND && !ALARM_SOUND_IDS.has(sound)) sound = DEFAULT_ALARM_SOUND;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : makeAlarmId(),
    hour: clamp(hour, 0, 23),
    minute: clamp(minute, 0, 59),
    label: typeof raw.label === 'string' ? raw.label.slice(0, 32) : '',
    enabled: raw.enabled !== false,
    days,
    once,
    at: once && Number.isFinite(at) ? at : 0,
    sound,
    customSound: sound === CUSTOM_ALARM_SOUND ? customSound : '',
    customSoundName: sound === CUSTOM_ALARM_SOUND ? customSoundName : '',
  };
}

function nextOneTime(hour, minute, from = new Date()) {
  const candidate = new Date(from.getFullYear(), from.getMonth(), from.getDate(), hour, minute, 0, 0);
  if (candidate.getTime() <= from.getTime()) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

function nextOccurrence(alarm, from = new Date()) {
  if (!alarm || !alarm.enabled) return null;

  if (alarm.days && alarm.days.length > 0) {
    for (let offset = 0; offset <= 7; offset += 1) {
      const candidate = new Date(
        from.getFullYear(), from.getMonth(), from.getDate() + offset,
        alarm.hour, alarm.minute, 0, 0,
      );
      if (candidate.getTime() <= from.getTime()) continue;
      if (alarm.days.includes(candidate.getDay())) return candidate;
    }
    return null;
  }

  if (alarm.at && alarm.at > from.getTime()) return new Date(alarm.at);
  return null;
}

function formatNextShort(date) {
  if (!date) return 'Not set';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = Math.round((target - today) / 86400000);
  const day = offset === 0 ? 'Today'
    : offset === 1 ? 'Tomorrow'
      : new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
  const period = state.format24 ? '' : ` ${date.getHours() < 12 ? 'AM' : 'PM'}`;
  return `${day} ${fmtHM(date.getHours(), date.getMinutes())}${period}`;
}

function relativeNext(date) {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'now';
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  if (hours < 24) return `in ${hours}h${remainderMinutes ? ` ${remainderMinutes}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `in ${days}d${hours % 24 ? ` ${hours % 24}h` : ''}`;
}

function repeatSummary(days) {
  if (!days || days.length === 0) return 'Once';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) return 'Weekdays';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
  return DAY_ORDER.filter((day) => days.includes(day)).map((day) => DAY_NAMES[day]).join(', ');
}

function alarmSoundById(id) {
  return ALARM_SOUNDS.find((sound) => sound.id === id) || ALARM_SOUNDS[0];
}

function alarmSoundInfo(alarm) {
  if (!alarm) return { label: ALARM_SOUNDS[0].name, custom: false };
  if (alarm.sound === CUSTOM_ALARM_SOUND) {
    return { label: alarm.customSoundName || 'Custom music', custom: true };
  }
  return { label: alarmSoundById(alarm.sound).name, custom: false };
}

function alarmSoundSrc(sound, customSound) {
  if (sound === CUSTOM_ALARM_SOUND && customSound) {
    return `/custom-sounds/${encodeURIComponent(customSound)}`;
  }
  const id = ALARM_SOUND_IDS.has(sound) ? sound : DEFAULT_ALARM_SOUND;
  return `alarm-sounds/${id}.wav`;
}

function populateAlarmSounds() {
  if (!ui.alarmSound) return;
  const options = ALARM_SOUNDS.map((sound) =>
    `<option value="${escapeHTML(sound.id)}">${escapeHTML(sound.name)} — ${escapeHTML(sound.note)}</option>`);
  options.push(`<option value="${CUSTOM_ALARM_SOUND}">Custom music…</option>`);
  ui.alarmSound.innerHTML = options.join('');
}

function stopAlarmPreview() {
  if (alarmPreviewAudio) {
    try {
      alarmPreviewAudio.pause();
      alarmPreviewAudio.currentTime = 0;
    } catch {
      /* the audio element may already be released */
    }
    alarmPreviewAudio = null;
  }
  alarmPreviewKey = '';
  if (!ui.alarmSoundPreview) return;
  ui.alarmSoundPreview.classList.remove('is-playing');
  ui.alarmSoundPreview.setAttribute('aria-pressed', 'false');
  const label = ui.alarmSoundPreview.querySelector('span');
  if (label) label.textContent = 'Preview';
}

function toggleAlarmPreview() {
  if (!ui.alarmSoundPreview) return;
  const key = draftSound === CUSTOM_ALARM_SOUND
    ? `${CUSTOM_ALARM_SOUND}:${draftCustomSound}`
    : draftSound;

  if (alarmPreviewAudio && alarmPreviewKey === key) {
    stopAlarmPreview();
    return;
  }
  if (draftSound === CUSTOM_ALARM_SOUND && !draftCustomSound) {
    toast('Choose an audio file to preview custom music.');
    return;
  }

  stopAlarmPreview();
  let audio;
  try {
    audio = new Audio(alarmSoundSrc(draftSound, draftCustomSound));
  } catch {
    toast('Preview is unavailable on this device.');
    return;
  }

  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.85;
  audio.addEventListener('error', () => {
    if (alarmPreviewAudio === audio) stopAlarmPreview();
    toast('That sound could not be played.');
  });

  alarmPreviewAudio = audio;
  alarmPreviewKey = key;
  ui.alarmSoundPreview.classList.add('is-playing');
  ui.alarmSoundPreview.setAttribute('aria-pressed', 'true');
  const label = ui.alarmSoundPreview.querySelector('span');
  if (label) label.textContent = 'Stop';

  const play = audio.play();
  if (play && typeof play.catch === 'function') {
    play.catch(() => {
      if (alarmPreviewAudio === audio) stopAlarmPreview();
      toast('Tap Preview again to allow audio.');
    });
  }
}

function syncAlarmSoundUI() {
  if (!ui.alarmSound) return;
  if (draftSound !== CUSTOM_ALARM_SOUND && !ALARM_SOUND_IDS.has(draftSound)) {
    draftSound = DEFAULT_ALARM_SOUND;
  }
  const custom = draftSound === CUSTOM_ALARM_SOUND;
  ui.alarmSound.value = draftSound;
  ui.alarmCustom.hidden = !custom;
  if (custom) {
    setText(ui.alarmCustomName, draftCustomSoundName || (draftCustomSound ? 'Custom music' : 'No file selected'));
  }
  ui.alarmSoundPreview.disabled = custom && !draftCustomSound;
  const key = custom ? `${CUSTOM_ALARM_SOUND}:${draftCustomSound}` : draftSound;
  if (alarmPreviewAudio && alarmPreviewKey !== key) stopAlarmPreview();
}

function chooseAlarmSound() {
  const bridge = window.ShumanAndroid;
  if (!bridge || typeof bridge.pickAlarmSound !== 'function') {
    toast('Custom alarm music is available in the Android app.');
    return;
  }
  stopAlarmPreview();
  try {
    bridge.pickAlarmSound();
  } catch {
    toast('Could not open the audio picker.');
  }
}

function handleCustomSoundResult(payload) {
  let result = payload;
  if (typeof payload === 'string') {
    try {
      result = JSON.parse(payload);
    } catch {
      result = null;
    }
  }
  if (!result || result.ok === false || !result.file) {
    toast(result && result.error ? String(result.error) : 'No audio file imported.');
    return;
  }

  const file = String(result.file).slice(0, 120);
  if (!file) {
    toast('No audio file imported.');
    return;
  }
  draftSound = CUSTOM_ALARM_SOUND;
  draftCustomSound = file;
  draftCustomSoundName = String(result.name || 'Custom music').slice(0, 60);
  stopAlarmPreview();
  syncAlarmSoundUI();
  toast(`${draftCustomSoundName} is ready. Preview it, then save the alarm.`);
}

function timeParts(hour, minute) {
  return {
    main: fmtHM(hour, minute),
    period: state.format24 ? '' : hour < 12 ? 'AM' : 'PM',
  };
}

function sortAlarms(alarms) {
  return alarms.slice().sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
}

function persistAlarms(message) {
  store.set('alarms', state.alarms);
  renderAlarms();
  syncAlarmsToNative();
  if (message) toast(message);
}

function renderAlarms() {
  const alarms = sortAlarms(state.alarms);
  ui.alarmCount.textContent = String(alarms.length);
  ui.alarmEmpty.hidden = alarms.length > 0;

  ui.alarmList.innerHTML = alarms.map((alarm) => {
    const time = timeParts(alarm.hour, alarm.minute);
    const next = nextOccurrence(alarm);
    const meta = [
      alarm.label ? escapeHTML(alarm.label) : 'Alarm',
      repeatSummary(alarm.days),
      escapeHTML(alarmSoundInfo(alarm).label),
      alarm.enabled && next ? relativeNext(next) : alarm.enabled ? 'Missed' : 'Off',
    ].join(' · ');

    return `
      <article class="alarm-item${alarm.enabled ? '' : ' is-off'}${editingAlarmId === alarm.id ? ' is-editing' : ''}" data-id="${escapeHTML(alarm.id)}">
        <button class="switch${alarm.enabled ? ' is-on' : ''}" type="button" role="switch" aria-checked="${alarm.enabled ? 'true' : 'false'}" aria-label="${alarm.enabled ? 'Turn off' : 'Turn on'} alarm at ${time.main}" data-action="toggle">
          <span class="switch__knob"></span>
        </button>
        <div class="alarm-item__body">
          <div class="alarm-item__time">${time.main}${time.period ? `<span>${time.period}</span>` : ''}</div>
          <div class="alarm-item__meta">${meta}</div>
        </div>
        <div class="alarm-item__actions">
          <button class="alarm-icon-btn" type="button" data-action="edit" aria-label="Edit alarm at ${time.main}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="M13.5 8.5l2 2" /></svg>
          </button>
          <button class="alarm-icon-btn alarm-icon-btn--danger" type="button" data-action="delete" aria-label="Delete alarm at ${time.main}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
          </button>
        </div>
      </article>
    `;
  }).join('');

  updateNextAlarmChip();
}

function updateNextAlarmChip() {
  const next = state.alarms
    .filter((alarm) => alarm.enabled)
    .map((alarm) => nextOccurrence(alarm))
    .filter(Boolean)
    .sort((a, b) => a - b)[0];
  setText(ui.nextAlarm, next ? formatNextShort(next) : 'Not set');
}

function updateAlarmView(now) {
  const time = timeParts(now.getHours(), now.getMinutes());
  setText(ui.alarmClockTime, time.main);
  if (state.format24) {
    ui.alarmClockPeriod.hidden = true;
  } else {
    ui.alarmClockPeriod.hidden = false;
    setText(ui.alarmClockPeriod, time.period);
  }
  setText(ui.alarmDate, dateLong.format(now));
  updateNextAlarmChip();
}

function updateDayChips() {
  $$('.day-chip', ui.alarmDays).forEach((chip) => {
    const active = selectedDays.has(Number(chip.dataset.day));
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if (selectedDays.size === 0) {
    setText(ui.alarmRepeatHint, 'No days selected — rings once.');
  } else if (selectedDays.size === 7) {
    setText(ui.alarmRepeatHint, 'Rings every day.');
  } else {
    setText(ui.alarmRepeatHint, `Rings on ${repeatSummary(Array.from(selectedDays))}.`);
  }
}

function resetAlarmEditor() {
  editingAlarmId = null;
  selectedDays = new Set();
  draftSound = DEFAULT_ALARM_SOUND;
  draftCustomSound = '';
  draftCustomSoundName = '';
  ui.alarmLabel.value = '';
  ui.alarmSave.textContent = 'Set alarm';
  ui.alarmCancel.hidden = true;
  updateDayChips();
  stopAlarmPreview();
  syncAlarmSoundUI();
  renderAlarms();
}

function beginEditAlarm(id) {
  const alarm = state.alarms.find((item) => item.id === id);
  if (!alarm) return;
  editingAlarmId = id;
  selectedDays = new Set(alarm.days);
  draftSound = alarm.sound || DEFAULT_ALARM_SOUND;
  draftCustomSound = alarm.customSound || '';
  draftCustomSoundName = alarm.customSoundName || '';
  ui.alarmTime.value = `${pad(alarm.hour)}:${pad(alarm.minute)}`;
  ui.alarmLabel.value = alarm.label;
  ui.alarmSave.textContent = 'Save changes';
  ui.alarmCancel.hidden = false;
  updateDayChips();
  stopAlarmPreview();
  syncAlarmSoundUI();
  renderAlarms();
  ui.alarmTime.focus({ preventScroll: false });
}

function saveAlarmFromEditor() {
  const rawTime = ui.alarmTime.value || '07:00';
  const [hourText, minuteText] = rawTime.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    toast('Choose a valid alarm time.');
    return;
  }

  const days = Array.from(selectedDays).sort();
  const label = ui.alarmLabel.value.trim().slice(0, 32);
  if (draftSound === CUSTOM_ALARM_SOUND && !draftCustomSound) {
    toast('Choose an audio file for the custom alarm music.');
    return;
  }
  const existing = editingAlarmId ? state.alarms.find((alarm) => alarm.id === editingAlarmId) : null;
  const alarm = normalizeAlarm({
    id: existing ? existing.id : makeAlarmId(),
    hour,
    minute,
    label,
    days,
    enabled: true,
    at: days.length === 0 ? nextOneTime(hour, minute).getTime() : 0,
    sound: draftSound,
    customSound: draftCustomSound,
    customSoundName: draftCustomSoundName,
  });

  if (!alarm) {
    toast('That alarm could not be saved.');
    return;
  }

  if (existing) {
    state.alarms = state.alarms.map((item) => item.id === alarm.id ? alarm : item);
  } else {
    state.alarms.push(alarm);
  }

  editingAlarmId = null;
  selectedDays = new Set();
  draftSound = DEFAULT_ALARM_SOUND;
  draftCustomSound = '';
  draftCustomSoundName = '';
  ui.alarmLabel.value = '';
  ui.alarmSave.textContent = 'Set alarm';
  ui.alarmCancel.hidden = true;
  updateDayChips();
  stopAlarmPreview();
  syncAlarmSoundUI();
  persistAlarms(existing ? 'Alarm updated.' : 'Alarm set.');
  refreshAlarmPermissions();
}

function toggleAlarm(id) {
  const alarm = state.alarms.find((item) => item.id === id);
  if (!alarm) return;
  alarm.enabled = !alarm.enabled;
  if (alarm.enabled && alarm.once) {
    const next = nextOccurrence({ ...alarm, enabled: true }, new Date());
    alarm.at = next ? next.getTime() : nextOneTime(alarm.hour, alarm.minute).getTime();
  }
  persistAlarms(alarm.enabled ? 'Alarm on.' : 'Alarm off.');
}

function deleteAlarm(id) {
  const alarm = state.alarms.find((item) => item.id === id);
  if (!alarm) return;
  state.alarms = state.alarms.filter((item) => item.id !== id);
  if (editingAlarmId === id) {
    editingAlarmId = null;
    selectedDays = new Set();
    draftSound = DEFAULT_ALARM_SOUND;
    draftCustomSound = '';
    draftCustomSoundName = '';
    ui.alarmLabel.value = '';
    ui.alarmSave.textContent = 'Set alarm';
    ui.alarmCancel.hidden = true;
    updateDayChips();
    stopAlarmPreview();
    syncAlarmSoundUI();
  }
  persistAlarms('Alarm deleted.');
}

function alarmBridge() {
  const bridge = window.ShumanAndroid;
  return bridge && typeof bridge.syncAlarms === 'function' ? bridge : null;
}

function syncAlarmsToNative() {
  const bridge = alarmBridge();
  if (!bridge) return;
  try {
    bridge.syncAlarms(JSON.stringify(state.alarms));
  } catch {
    /* the web app still keeps alarms locally */
  }
}

function consumeNativeAlarmEvents() {
  const bridge = alarmBridge();
  if (!bridge || typeof bridge.consumeAlarmEvents !== 'function') return;
  let events = [];
  try {
    const raw = bridge.consumeAlarmEvents();
    events = raw ? JSON.parse(raw) : [];
  } catch {
    return;
  }
  if (!Array.isArray(events) || events.length === 0) return;

  let changed = false;
  events.forEach((event) => {
    const alarm = state.alarms.find((item) => item.id === event.id);
    if (!alarm) return;
    if (event.action === 'dismiss' && alarm.once) {
      alarm.enabled = false;
      changed = true;
    }
    if (event.action === 'snooze' && Number.isFinite(Number(event.at)) && alarm.once) {
      alarm.enabled = true;
      alarm.at = Number(event.at);
      changed = true;
    }
  });

  if (changed) {
    store.set('alarms', state.alarms);
    renderAlarms();
  }
}

function refreshAlarmsFromNative() {
  consumeNativeAlarmEvents();
  syncAlarmsToNative();
  renderAlarms();
  updateAlarmView(new Date());
}

function refreshAlarmPermissions() {
  const bridge = alarmBridge();
  if (!bridge || typeof bridge.alarmPermissionStatus !== 'function') {
    ui.alarmPermissionStatus.textContent = 'Alarms ring while shuman is open. Install the Android app for closed-app alarms.';
    ui.alarmPermissionStatus.classList.remove('is-ok');
    ui.alarmPermission.disabled = true;
    ui.alarmPermission.textContent = 'Android app only';
    return;
  }

  let permissions = {};
  try {
    permissions = JSON.parse(bridge.alarmPermissionStatus() || '{}');
  } catch {
    permissions = {};
  }

  const notifications = permissions.notifications !== false;
  const exact = permissions.exact !== false;
  const fullscreen = permissions.fullscreen !== false;
  const missing = [];
  if (!notifications) missing.push('notifications');
  if (!exact) missing.push('exact alarm access');
  if (!fullscreen) missing.push('full-screen alerts');

  ui.alarmPermission.disabled = false;
  if (missing.length === 0) {
    ui.alarmPermission.textContent = 'Alarms allowed';
    ui.alarmPermissionStatus.textContent = 'All set — alarms can ring even when shuman is closed.';
    ui.alarmPermissionStatus.classList.add('is-ok');
  } else {
    ui.alarmPermission.textContent = 'Allow alarms';
    ui.alarmPermissionStatus.textContent = `Needs ${missing.join(' + ')}.`;
    ui.alarmPermissionStatus.classList.remove('is-ok');
  }
}

function requestAlarmPermissions() {
  const bridge = alarmBridge();
  if (!bridge || typeof bridge.requestAlarmPermissions !== 'function') {
    toast('Open shuman on Android to enable closed-app alarms.');
    return;
  }
  try {
    bridge.requestAlarmPermissions();
  } catch {
    /* permission screens may be unavailable */
  }
  clearTimeout(permissionRefreshTimer);
  permissionRefreshTimer = setTimeout(refreshAlarmPermissions, 700);
  setTimeout(refreshAlarmPermissions, 2600);
}

/* ============================================================
   Personalization
   ============================================================ */
let lastPersonalizeFocus = null;

function setThemeMode(mode) {
  if (!THEME_MODES.includes(mode)) return;
  state.themeMode = mode;
  state.theme = mode === 'auto'
    ? (systemThemeQuery.matches ? 'dark' : 'light')
    : mode;
  store.set('themeMode', state.themeMode);
  store.set('theme', state.theme);
  applyPreferences();
  if (!ui.zenOverlay.hidden) updateZen(new Date());
}

function setAccent(accent) {
  if (accent !== 'custom' && !PALETTES[accent]) return;
  state.accent = accent;
  store.set('accent', state.accent);
  applyPreferences();
  lastWordKey = '';
}

function setCustomAccent(hex) {
  const color = normalizeHex(hex);
  if (!color) return;
  state.customAccent = color;
  state.accent = 'custom';
  store.set('customAccent', state.customAccent);
  store.set('accent', state.accent);
  applyPreferences();
}

function setFace(face) {
  if (!FACES.includes(face)) return;
  state.face = face;
  store.set('face', state.face);
  applyPreferences();
}

function setBackdrop(backdrop) {
  if (!BACKDROPS.includes(backdrop)) return;
  state.backdrop = backdrop;
  store.set('backdrop', state.backdrop);
  applyPreferences();
}

function setLiving(enabled) {
  state.living = Boolean(enabled);
  store.set('living', state.living);
  applyPreferences();
  toast(state.living ? 'Living colour on — the accent will drift.' : 'Living colour off.');
}

function setSignature(value) {
  state.signature = String(value || '').slice(0, 40);
  store.set('signature', state.signature);
  syncSignature();
}

function setMotion(enabled) {
  state.motion = enabled ? 'full' : 'reduced';
  store.set('motion', state.motion);
  applyPreferences();
  toast(enabled ? 'Motion on.' : 'Reduced motion on.');
}

function setStarfield(enabled) {
  state.starfield = Boolean(enabled);
  store.set('starfield', state.starfield);
  applyPreferences();
}

function applyMood(name) {
  const mood = MOODS[name];
  if (!mood) return;
  state.themeMode = mood.themeMode;
  state.theme = mood.themeMode === 'auto'
    ? (systemThemeQuery.matches ? 'dark' : 'light')
    : mood.themeMode;
  state.accent = mood.accent;
  state.face = mood.face;
  state.backdrop = mood.backdrop;
  state.starfield = mood.starfield;
  state.living = mood.living;
  ['themeMode', 'theme', 'accent', 'face', 'backdrop', 'starfield', 'living'].forEach((key) => {
    store.set(key, state[key]);
  });
  applyPreferences();
  if (!ui.zenOverlay.hidden) updateZen(new Date());
  toast(`${mood.label} mood applied.`);
}

function openPersonalize() {
  lastPersonalizeFocus = document.activeElement;
  ui.personalizeSheet.hidden = false;
  document.body.classList.add('no-scroll');
  syncPersonalizationUI();
  const close = $('.sheet__close', ui.personalizeSheet);
  if (close) close.focus();
}

function closePersonalize() {
  ui.personalizeSheet.hidden = true;
  document.body.classList.remove('no-scroll');
  if (lastPersonalizeFocus && typeof lastPersonalizeFocus.focus === 'function') lastPersonalizeFocus.focus();
}

function resetPersonalization() {
  state.themeMode = 'dark';
  state.theme = 'dark';
  state.accent = 'gold';
  state.customAccent = DEFAULT_CUSTOM_ACCENT;
  state.face = 'heritage';
  state.backdrop = 'aurora';
  state.motion = 'full';
  state.starfield = true;
  state.living = false;
  state.signature = '';
  ['themeMode', 'theme', 'accent', 'customAccent', 'face', 'backdrop', 'motion', 'starfield', 'living', 'signature'].forEach((key) => {
    store.set(key, state[key]);
  });
  if (ui.signatureInput) ui.signatureInput.value = '';
  applyPreferences();
  toast('Personalization reset.');
}

/* ============================================================
   Event wiring
   ============================================================ */
function bindEvents() {
  ui.formatToggle.addEventListener('click', () => {
    state.format24 = !state.format24;
    store.set('format24', state.format24);
    ui.formatToggle.textContent = state.format24 ? '24H' : '12H';
    ui.formatToggle.setAttribute('aria-label', state.format24 ? 'Use 12-hour time' : 'Use 24-hour time');
    lastWordKey = '';
    const now = new Date();
    updateHero(now);
    updateWordClock(now);
    updateWorldClocks(now);
    if (!ui.zenOverlay.hidden) updateZen(now);
  });

  ui.themeToggle.addEventListener('click', () => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  });

  $$('.swatch').forEach((button) => {
    button.addEventListener('click', () => setAccent(button.dataset.accent));
  });

  $$('.face-btn').forEach((button) => {
    button.addEventListener('click', () => setFace(button.dataset.face));
  });

  ui.personalizeBtn.addEventListener('click', openPersonalize);
  $$('[data-sheet-close]', ui.personalizeSheet).forEach((button) => {
    button.addEventListener('click', closePersonalize);
  });
  $$('.mode-btn', ui.themeModes).forEach((button) => {
    button.addEventListener('click', () => setThemeMode(button.dataset.themeMode));
  });
  $$('.accent-chip', ui.accentGrid).forEach((button) => {
    button.addEventListener('click', () => setAccent(button.dataset.accent));
  });
  ui.accentColor.addEventListener('input', () => setCustomAccent(ui.accentColor.value));
  $$('.face-choice', ui.faceChoices).forEach((button) => {
    button.addEventListener('click', () => setFace(button.dataset.face));
  });
  $$('.backdrop-choice', ui.backdropChoices).forEach((button) => {
    button.addEventListener('click', () => setBackdrop(button.dataset.backdrop));
  });
  $$('.mood-chip', ui.moodGrid).forEach((button) => {
    button.addEventListener('click', () => applyMood(button.dataset.mood));
  });
  ui.livingToggle.addEventListener('click', () => setLiving(!state.living));
  ui.signatureInput.addEventListener('input', () => setSignature(ui.signatureInput.value));
  ui.motionToggle.addEventListener('click', () => setMotion(state.motion === 'reduced'));
  ui.starfieldToggle.addEventListener('click', () => setStarfield(!state.starfield));
  ui.personalizeReset.addEventListener('click', resetPersonalization);

  /* Alarms */
  $$('.day-chip', ui.alarmDays).forEach((chip) => {
    chip.addEventListener('click', () => {
      const day = Number(chip.dataset.day);
      if (selectedDays.has(day)) selectedDays.delete(day);
      else selectedDays.add(day);
      updateDayChips();
    });
  });
  ui.alarmSound.addEventListener('change', () => {
    const next = ui.alarmSound.value;
    draftSound = next === CUSTOM_ALARM_SOUND
      ? CUSTOM_ALARM_SOUND
      : ALARM_SOUND_IDS.has(next) ? next : DEFAULT_ALARM_SOUND;
    stopAlarmPreview();
    syncAlarmSoundUI();
  });
  ui.alarmSoundPreview.addEventListener('click', toggleAlarmPreview);
  ui.alarmCustomPick.addEventListener('click', chooseAlarmSound);
  ui.alarmSave.addEventListener('click', saveAlarmFromEditor);
  ui.alarmCancel.addEventListener('click', resetAlarmEditor);
  ui.alarmTime.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveAlarmFromEditor();
    }
  });
  ui.alarmLabel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveAlarmFromEditor();
    }
  });
  ui.alarmList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const item = button.closest('.alarm-item');
    if (!item) return;
    const id = item.dataset.id;
    if (button.dataset.action === 'toggle') toggleAlarm(id);
    else if (button.dataset.action === 'edit') beginEditAlarm(id);
    else if (button.dataset.action === 'delete') deleteAlarm(id);
  });
  ui.alarmPermission.addEventListener('click', requestAlarmPermissions);

  window.addEventListener('focus', () => {
    if (activeView === 'alarm') refreshAlarmPermissions();
  });

  ui.soundToggle.addEventListener('click', () => setAmbient(!state.ambient, true));
  ui.ambientSwitch.addEventListener('click', () => setAmbient(!state.ambient, true));
  ui.ambientShortcut.addEventListener('click', () => setAmbient(!state.ambient, true));
  ui.chimeTest.addEventListener('click', () => playChime(true));
  ui.chimeSwitch.addEventListener('click', () => {
    state.chime = !state.chime;
    store.set('chime', state.chime);
    syncChimeUI();
  });

  ui.zenBtn.addEventListener('click', openZen);
  ui.zenClose.addEventListener('click', closeZen);
  ui.zenOverlay.addEventListener('click', (event) => {
    if (event.target === ui.zenOverlay) closeZen();
  });
  ui.copyBtn.addEventListener('click', copyTime);

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const index = VIEWS.indexOf(activeView);
      const offset = event.key === 'ArrowRight' ? 1 : VIEWS.length - 1;
      const next = VIEWS[(index + offset) % VIEWS.length];
      switchView(next);
      $(`#tab-${next}`).focus();
    });
  });

  $$('[data-view-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      switchView(link.dataset.viewLink);
    });
  });

  window.addEventListener('hashchange', () => {
    const view = location.hash.replace('#', '');
    if (VIEWS.includes(view) && view !== activeView) switchView(view, { updateHash: false });
  });

  /* Timer */
  $$('.preset', ui.timerPresets).forEach((button) => {
    button.addEventListener('click', () => {
      setTimerDuration(Number(button.dataset.min) * 60000);
    });
  });
  ui.setCustom.addEventListener('click', applyCustomTimer);
  ui.customMinutes.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyCustomTimer();
    }
  });
  ui.timerStart.addEventListener('click', () => {
    if (timerCountdown.running) timerCountdown.pause();
    else timerCountdown.start();
  });
  ui.timerReset.addEventListener('click', () => {
    timerCountdown.reset(timerCountdown.duration);
    syncTimerUI();
  });
  ui.timerName.addEventListener('input', () => {
    state.timerName = ui.timerName.value;
    store.set('timerName', state.timerName);
    setText(ui.timerLabel, timerLabelText());
  });

  /* Focus */
  $$('.seg__btn', ui.pomoModes).forEach((button) => {
    button.addEventListener('click', () => setPomoMode(button.dataset.mode));
  });
  ui.pomoStart.addEventListener('click', () => {
    if (pomoCountdown.running) pomoCountdown.pause();
    else pomoCountdown.start();
  });
  ui.pomoReset.addEventListener('click', () => {
    pomoCountdown.reset(pomoCountdown.duration);
    syncPomoChrome();
  });
  ui.intentionInput.addEventListener('input', () => {
    state.intention = ui.intentionInput.value;
    store.set('intention', state.intention);
    syncIntention();
  });

  /* Stopwatch */
  ui.swToggle.addEventListener('click', toggleStopwatch);
  ui.swLap.addEventListener('click', recordLap);
  ui.swReset.addEventListener('click', resetStopwatch);

  window.addEventListener('resize', resizeStars);
  systemThemeQuery.addEventListener('change', () => {
    if (state.themeMode !== 'auto') return;
    state.theme = systemThemeQuery.matches ? 'dark' : 'light';
    applyPreferences();
    if (!ui.zenOverlay.hidden) updateZen(new Date());
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!ui.personalizeSheet.hidden) {
        event.preventDefault();
        closePersonalize();
        return;
      }
      if (!ui.zenOverlay.hidden) {
        event.preventDefault();
        closeZen();
      }
      return;
    }

    const target = event.target;
    const typing = target && (target.matches('input, textarea, select') || target.isContentEditable);
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

    const key = event.key.toLowerCase();
    if (key === 'p') {
      event.preventDefault();
      if (ui.personalizeSheet.hidden) openPersonalize();
      else closePersonalize();
      return;
    }
    if (key === 'z') {
      event.preventDefault();
      toggleZen();
      return;
    }
    if (!ui.zenOverlay.hidden || !ui.personalizeSheet.hidden) return;
    if (key === 's') {
      event.preventDefault();
      setAmbient(!state.ambient, true);
      return;
    }
    if (/^[1-6]$/.test(event.key)) {
      switchView(VIEWS[Number(event.key) - 1]);
      return;
    }

    const interactive = target && target.closest && target.closest('button, a, [role="button"], [role="switch"], [role="tab"]');
    if (activeView === 'stopwatch' && !interactive) {
      if (event.code === 'Space') {
        event.preventDefault();
        toggleStopwatch();
      } else if (key === 'l') {
        event.preventDefault();
        recordLap();
      }
    }
  });
}

/* ============================================================
   Boot
   ============================================================ */
function init() {
  state.alarms = state.alarms.map(normalizeAlarm).filter(Boolean);
  state.alarms.forEach((alarm) => {
    if (alarm.once && alarm.enabled && alarm.at && alarm.at < Date.now() - 300000) {
      alarm.enabled = false;
    }
  });
  store.set('alarms', state.alarms);

  applyPreferences();
  buildClockFace();
  buildWorldClocks();
  buildBinaryClock();
  buildCycles();
  buildPomoDots();

  syncSoundUI();
  syncChimeUI();
  syncTimerName();
  syncIntention();
  updateFocusStats();
  syncPomoChrome();
  syncTimerUI();
  renderStopwatch();
  renderLaps();
  syncStopwatchUI();

  updateDayChips();
  populateAlarmSounds();
  syncAlarmSoundUI();
  renderAlarms();
  updateAlarmView(new Date());
  consumeNativeAlarmEvents();
  syncAlarmsToNative();
  refreshAlarmPermissions();
  window.addEventListener('shuman:permissions', refreshAlarmPermissions);

  window.shumanCustomSound = handleCustomSoundResult;
  window.shumanCustomSoundCancelled = () => {};

  window.shuman = {
    openAlarmView() {
      switchView('alarm');
    },
    refreshPermissions: refreshAlarmPermissions,
    refreshAlarms: refreshAlarmsFromNative,
  };

  bindEvents();

  const initialView = location.hash.replace('#', '');
  switchView(VIEWS.includes(initialView) ? initialView : 'clock', { updateHash: false });
  if (location.hash === '') {
    try {
      history.replaceState(null, '', '#clock');
    } catch {
      /* no-op */
    }
  }

  resizeStars();
  requestAnimationFrame(drawStars);

  let now = new Date();
  updateAnalogHands(now);
  updateHero(now);
  updateWorldClocks(now);
  updateWordClock(now);
  updateBinaryClock(now);
  updateCycles(now);

  let lastSecond = now.getSeconds();
  function clockLoop() {
    now = new Date();
    updateAnalogHands(now);
    if (now.getSeconds() !== lastSecond) {
      lastSecond = now.getSeconds();
      updateHero(now);
      updateWorldClocks(now);
      updateWordClock(now);
      updateBinaryClock(now);
      updateCycles(now);
      if (activeView === 'alarm') updateAlarmView(now);
    }
    requestAnimationFrame(clockLoop);
  }
  requestAnimationFrame(clockLoop);
}

init();


