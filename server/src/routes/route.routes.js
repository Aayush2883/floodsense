const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { findRoute, nearestCamp, markRoadsFlooded, clearAllFloods } = require('../graph/routing');
const { session } = require('../db/neo4j');

const r = Router();

r.get('/camp', requireAuth, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!lat || !lng) return res.status(400).json({ error: 'lat-lng-required' });

    const camp = await nearestCamp(lat, lng);
    if (!camp) return res.status(404).json({ error: 'no-camps-available' });

    const route = await findRoute(lat, lng, camp.lat, camp.lng);

    if (route.error === 'no-route-found') {
      return res.json({
        status: 'no-safe-route',
        message: 'All routes to the nearest camp are flooded. Shelter in place and await rescue.',
        camp,
      });
    }
    if (route.error) return res.status(404).json({ status: 'error', error: route.error });

    res.json({ status: 'ok', camp, distanceM: route.distanceM, hops: route.hops, coords: route.coords });
  } catch (e) {
    console.error('[route/camp]', e);
    res.status(500).json({ error: e.message });
  }
});

r.get('/safe', requireAuth, async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;
    const route = await findRoute(Number(fromLat), Number(fromLng), Number(toLat), Number(toLng));

    if (route.error === 'no-route-found') {
      return res.json({ status: 'no-safe-route', message: 'No flood-free route exists between these points.' });
    }
    if (route.error) return res.status(404).json({ status: 'error', error: route.error });

    res.json({ status: 'ok', ...route });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.get('/floods', async (req, res) => {
  try {
    const lat = Number(req.query.lat) || 25.6127;
    const lng = Number(req.query.lng) || 85.1436;
    const radiusM = Number(req.query.radiusM) || 5000;

    const s = session();
    try {
      const result = await s.run(
        `MATCH (a:Location)-[rel:ROAD]->(b:Location)
         WHERE rel.isFlooded = true
           AND point.distance(a.point, point({latitude:$lat, longitude:$lng, srid:4326})) < $radiusM
         RETURN a.point.y AS aLat, a.point.x AS aLng,
                b.point.y AS bLat, b.point.x AS bLng,
                rel.name AS name
         LIMIT 2000`,
        { lat, lng, radiusM }
      );
      res.json({ count: result.records.length, segments: result.records.map(x => x.toObject()) });
    } finally { await s.close(); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/floods/mark', requireAuth, async (req, res) => {
  try {
    const { lat, lng, radiusM = 400 } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat-lng-required' });
    const marked = await markRoadsFlooded(lat, lng, radiusM);
    req.app.get('io')?.emit('graph:updated', { lat, lng, radiusM, marked });
    res.json({ ok: true, marked });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/floods/clear', requireAuth, async (req, res) => {
  const cleared = await clearAllFloods();
  req.app.get('io')?.emit('graph:updated', { cleared });
  res.json({ ok: true, cleared });
});

module.exports = r;