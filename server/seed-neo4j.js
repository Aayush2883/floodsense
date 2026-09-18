require('dotenv').config();
const { session, driver } = require('./src/db/neo4j');

const SCHEMA = [
  `CREATE CONSTRAINT loc_id IF NOT EXISTS
     FOR (n:Location) REQUIRE n.nodeId IS UNIQUE`,
  `CREATE CONSTRAINT camp_id IF NOT EXISTS
     FOR (n:ReliefCamp) REQUIRE n.nodeId IS UNIQUE`,
  `CREATE CONSTRAINT safe_id IF NOT EXISTS
     FOR (n:SafePlace) REQUIRE n.nodeId IS UNIQUE`,
  `CREATE POINT INDEX loc_point IF NOT EXISTS
     FOR (n:Location) ON (n.point)`,
  `CREATE POINT INDEX camp_point IF NOT EXISTS
     FOR (n:ReliefCamp) ON (n.point)`,
  `CREATE POINT INDEX safe_point IF NOT EXISTS
     FOR (n:SafePlace) ON (n.point)`,
];

const CAMPS = [
  { id: 'camp_pat_01', name: 'Gandhi Maidan Relief Camp', lat: 25.6127, lng: 85.1436, capacity: 500, city: 'Patna' },
  { id: 'camp_pat_02', name: 'Rajendra Nagar Community Hall', lat: 25.6082, lng: 85.1573, capacity: 300, city: 'Patna' },
  { id: 'camp_pat_03', name: 'Patna Junction Shelter', lat: 25.6015, lng: 85.1376, capacity: 400, city: 'Patna' },
  { id: 'camp_pat_04', name: 'Kankarbagh Govt School', lat: 25.5941, lng: 85.1621, capacity: 350, city: 'Patna' },
  { id: 'camp_pat_05', name: 'Boring Road Relief Point', lat: 25.6205, lng: 85.1192, capacity: 250, city: 'Patna' },
];

(async () => {
  const s = session();
  try {
    console.log('--- schema ---');
    for (const q of SCHEMA) {
      await s.run(q);
      console.log('  ok:', q.trim().split('\n')[0].slice(0, 60));
    }

    console.log('\n--- relief camps ---');
    for (const c of CAMPS) {
      await s.run(
        `MERGE (r:ReliefCamp { nodeId: $id })
         SET r.name = $name,
             r.capacity = $capacity,
             r.city = $city,
             r.point = point({ latitude: $lat, longitude: $lng, srid: 4326 }),
             r.isFull = false,
             r.verified = true,
             r.updatedAt = timestamp()`,
        c
      );
      console.log(`  ${c.name} (${c.city})`);
    }

    const counts = await s.run(`
      MATCH (r:ReliefCamp) WITH count(r) AS camps
      MATCH (n) WITH camps, count(n) AS total
      RETURN camps, total
    `);
    const rec = counts.records[0];
    console.log(`\ncamps: ${rec.get('camps').toNumber()}  |  total nodes: ${rec.get('total').toNumber()}`);
  } finally {
    await s.close();
    await driver.close();
  }
})().catch(e => {
  console.error('FAILED:', e.code || e.name);
  console.error(e.message);
  process.exit(1);
});