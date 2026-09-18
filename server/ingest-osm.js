require('dotenv').config();
const { session, driver } = require('./src/db/neo4j');

const OVERPASS = 'https://overpass.kumi.systems/api/interpreter';

// bbox covering ~6km x 6km of central Patna: south, west, north, east
const BBOX = { south: 25.586, west: 85.114, north: 25.640, east: 85.174 };
const BATCH_SIZE = 500;

const HIGHWAY_TYPES = 'motorway|trunk|primary|secondary|tertiary|residential';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const nodeId = (lat, lng) => `n_${lat.toFixed(6)}_${lng.toFixed(6)}`;

async function fetchRoads(attempt = 1) {
      const query = `
    [out:json][timeout:180];
    (
      way["highway"~"^(${HIGHWAY_TYPES})$"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
    );
    out geom;
  `;
  console.log(`fetching roads in bbox ${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east} (attempt ${attempt}) ...`);

  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FloodSense/1.0 (student hackathon project)',
        'Accept': 'application/json',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) throw new Error(`overpass ${res.status}`);

    const json = await res.json();
    return json.elements.filter(e => e.type === 'way' && Array.isArray(e.geometry));
  } catch (e) {
    if (attempt >= 4) throw e;
    const wait = attempt * 15;
    console.log(`  ${e.message} — retrying in ${wait}s`);
    await new Promise(r => setTimeout(r, wait * 1000));
    return fetchRoads(attempt + 1);
  }
}

function buildSegments(ways) {
  const segments = [];
  for (const way of ways) {
    const g = way.geometry;
    for (let i = 0; i < g.length - 1; i++) {
      const a = g[i], b = g[i + 1];
      if (!a || !b) continue;
      segments.push({
        roadId: `w${way.id}_${i}`,
        aId: nodeId(a.lat, a.lon), aLat: a.lat, aLng: a.lon,
        bId: nodeId(b.lat, b.lon), bLat: b.lat, bLng: b.lon,
        distM: haversine(a.lat, a.lon, b.lat, b.lon),
        highway: way.tags?.highway ?? 'unknown',
        name: way.tags?.name ?? null,
      });
    }
  }
  return segments;
}

const UPSERT = `
UNWIND $batch AS seg
MERGE (a:Location { nodeId: seg.aId })
  ON CREATE SET a.point = point({ latitude: seg.aLat, longitude: seg.aLng, srid: 4326 })
MERGE (b:Location { nodeId: seg.bId })
  ON CREATE SET b.point = point({ latitude: seg.bLat, longitude: seg.bLng, srid: 4326 })
MERGE (a)-[r:ROAD { roadId: seg.roadId }]->(b)
  ON CREATE SET r.distanceM = seg.distM,
                r.highway   = seg.highway,
                r.name      = seg.name,
                r.isFlooded = false
`;

(async () => {
  const started = Date.now();
  const ways = await fetchRoads();
  console.log(`  ${ways.length} ways returned`);

  const segments = buildSegments(ways);
  console.log(`  ${segments.length} road segments to insert\n`);

  const s = session();
  try {
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      const batch = segments.slice(i, i + BATCH_SIZE);
      await s.run(UPSERT, { batch });
      const done = Math.min(i + BATCH_SIZE, segments.length);
      process.stdout.write(`\r  inserted ${done}/${segments.length}`);
    }
    console.log('\n');

    const stats = await s.run(`
      MATCH (n:Location) WITH count(n) AS locations
      MATCH ()-[r:ROAD]->() WITH locations, count(r) AS roads
      RETURN locations, roads
    `);
    const rec = stats.records[0];
    console.log(`Location nodes: ${rec.get('locations').toNumber()}`);
    console.log(`ROAD edges:     ${rec.get('roads').toNumber()}`);
    console.log(`took ${((Date.now() - started) / 1000).toFixed(1)}s`);
    } finally {
    await s.close();
    await driver.close();
  }
})().catch(e => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});