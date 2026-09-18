const BASE = 'http://127.0.0.1:4000';

async function main() {
  const s = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `loop${Date.now()}@x.com`, password: 'pw', name: 'Loop' }),
  });
  const { token } = await s.json();
  const auth = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  console.log('--- clearing floods ---');
  let res = await fetch(`${BASE}/api/route/floods/clear`, { method: 'POST', headers: auth });
  console.log(await res.json());

    console.log('\n--- route to camp BEFORE any report ---');
  res = await fetch(`${BASE}/api/route/camp?lat=25.6280&lng=85.1100`, { headers: auth });
  let body = await res.json();
  console.log(`${body.status} | ${body.camp?.name} | ${body.distanceM}m | ${body.hops} hops`);

  console.log('\n--- citizen files a Hindi report ---');
  res = await fetch(`${BASE}/api/reports/text`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      text: 'Bhaiya Gandhi Maidan Patna ke paas paani chest tak aa gaya hai, log phase hue hain',
      lang: 'hi-IN',
      lat: 25.6127, lng: 85.1436,
    }),
  });
  body = await res.json();
  console.log('severity:      ', body.extracted?.severity);
  console.log('location said: ', body.extracted?.locationText);
  console.log('geocoded to:   ', body.geocoded?.label, `(${body.geocoded?.lat}, ${body.geocoded?.lng})`);
  console.log('roads flooded: ', body.roadsFlooded);
  console.log('latency:       ', body.latencyMs, 'ms');

    console.log('\n--- route to camp AFTER the report ---');
  res = await fetch(`${BASE}/api/route/camp?lat=25.6280&lng=85.1100`, { headers: auth });
  body = await res.json();
  console.log(body.status === 'no-safe-route'
    ? `${body.status}: ${body.message}`
    : `${body.status} | ${body.distanceM}m | ${body.hops} hops`);

  console.log('\n--- flooded segments for the map ---');
  res = await fetch(`${BASE}/api/route/floods?lat=25.6127&lng=85.1436&radiusM=5000`);
  body = await res.json();
  console.log(`${body.count} flooded segments`);

  console.log('\n--- persisted reports ---');
  res = await fetch(`${BASE}/api/reports`);
  body = await res.json();
  console.log(`${body.count} report(s) in DynamoDB`);
}

main().catch(e => console.error('FAILED:', e.message));