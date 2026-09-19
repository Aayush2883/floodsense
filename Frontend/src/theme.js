export const C = {
  ground: '#F3F5F2',
  surface: '#FFFFFF',
  ink: '#0F1E24',
  muted: '#5E6F72',
  line: '#DDE3E0',
  fill: '#E5EAE7',
  river: '#0B5C66',
  riverSoft: '#E3EFEF',
  safe: '#17824A',
  warn: '#B77400',
  high: '#D9601F',
  danger: '#C62A3A',
  dangerDeep: '#8E1C2A',
  dangerSoft: '#FBE7E9',
  low: '#4F8A9A',
  water: '#2F7FA0',
  waterLight: '#BFDCE7',
  me: '#2B6CD1',
  grey: '#8C9A9C',
};

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

export const SEVERITY = {
  LOW: { color: C.low, depth: 'puddle', radiusM: 0 },
  MEDIUM: { color: C.warn, depth: 'ankle', radiusM: 150 },
  HIGH: { color: C.high, depth: 'waist', radiusM: 350 },
  DANGER: { color: C.danger, depth: 'chest', radiusM: 600 },
  WARNING: { color: C.warn },
  SAFE: { color: C.safe },
};

// water line in the 24x48 depth figure (0 = top of head, 48 = feet)
export const DEPTH_Y = { puddle: 45, ankle: 41, knee: 35, waist: 27, chest: 16, 'above-head': 0, unknown: 48 };

// sensor thresholds used by iot-simulator/simulator.py
export const SENSOR_WARN_CM = 90;
export const SENSOR_DANGER_CM = 150;
