/**
 * Universal Dynamic Colour Name-to-Colour System (Server CommonJS module)
 * Deterministic color inference and generation for arbitrary color names.
 */

// 1. Standard W3C CSS Named Colors (147 exact values)
const W3C_COLORS = {
  black: '#000000',
  silver: '#C0C0C0',
  gray: '#808080',
  grey: '#808080',
  white: '#FFFFFF',
  maroon: '#800000',
  red: '#FF0000',
  purple: '#800080',
  fuchsia: '#FF00FF',
  green: '#008000',
  lime: '#00FF00',
  olive: '#808000',
  yellow: '#FFFF00',
  navy: '#000080',
  blue: '#0000FF',
  teal: '#008080',
  aqua: '#00FFFF',
  orange: '#FFA500',
  aliceblue: '#F0F8FF',
  antiquewhite: '#FAEBD7',
  aquamarine: '#7FFFD4',
  azure: '#F0FFFF',
  beige: '#F5F5DC',
  bisque: '#FFE4C4',
  blanchedalmond: '#FFEBCD',
  blueviolet: '#8A2BE2',
  brown: '#A52A2A',
  burlywood: '#DEB887',
  cadetblue: '#5F9EA0',
  chartreuse: '#7FFF00',
  chocolate: '#D2691E',
  coral: '#FF7F50',
  cornflowerblue: '#6495ED',
  cornsilk: '#FFF8DC',
  crimson: '#DC143C',
  cyan: '#00FFFF',
  darkblue: '#00008B',
  darkcyan: '#008B8B',
  darkgoldenrod: '#B8860B',
  darkgray: '#A9A9A9',
  darkgrey: '#A9A9A9',
  darkgreen: '#006400',
  darkkhaki: '#BDB76B',
  darkmagenta: '#8B008B',
  darkolivegreen: '#556B2F',
  darkorange: '#FF8C00',
  darkorchid: '#9932CC',
  darkred: '#8B0000',
  darksalmon: '#E9967A',
  darkseagreen: '#8FBC8F',
  darkslateblue: '#483D8B',
  darkslategray: '#2F4F4F',
  darkslategrey: '#2F4F4F',
  darkturquoise: '#00CED1',
  darkviolet: '#9400D3',
  deeppink: '#FF1493',
  deepskyblue: '#00BFFF',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1E90FF',
  firebrick: '#B22222',
  floralwhite: '#FFFAF0',
  forestgreen: '#228B22',
  gainsboro: '#DCDCDC',
  ghostwhite: '#F8F8FF',
  gold: '#FFD700',
  goldenrod: '#DAA520',
  greenyellow: '#ADFF2F',
  honeydew: '#F0FFF0',
  hotpink: '#FF69B4',
  indianred: '#CD5C5C',
  indigo: '#4B0082',
  ivory: '#FFFFF0',
  khaki: '#F0E68C',
  lavender: '#E6E6FA',
  lavenderblush: '#FFF0F5',
  lawngreen: '#7CFC00',
  lemonchiffon: '#FFFACD',
  lightblue: '#ADD8E6',
  lightcoral: '#F08080',
  lightcyan: '#E0FFFF',
  lightgoldenrodyellow: '#FAFAD2',
  lightgray: '#D3D3D3',
  lightgrey: '#D3D3D3',
  lightgreen: '#90EE90',
  lightpink: '#FFB6C1',
  lightsalmon: '#FFA07A',
  lightseagreen: '#20B2AA',
  lightskyblue: '#87CEFA',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#B0C4DE',
  lightyellow: '#FFFFE0',
  limegreen: '#32CD32',
  linen: '#FAF0E6',
  magenta: '#FF00FF',
  mediumaquamarine: '#66CDAA',
  mediumblue: '#0000CD',
  mediumorchid: '#BA55D3',
  mediumpurple: '#9370DB',
  mediumseagreen: '#3CB371',
  mediumslateblue: '#7B68EE',
  mediumspringgreen: '#00FA9A',
  mediumturquoise: '#48D1CC',
  mediumvioletred: '#C71585',
  midnightblue: '#191970',
  mintcream: '#F5FFFA',
  mistyrose: '#FFE4E1',
  moccasin: '#FFE4B5',
  navajowhite: '#FFDEAD',
  oldlace: '#FDF5E6',
  olivedrab: '#6B8E23',
  orangered: '#FF4500',
  orchid: '#DA70D6',
  palegoldenrod: '#EEE8AA',
  palegreen: '#98FB98',
  paleturquoise: '#AFEEEE',
  palevioletred: '#DB7093',
  papayawhip: '#FFEFD5',
  peachpuff: '#FFDAB9',
  peru: '#CD853F',
  pink: '#FFC0CB',
  plum: '#DDA0DD',
  powderblue: '#B0E0E6',
  rosybrown: '#BC8F8F',
  royalblue: '#4169E1',
  saddlebrown: '#8B4513',
  salmon: '#FA8072',
  sandybrown: '#F4A460',
  seagreen: '#2E8B57',
  seashell: '#FFF5EE',
  sienna: '#A0522D',
  skyblue: '#87CEEB',
  slateblue: '#6A5ACD',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#FFFAFA',
  springgreen: '#00FF7F',
  steelblue: '#4682B4',
  tan: '#D2B48C',
  thistle: '#D8BFD8',
  tomato: '#FF6347',
  turquoise: '#40E0D0',
  violet: '#EE82EE',
  wheat: '#F5DEB3',
  whitesmoke: '#F5F5F5',
  yellowgreen: '#9ACD32'
};

