// Relief camps — same five camps as server/seed-neo4j.js
export const CAMPS = [
  { id: 'camp_pat_01', name: 'Gandhi Maidan Relief Camp', lat: 25.6127, lng: 85.1436, capacity: 500 },
  { id: 'camp_pat_02', name: 'Rajendra Nagar Community Hall', lat: 25.6082, lng: 85.1573, capacity: 300 },
  { id: 'camp_pat_03', name: 'Patna Junction Shelter', lat: 25.6015, lng: 85.1376, capacity: 400 },
  { id: 'camp_pat_04', name: 'Kankarbagh Govt School', lat: 25.5941, lng: 85.1621, capacity: 350 },
  { id: 'camp_pat_05', name: 'Boring Road Relief Point', lat: 25.6205, lng: 85.1192, capacity: 250 },
];

export const PATNA_CENTER = { lat: 25.6100, lng: 85.1400 };

// where the demo citizen starts (west of Gandhi Maidan, inside the OSM road graph bbox)
export const DEMO_ME = { lat: 25.6112, lng: 85.1262, label: 'Boring Road, Patna' };

// used by demo mode to understand place names in reports
export const KNOWN_PLACES = [
  { names: ['gandhi maidan', 'गांधी मैदान', 'gandhi maidaan'], label: 'Gandhi Maidan, Patna 800001', lat: 25.6118, lng: 85.1428 },
  { names: ['rajendra nagar', 'राजेंद्र नगर', 'rajendranagar'], label: 'Rajendra Nagar, Patna 800016', lat: 25.6060, lng: 85.1560 },
  { names: ['kankarbagh', 'कंकड़बाग', 'kankarbag'], label: 'Kankarbagh, Patna 800020', lat: 25.5960, lng: 85.1600 },
  { names: ['boring road', 'बोरिंग रोड'], label: 'Boring Road, Patna 800013', lat: 25.6200, lng: 85.1210 },
  { names: ['patna junction', 'पटना जंक्शन', 'station'], label: 'Patna Junction, Patna 800001', lat: 25.6030, lng: 85.1370 },
  { names: ['fraser road', 'फ्रेज़र रोड', 'frazer road'], label: 'Fraser Road, Patna 800001', lat: 25.6112, lng: 85.1365 },
  { names: ['kadamkuan', 'कदमकुआँ'], label: 'Kadamkuan, Patna 800003', lat: 25.6060, lng: 85.1480 },
  { names: ['ashok rajpath', 'अशोक राजपथ'], label: 'Ashok Rajpath, Patna 800004', lat: 25.6195, lng: 85.1560 },
  { names: ['bailey road', 'बेली रोड'], label: 'Bailey Road, Patna 800014', lat: 25.6090, lng: 85.1180 },
  { names: ['danapur', 'दानापुर'], label: 'Danapur, Patna 801503', lat: 25.6320, lng: 85.0450 },
];

export const PIN_CODES = {
  '800001': { lat: 25.6100, lng: 85.1400, label: 'Patna GPO, Bihar' },
  '800003': { lat: 25.6060, lng: 85.1480, label: 'Kadamkuan, Patna' },
  '800004': { lat: 25.6195, lng: 85.1560, label: 'Mahendru, Patna' },
  '800013': { lat: 25.6205, lng: 85.1192, label: 'Boring Road, Patna' },
  '800014': { lat: 25.6090, lng: 85.1180, label: 'Bailey Road, Patna' },
  '800016': { lat: 25.6082, lng: 85.1573, label: 'Rajendra Nagar, Patna' },
  '800020': { lat: 25.5941, lng: 85.1621, label: 'Kankarbagh, Patna' },
  '801503': { lat: 25.6320, lng: 85.0450, label: 'Danapur, Patna' },
  '110001': { lat: 28.6328, lng: 77.2197, label: 'Connaught Place, New Delhi' },
  '211012': { lat: 25.4295, lng: 81.7718, label: 'Jhalwa, Prayagraj' },
  '400001': { lat: 18.9388, lng: 72.8354, label: 'Fort, Mumbai' },
  '700001': { lat: 22.5726, lng: 88.3639, label: 'BBD Bagh, Kolkata' },
};
