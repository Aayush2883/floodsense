const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { session } = require('../db/neo4j');
const crypto = require('crypto');

const r = Router();

r.post('/', requireAuth, async (req, res) => {
  const { name, capacity, contact, lat, lng, notes, type } = req.body;
  if (!name || !lat || !lng) {
    return res.status(400).json({ error: 'name-lat-lng-required' });
  }

  const s = session();
  try {
    const nodeId = `safe_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    
    await s.run(
      `CREATE (n:SafePlace {
        nodeId: $nodeId,
        name: $name,
        type: $type,
        capacity: $capacity,
        contact: $contact,
        notes: $notes,
        point: point({latitude: $lat, longitude: $lng, srid: 4326}),
        isFull: false,
        createdBy: $uid,
        createdAt: timestamp()
      }) RETURN n`,
      {
        nodeId,
        name,
        type: type || 'building',
        capacity: Number(capacity) || 30,
        contact: contact || '',
        notes: notes || 'High ground safe location',
        lat: Number(lat),
        lng: Number(lng),
        uid: req.user?.uid || 'anonymous'
      }
    );

    await s.run(
      `MATCH (safe:SafePlace {nodeId: $nodeId}), (loc:Location)
       WHERE point.distance(safe.point, loc.point) < 400
       WITH safe, loc
       ORDER BY point.distance(safe.point, loc.point)
       LIMIT 1
      MERGE (loc)-[:ROAD {distanceM: 10, isFlooded: false}]->(safe)
      MERGE (safe)-[:ROAD {distanceM: 10, isFlooded: false}]->(loc)`,
      { nodeId }
    );

    res.json({ ok: true, nodeId, name, lat, lng });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await s.close();
  }
});

r.get('/nearby', async (req, res) => {
  const lat = Number(req.query.lat) || 25.6107;
  const lng = Number(req.query.lng) || 85.1416;
  const radiusM = Number(req.query.radiusM) || 8000;

  const s = session();
  try {
    const result = await s.run(
      `MATCH (n:SafePlace)
       WHERE point.distance(n.point, point({latitude: $lat, longitude: $lng, srid: 4326})) < $radiusM
         AND (n.isFull = false OR n.isFull IS NULL)
       RETURN n.nodeId AS nodeId, n.name AS name, n.type AS type,
              n.capacity AS capacity, n.contact AS contact,
              n.point.y AS lat, n.point.x AS lng, n.notes AS notes,
              point.distance(n.point, point({latitude: $lat, longitude: $lng, srid: 4326})) AS distanceM
       ORDER BY distanceM
       LIMIT 20`,
      { lat, lng, radiusM }
    );

    const safePlaces = result.records.map(r => ({
      nodeId: r.get('nodeId'),
      name: r.get('name'),
      type: r.get('type'),
      capacity: r.get('capacity'),
      contact: r.get('contact'),
      lat: r.get('lat'),
      lng: r.get('lng'),
      notes: r.get('notes'),
      distanceM: Math.round(r.get('distanceM'))
    }));

    res.json({ ok: true, count: safePlaces.length, safePlaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await s.close();
  }
});

r.patch('/:id/full', requireAuth, async (req, res) => {
  const s = session();
  try {
    await s.run(
      `MATCH (n:SafePlace {nodeId: $nodeId})
       SET n.isFull = true
       RETURN n`,
      { nodeId: req.params.id }
    );
    res.json({ ok: true, message: 'Safe place marked as full' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await s.close();
  }
});

module.exports = r;
