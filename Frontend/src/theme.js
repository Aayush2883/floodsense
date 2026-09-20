// ─────────────────────────────────────────────────────────────────────────────
// FloodSense colour system
//
// Every colour in the app comes from here. One meaning = one colour:
//   GREEN  = safe (verified safe places, dry route, "you're safe")
//   RED    = immediate flood danger (never used for ordinary actions)
//   AMBER  = warning / caution / degraded connection (demo data, offline)
//   TEAL   = navigation and actions (buttons, camps, map controls) — never "safe"
//   BLUE   = the user's own location
//   SLATE  = inactive, unavailable, unknown
// Every state also carries a text label or icon, so colour is never the only cue.
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  // surfaces
  ground: '#F3F5F4',
  surface: '#FFFFFF',
  fill: '#E7ECEC',
  line: '#DCE3E4',
  white: '#FFFFFF',

  // text
  text: '#102027',
  textSecondary: '#52656B',
  textOnColor: '#FFFFFF',
  placeholder: '#94A3A8',

  // SAFE / VERIFIED SAFE
  safe: '#15803D',          // solid safe states, "YOU'RE SAFE", dry route
  safeMarker: '#16A34A',    // safe places on the map

  // DANGER / FLOOD THREAT
  danger: '#C92A3A',
  dangerSoft: '#FDECEE',    // background behind danger text
  dangerBorder: '#F1B8BF',
  dangerText: '#A11F2D',    // small danger text on dangerSoft (≥ 6:1)

  // WARNING / MODERATE RISK
  warning: '#D97706',       // fills, bars, markers
  warningText: '#B45309',   // small amber text on white (≥ 5:1)
  warningSoft: '#FFF8E6',
  onWarning: '#102027',     // text on amber fills (white fails contrast)

  // NAVIGATION / PRIMARY ACTIONS
  action: '#0F6B73',
  actionSoft: '#E1F0F1',

  // USER LOCATION
  location: '#2563EB',
  locationSoft: '#DBEAFE',

  // INACTIVE / UNAVAILABLE / UNKNOWN
  inactive: '#94A3A8',
  onInactive: '#102027',    // text on slate fills (white fails contrast)

  // illustration (the water in the depth figure) — not a state colour
  water: '#2F7FA0',
  waterLight: '#BFDCE7',
  figure: '#34464B',

  // chrome
  shadow: '#102027',
  mapBackground: '#E6EAE3',
  frameStage: '#DCE5E2',
  frameBezel: '#111A1C',
  frameNotch: '#0B0F10',

  // icons on the dark toast
  toastAction: '#8FD3DA',
  toastInfo: '#CBD5D8',
  toastWarning: '#FBBF24',
};

// hex + opacity → rgba(), so translucent colours still come from the tokens above
export function alpha(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const F = {
  display: 'AnekDevanagari_700Bold',
  displayHeavy: 'AnekDevanagari_800ExtraBold',
  body: 'Mukta_400Regular',
  bodyMedium: 'Mukta_500Medium',
  bodySemi: 'Mukta_600SemiBold',
  bodyBold: 'Mukta_700Bold',
  mono: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
};

// Flood severity (from the AI) and sensor status → colour + readable text colour.
// HIGH and DANGER are both an immediate threat (roads close), so both are red;
// the label on every badge still tells them apart.
export const SEVERITY = {
  LOW: { color: C.inactive, fg: C.onInactive, depth: 'puddle', radiusM: 0 },
  MEDIUM: { color: C.warning, fg: C.onWarning, depth: 'ankle', radiusM: 150 },
  HIGH: { color: C.danger, fg: C.textOnColor, depth: 'waist', radiusM: 350 },
  DANGER: { color: C.danger, fg: C.textOnColor, depth: 'chest', radiusM: 600 },
  WARNING: { color: C.warning, fg: C.onWarning },
  SAFE: { color: C.safe, fg: C.textOnColor },
  UNKNOWN: { color: C.inactive, fg: C.onInactive },
};

export const severityColor = (level) => (SEVERITY[level] || SEVERITY.UNKNOWN).color;
export const severityText = (level) => (SEVERITY[level] || SEVERITY.UNKNOWN).fg;
// small symbol shown next to a colour so the state is readable without colour
export const severitySymbol = (level) => ({ DANGER: '⚠ ', HIGH: '⚠ ', WARNING: '! ', MEDIUM: '! ' }[level] || '');

// water line in the 24x48 depth figure (0 = top of head, 48 = feet)
export const DEPTH_Y = { puddle: 45, ankle: 41, knee: 35, waist: 27, chest: 16, 'above-head': 0, unknown: 48 };

// sensor thresholds used by iot-simulator/simulator.py
export const SENSOR_WARN_CM = 90;
export const SENSOR_DANGER_CM = 150;
