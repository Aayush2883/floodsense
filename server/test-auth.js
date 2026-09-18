const BASE = 'http://localhost:4000';

async function main() {
  console.log('--- health ---');
  const h = await fetch(`${BASE}/api/health`);
  console.log(h.status, await h.text());

  console.log('\n--- signup ---');
  const s = await fetch(`${BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `akshat${Date.now()}@test.com`,
      password: 'pw123',
      name: 'Akshat',
    }),
  });
  const signupBody = await s.text();
  console.log(s.status, signupBody);

  if (s.status !== 200) return;

  const { token } = JSON.parse(signupBody);
  console.log('\n--- me (protected) ---');
  const m = await fetch(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(m.status, await m.text());
}

main().catch(e => console.error('FAILED:', e.message));