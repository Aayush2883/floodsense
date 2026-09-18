require('dotenv').config();
const { driver, session } = require('./src/db/neo4j');
const { markRoadsFlooded, clearAllFloods, findRoute } = require('./src/graph/routing');

const USER = { lat: 25.6205, lng: 85.1192 };   // Boring Road, west
const DEST = { lat: 25.5941, lng: 85.1621, name: 'Kankarbagh Govt School' };

(async () => {
  console.log('=== reset ===');
  console.log('cleared floods:', await clearAllFloods());

  console.log('\n=== destination ===');
  const camp = DEST;
  console.log(camp.name);

  console.log('\n=== route BEFORE flooding ===');
  const before = await findRoute(USER.lat, USER.lng, camp.lat, camp.lng);

  if (before.error) {
    console.log('error:', before.error);
    await driver.close();
    return;
  }

  console.log(`distance: ${before.distanceM}m | hops: ${before.hops} | waypoints: ${before.coords.length}`);

  const mid = before.coords[Math.floor(before.coords.length / 2)];
  console.log(`\n=== flooding roads around midpoint ${mid.lat.toFixed(5)},${mid.lng.toFixed(5)} ===`);
  console.log('roads marked flooded:', await markRoadsFlooded(mid.lat, mid.lng, 500));

  console.log('\n=== route AFTER flooding ===');
  const after = await findRoute(USER.lat, USER.lng, camp.lat, camp.lng);
  if (after.error) {
    console.log('no safe route exists:', after.error);
  } else {
    console.log(`distance: ${after.distanceM}m | hops: ${after.hops}`);
  }

  console.log('\n=== ignoring floods (what Google Maps would give you) ===');
  const naive = await findRoute(USER.lat, USER.lng, camp.lat, camp.lng, { avoidFlooded: false });
  console.log(`distance: ${naive.distanceM}m — routes straight through flooded roads`);

  // ---- the metric that actually matters ----
  const s2 = session();
  const floodCount = async (coords) => {
    const r = await s2.run(
      `UNWIND range(0, size($coords)-2) AS i
       WITH $coords[i] AS a, $coords[i+1] AS b
       MATCH (x:Location)-[rel:ROAD]-(y:Location)
       WHERE abs(x.point.y - a.lat) < 0.00001 AND abs(x.point.x - a.lng) < 0.00001
         AND abs(y.point.y - b.lat) < 0.00001 AND abs(y.point.x - b.lng) < 0.00001
       RETURN sum(CASE WHEN rel.isFlooded THEN 1 ELSE 0 END) AS flooded`,
      { coords }
    );
    return r.records[0]?.get('flooded')?.toNumber() ?? 0;
  };

  console.log('\n=== the actual point ===');
  if (!after.error) {
    console.log(`safe route crosses  ${await floodCount(after.coords)} flooded roads`);
  }
  console.log(`naive route crosses ${await floodCount(naive.coords)} flooded roads`);

  await s2.close();
  await driver.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });