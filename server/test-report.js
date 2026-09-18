const BASE = 'http://127.0.0.1:4000';

async function main() {
  const s = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `t${Date.now()}@x.com`, password: 'pw', name: 'T' }),
  });
  const { token } = await s.json();

  const cases = [
    { text: 'Bhaiya Rajendra Nagar Patna mein paani ghutne tak aa gaya hai, gaadi nahi nikal paa rahi', lang: 'hi-IN' },
    { text: 'Water is up to my chest near Adarsh Nagar. Two people are stuck on a roof.', lang: 'en-IN' },
    { text: 'Small puddle on the road outside my house, nothing serious', lang: 'en-IN' },
  ];

  for (const c of cases) {
    const res = await fetch(`${BASE}/api/reports/text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...c, lat: 25.6107, lng: 85.1416 }),
    });
    const body = await res.json();
    console.log(`\n--- "${c.text.slice(0, 45)}..." ---`);
    console.log('status:', res.status, '| latency:', body.latencyMs, 'ms');
    console.log(JSON.stringify(body.extracted, null, 2));
  }
}

main().catch(e => console.error('FAILED:', e.message));