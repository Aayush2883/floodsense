require('dotenv').config();
const { ddb } = require('./src/db/dynamo');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');

const BASE = 'http://127.0.0.1:4000';
const USER = { lat: 25.6205, lng: 85.1192 };
const CAMP = { lat: 25.5941, lng: 85.1621, name: 'Kankarbagh Govt School' };

const passed = [], failed = [];
const check = (name, cond, detail = '') => {
  (cond ? passed : failed).push(name);
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + detail : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

let H = {};
const get  = p      => fetch(`${BASE}${p}`, { headers: H }).then(r => r.json());
const post = (p, b) => fetch(`${BASE}${p}`, {
  method: 'POST',
  headers: { ...H, 'content-type': 'application/json' },
  body: JSON.stringify(b || {}),
}).then(r => r.json());

const segKey = (aLat, aLng, bLat, bLng) =>
  [`${(+aLat).toFixed(5)},${(+aLng).toFixed(5)}`,
   `${(+bLat).toFixed(5)},${(+bLng).toFixed(5)}`].sort().join('|');

async function crossings(coords) {
  const b = await get(`/api/route/floods?lat=${USER.lat}&lng=${USER.lng}&radiusM=9000`);
  const set = new Set((b.segments || []).map(s => segKey(s.aLat, s.aLng, s.bLat, s.bLng)));
  let n = 0;
  for (let i = 0; i < coords.length - 1; i++)
    if (set.has(segKey(coords[i].lat, coords[i].lng, coords[i+1].lat, coords[i+1].lng))) n++;
  return n;
}

(async () => {
console.log('\n=== 1. SERVER AND ACCOUNTS ===');
const health = await get('/api/health');
check('server is up', health.ok === true);

const signup = await post('/api/auth/signup',
  { email: `verify${Date.now()}@t.com`, password: 'pw123', name: 'Verify' });
check('account can be created', !!signup.token);
H = { Authorization: `Bearer ${signup.token}` };

const me = await get('/api/auth/me');
check('logged-in user is recognised', me.email === signup.user.email);

const noAuth = await fetch(`${BASE}/api/route/camp?lat=25.6&lng=85.1`);
check('protected routes reject strangers', noAuth.status === 401);

console.log('\n=== 2. THE ROAD GRAPH ===');
await post('/api/route/floods/clear');
const before = await get(
  `/api/route/safe?fromLat=${USER.lat}&fromLng=${USER.lng}&toLat=${CAMP.lat}&toLng=${CAMP.lng}`);
check('a route exists across the city', before.status === 'ok',
  `${before.distanceM}m, ${before.hops} hops`);

const camp = await get(`/api/route/camp?lat=${USER.lat}&lng=${USER.lng}`);
check('nearest relief camp is found', !!camp.camp, camp.camp?.name);

console.log('\n=== 3. UNDERSTANDING WRITTEN REPORTS (BEDROCK) ===');
const cases = [
  ['Bhaiya Gandhi Maidan Patna mein paani chest tak aa gaya hai, log phase hue hain', 'hi-IN', 'DANGER'],
  ['Small puddle on the road outside my house, nothing serious', 'en-IN', 'LOW'],
];
let report;
for (const [text, lang, expect] of cases) {
  const r = await post('/api/reports/text', { text, lang, ...USER });
  if (expect === 'DANGER') report = r;
  check(`"${text.slice(0, 32)}..." graded ${expect}`,
    r.extracted?.severity === expect,
    `got ${r.extracted?.severity}, ${r.latencyMs}ms`);
}
check('place name resolved to coordinates', !!report?.geocoded?.lat,
  report?.geocoded?.label?.slice(0, 45));
check('report closed roads automatically', report?.roadsFlooded > 0,
  `${report?.roadsFlooded} segments`);
check('report saved permanently', report?.persisted === true);

console.log('\n=== 4. SAFE ROUTING AROUND WATER ===');
const floods = await get(`/api/route/floods?lat=${USER.lat}&lng=${USER.lng}&radiusM=9000`);
check('flooded streets can be listed', floods.count > 0, `${floods.count} segments`);

const safe = await get(
  `/api/route/safe?fromLat=${USER.lat}&fromLng=${USER.lng}&toLat=${CAMP.lat}&toLng=${CAMP.lng}`);
const naive = await get(
  `/api/route/safe?fromLat=${USER.lat}&fromLng=${USER.lng}&toLat=${CAMP.lat}&toLng=${CAMP.lng}&avoid=false`);
const safeX  = await crossings(safe.coords || []);
const naiveX = await crossings(naive.coords || []);
check('our route crosses ZERO flooded roads', safeX === 0, `${safeX} crossings`);
check('the ordinary route drives through water', naiveX > 0, `${naiveX} crossings`);

console.log('\n=== 5. REFUSING WHEN THERE IS NO SAFE WAY ===');
await post('/api/route/floods/mark', { lat: CAMP.lat, lng: CAMP.lng, radiusM: 1200 });
const cut = await get(
  `/api/route/safe?fromLat=${USER.lat}&fromLng=${USER.lng}&toLat=${CAMP.lat}&toLng=${CAMP.lng}`);
check('tells people to shelter in place when cut off',
  cut.status === 'no-safe-route', cut.message?.slice(0, 45) || cut.status);

console.log('\n=== 6. SENSORS ACTING ON THEIR OWN ===');
const alertsBefore = (await get('/api/alerts')).count;
await ddb.send(new PutCommand({
  TableName: process.env.DDB_SENSOR_READINGS,
  Item: {
    sensorId: `verify-${Date.now()}`, timestamp: new Date().toISOString(),
    waterLevelCm: 172, rainfallMm: 16.5, regionCode: '25.61_85.13',
    lat: 25.6100, lng: 85.1377, source: 'verify', alert: 'DANGER',
  },
}));
console.log('  ... injected a DANGER reading, waiting for the watcher');
let alertsAfter = alertsBefore;
for (let i = 0; i < 8 && alertsAfter === alertsBefore; i++) {
  await sleep(3000);
  alertsAfter = (await get('/api/alerts')).count;
}
check('sensor danger raises an alert with no human involved', alertsAfter > alertsBefore,
  `${alertsBefore} to ${alertsAfter} alerts`);

const sensors = await get('/api/sensors');
check('current sensor readings can be read', (sensors.sensors || []).length > 0,
  `${sensors.sensors?.length} sensors`);

console.log('\n=== 7. STORAGE ===');
const reports = await get('/api/reports');
check('reports are stored and retrievable', reports.count > 0, `${reports.count} reports`);

await post('/api/route/floods/clear');
console.log(`\n${'='.repeat(46)}`);
console.log(`  ${passed.length} passed, ${failed.length} failed`);
if (failed.length) console.log('  failed: ' + failed.join(', '));
console.log(`${'='.repeat(46)}\n`);
process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('CRASHED:', e.message); process.exit(1); });