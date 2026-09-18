const { session } = require('../db/neo4j');

async function nearestLocation(s, lat, lng, maxMeters = 500) {
  const r = await s.run(
    `MATCH (n:Location)
     WHERE point.distance(n.point, point({latitude:$lat, longitude:$lng, srid:4326})) < $maxMeters
     RETURN n.nodeId AS nodeId,
            point.distance(n.point, point({latitude:$lat, longitude:$lng, srid:4326})) AS d
     ORDER BY d ASC LIMIT 1`,
    { lat, lng, maxMeters }
  );
  return r.records[0]?.get('nodeId') ?? null;
}

async function markRoadsFlooded(lat, lng, radiusM = 300) {
  const s = session();
  try {
    const r = await s.run(
      `MATCH (a:Location)-[rel:ROAD]->(b:Location)
       WHERE point.distance(a.point, point({latitude:$lat, longitude:$lng, srid:4326})) < $radiusM
       SET rel.isFlooded = true, rel.floodedAt = timestamp()
       RETURN count(rel) AS marked`,
      { lat, lng, radiusM }
    );
    return r.records[0].get('marked').toNumber();
  } finally { await s.close(); }
}

async function clearAllFloods() {
  const s = session();
  try {
    const r = await s.run(
      `MATCH ()-[rel:ROAD]->() WHERE rel.isFlooded = true
       SET rel.isFlooded = false REMOVE rel.floodedAt
       RETURN count(rel) AS cleared`
    );
    return r.records[0].get('cleared').toNumber();
  } finally { await s.close(); }
}

async function findRoute(fromLat, fromLng, toLat, toLng, { avoidFlooded = true, maxHops = 500 } = {}) {
  const s = session();
  try {
        const fromId = await nearestLocation(s, fromLat, fromLng);
    const toId = await nearestLocation(s, toLat, toLng);
    if (!fromId || !toId) return { error: 'no-nearby-road-node', fromId, toId };

    // add these three lines
    if (fromId === toId) {
      return { coords: [{ lat: fromLat, lng: fromLng }], distanceM: 0, hops: 0, alreadyThere: true };
    }

    const floodFilter = avoidFlooded
      ? 'WHERE ALL(rel IN relationships(p) WHERE rel.isFlooded = false)'
      : '';

    const r = await s.run(
      `MATCH (src:Location {nodeId:$fromId}), (dst:Location {nodeId:$toId})
       MATCH p = shortestPath((src)-[:ROAD*..${maxHops}]-(dst))
       ${floodFilter}
       RETURN [n IN nodes(p) | {lat: n.point.y, lng: n.point.x}] AS coords,
              reduce(total = 0, rel IN relationships(p) | total + rel.distanceM) AS distanceM,
              length(p) AS hops
       LIMIT 1`,
      { fromId, toId }
    );

    if (r.records.length === 0) return { error: 'no-route-found', avoidFlooded };

    const rec = r.records[0];
    return {
      coords: rec.get('coords'),
      distanceM: rec.get('distanceM'),
      hops: rec.get('hops').toNumber(),
    };
  } finally { await s.close(); }
}

async function nearestCamp(lat, lng) {
  const s = session();
  try {
    const r = await s.run(
      `MATCH (c:ReliefCamp) WHERE c.isFull = false
       RETURN c.nodeId AS nodeId, c.name AS name,
              c.point.y AS lat, c.point.x AS lng,
              point.distance(c.point, point({latitude:$lat, longitude:$lng, srid:4326})) AS d
       ORDER BY d ASC LIMIT 1`,
      { lat, lng }
    );
    const rec = r.records[0];
    if (!rec) return null;
    return {
      nodeId: rec.get('nodeId'), name: rec.get('name'),
      lat: rec.get('lat'), lng: rec.get('lng'),
      straightLineM: Math.round(rec.get('d')),
    };
  } finally { await s.close(); }
}

module.exports = { markRoadsFlooded, clearAllFloods, findRoute, nearestCamp };