// 2. Recognized Tech / Device Finishes & Standard descriptive shades
const TECH_BRAND_COLORS = {
  'space black': '#1C1C1C',
  'space gray': '#535150',
  'space grey': '#535150',
  'starlight': '#F5F5F4',
  'natural titanium': '#A39E99',
  'black titanium': '#232426',
  'white titanium': '#F2F1ED',
  'desert titanium': '#E6C2B9',
  'midnight': '#191F26',
  'deep purple': '#3B224C',
  'sierra blue': '#9BB5CE',
  'pacific blue': '#2D4E68',
  'alpine green': '#505C4E',
  'product red': '#E11C2A',
  '(product)red': '#E11C2A',
  'rose gold': '#E8C7B8',
  'chalk pink': '#E8B4B8',
  'sunset orange': '#FD5E53',
  'ocean mist blue': '#7BA0B5',
  'midnight titanium': '#25282D',
  'cosmic orange': '#D9A07A',
  'star white': '#FAFAFA',
  'night sky': '#353E4A',
  'glacier': '#E4EFFB',
  'ice blue': '#E4EFFB',
  'blush': '#E8D4D4',
  'citrus': '#E1E49C',
  'graphite': '#4C4A46',
  'ultramarine': '#3F58A8'
};

// 3. Base Hues for compound color parsing
const HUE_BASES = {
  red: { h: 0, s: 85, l: 52 },
  crimson: { h: 348, s: 83, l: 47 },
  scarlet: { h: 8, s: 90, l: 50 },
  ruby: { h: 350, s: 85, l: 45 },
  coral: { h: 16, s: 90, l: 60 },
  orange: { h: 28, s: 95, l: 52 },
  amber: { h: 38, s: 95, l: 50 },
  peach: { h: 20, s: 85, l: 75 },
  gold: { h: 45, s: 85, l: 55 },
  yellow: { h: 50, s: 95, l: 50 },
  lime: { h: 85, s: 85, l: 48 },
  olive: { h: 75, s: 50, l: 38 },
  green: { h: 140, s: 70, l: 45 },
  emerald: { h: 150, s: 75, l: 40 },
  mint: { h: 155, s: 65, l: 70 },
  teal: { h: 175, s: 75, l: 38 },
  cyan: { h: 190, s: 85, l: 48 },
  aqua: { h: 180, s: 90, l: 48 },
  blue: { h: 215, s: 85, l: 52 },
  sky: { h: 200, s: 80, l: 65 },
  sapphire: { h: 220, s: 85, l: 45 },
  navy: { h: 225, s: 75, l: 25 },
  indigo: { h: 245, s: 75, l: 48 },
  violet: { h: 270, s: 75, l: 55 },
  purple: { h: 280, s: 75, l: 50 },
  lavender: { h: 260, s: 60, l: 75 },
  plum: { h: 305, s: 45, l: 35 },
  magenta: { h: 300, s: 85, l: 50 },
  pink: { h: 340, s: 80, l: 72 },
  rose: { h: 345, s: 75, l: 65 },
  burgundy: { h: 345, s: 65, l: 28 },
  maroon: { h: 0, s: 70, l: 25 },
  brown: { h: 25, s: 60, l: 35 },
  bronze: { h: 35, s: 55, l: 45 },
  copper: { h: 20, s: 65, l: 50 },
  titanium: { h: 215, s: 8, l: 58 },
  silver: { h: 210, s: 8, l: 78 },
  charcoal: { h: 210, s: 10, l: 26 },
  gray: { h: 210, s: 6, l: 55 },
  grey: { h: 210, s: 6, l: 55 },
  black: { h: 0, s: 0, l: 12 },
  white: { h: 0, s: 0, l: 96 }
};

// 4. Modifiers adjusting Lightness, Saturation, and Hue
const MODIFIERS = {
  chalk: (c) => { c.s *= 0.6; c.l = Math.min(85, c.l * 1.25 + 8); },
  mist: (c) => { c.s *= 0.65; c.l = Math.min(82, c.l * 1.18 + 6); },
  ocean: (c) => { c.h = (c.h + 195) / 2; c.s = Math.min(90, c.s * 1.1); },
  sunset: (c) => { c.h = (c.h + 20) / 2; c.s = Math.min(100, c.s * 1.25); c.l = Math.max(45, Math.min(60, c.l)); },
  midnight: (c) => { c.l = Math.max(14, c.l * 0.42); c.s = Math.max(15, c.s * 0.7); },
  pale: (c) => { c.s *= 0.65; c.l = Math.min(88, c.l * 1.25 + 10); },
  light: (c) => { c.s *= 0.8; c.l = Math.min(86, c.l * 1.2 + 8); },
  soft: (c) => { c.s *= 0.7; c.l = Math.min(85, c.l * 1.15 + 8); },
  pastel: (c) => { c.s *= 0.65; c.l = Math.min(85, c.l * 1.2 + 10); },
  dark: (c) => { c.l = Math.max(18, c.l * 0.6); c.s = Math.min(95, c.s * 1.1); },
  deep: (c) => { c.l = Math.max(16, c.l * 0.55); c.s = Math.min(95, c.s * 1.15); },
  neon: (c) => { c.s = 100; c.l = Math.max(48, Math.min(60, c.l)); },
  electric: (c) => { c.s = 100; c.l = Math.max(50, Math.min(62, c.l)); },
  vivid: (c) => { c.s = Math.min(100, c.s * 1.3); },
  bright: (c) => { c.s = Math.min(100, c.s * 1.25); c.l = Math.min(65, c.l * 1.15); },
  smoky: (c) => { c.s *= 0.45; c.l = Math.max(25, Math.min(65, c.l)); },
  smoke: (c) => { c.s *= 0.45; c.l = Math.max(25, Math.min(65, c.l)); },
  dusty: (c) => { c.s *= 0.5; c.l = Math.max(30, Math.min(70, c.l)); },
  matte: (c) => { c.s *= 0.55; },
  metallic: (c) => { c.s = Math.max(6, c.s * 0.25); c.l = Math.max(28, Math.min(72, c.l)); },
  metal: (c) => { c.s = Math.max(6, c.s * 0.25); c.l = Math.max(28, Math.min(72, c.l)); },
  steel: (c) => { c.s = Math.max(8, c.s * 0.28); c.l = Math.max(30, Math.min(70, c.l)); }
};

/**
 * Validates whether a string is a 3-digit or 6-digit hex color
 */
function isValidHex(hex) {
  if (!hex || typeof hex !== 'string') return false;
  const clean = hex.trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{3}$/.test(clean) || /^[0-9a-fA-F]{6}$/.test(clean);
}

/**
 * Normalizes hex to standard uppercase #RRGGBB
 */
function normalizeHex(hex) {
  if (!isValidHex(hex)) return '';
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map((char) => char + char).join('');
  }
  return ('#' + clean).toUpperCase();
}

/**
 * Normalizes an arbitrary color name string
 */
function normalizeColorName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * HSL to HEX helper
 */
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (val) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return ('#' + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
}

/**
 * Deterministic 32-bit FNV-1a hash
 */
function hashString(str) {
  let hash = 2166136261;
  const compact = (str || '').replace(/\s+/g, '');
  for (let i = 0; i < compact.length; i++) {
    hash ^= compact.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Parse compound color names by combining base hues and modifiers
 */
function parseCompoundColor(normalized) {
  const words = normalized.split(/\s+/).filter(Boolean);
  let baseKey = null;

  // Search from right to left as the noun is typically at the end
  for (let i = words.length - 1; i >= 0; i--) {
    if (HUE_BASES[words[i]]) {
      baseKey = words[i];
      break;
    }
  }

  if (!baseKey) return null;

  const current = { ...HUE_BASES[baseKey] };
  for (const word of words) {
    if (word !== baseKey && MODIFIERS[word]) {
      MODIFIERS[word](current);
    }
  }

  return hslToHex(current.h, current.s, current.l);
}

/**
 * Tier 3: Deterministic aesthetic color generator for arbitrary fantasy / brand names
 */
function hashToAestheticHex(normalized) {
  const hash = hashString(normalized);
  const h = hash % 360;
  const s = 48 + ((hash >> 8) % 28); // 48% to 75% saturation
  const l = 40 + ((hash >> 16) % 20); // 40% to 59% lightness
  return hslToHex(h, s, l);
}

/**
 * Resolves any arbitrary color name or hex to a consistent uppercase #RRGGBB.
 */
function resolveColorHex(colorName, fallback = '') {
  if (!colorName || typeof colorName !== 'string') return fallback;

  const trimmed = colorName.trim();
  if (!trimmed) return fallback;

  // 1. If it's already a valid hex code
  if (isValidHex(trimmed)) {
    return normalizeHex(trimmed);
  }

  const normalized = normalizeColorName(trimmed);
  if (!normalized) return fallback;

  // 2. Exact match in Tech / Device finishes
  if (TECH_BRAND_COLORS[normalized]) {
    return TECH_BRAND_COLORS[normalized].toUpperCase();
  }

  // 3. Exact match in standard W3C CSS colors
  const compactName = normalized.replace(/\s+/g, '');
  if (W3C_COLORS[compactName]) {
    return W3C_COLORS[compactName].toUpperCase();
  }

  // 4. Compound semantic parser (hues + modifiers)
  const compoundMatch = parseCompoundColor(normalized);
  if (compoundMatch) {
    return compoundMatch;
  }

  // 5. Deterministic fallback generation for custom / arbitrary names
  return hashToAestheticHex(normalized);
}

/**
 * Unified swatch value resolver.
 * Accepts string or object ({ colorHex, value, name, color }).
 */
function resolveColorValue(input, fallback = '#64748B') {
  if (!input) return fallback;

  if (typeof input === 'object') {
    if (input.colorHex && isValidHex(input.colorHex)) {
      return normalizeHex(input.colorHex);
    }
    if (input.value) {
      return resolveColorHex(input.value, fallback);
    }
    if (input.color) {
      return resolveColorHex(input.color, fallback);
    }
    if (input.name) {
      return resolveColorHex(input.name, fallback);
    }
    return fallback;
  }

  return resolveColorHex(input.toString(), fallback);
}

module.exports = {
  isValidHex,
  normalizeHex,
  normalizeColorName,
  resolveColorHex,
  resolveColorValue,
  W3C_COLORS,
  TECH_BRAND_COLORS
};
