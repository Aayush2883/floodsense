const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { findRoute, nearestCamp } = require('../graph/routing');
const { session } = require('../db/neo4j');

const r = Router();

// GET /api/route/camp - Route to nearest relief camp
r.get('/camp', requireAuth, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!lat || !lng) return res.status(400).json({ error: 'lat-lng-required' });

    const camp = await nearestCamp(lat, lng);
    if (!camp) return res.status(404).json({ error: 'no-camp-found' });

    const route = await findRoute(lat, lng, camp.lat, camp.lng);
    res.json({
      destination: camp,
      distanceMeters: route.distanceMeters,
      isFloodedAvoided: true,
      coords: route.coords
    });
  } catch (e) {
    console.error('[route/camp]', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/route/safeplace - Route to nearest community safe place
r.get('/safeplace', requireAuth, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!lat || !lng) return res.status(400).json({ error: 'lat-lng-required' });

  const s = session();
  try {
    const result = await s.run(
      `MATCH (s:SafePlace)
       WHERE (s.isFull = false OR s.isFull IS NULL)
       RETURN s.nodeId AS id, s.name AS name, s.point.y AS lat, s.point.x AS lng,
              s.capacity AS capacity, s.contact AS contact,
              point.distance(s.point, point({latitude: $lat, longitude: $lng, srid: 4326})) AS dist
       ORDER BY dist LIMIT 1`,
      { lat, lng }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'no-safe-place-found' });
    }

    const target = {
      name: result.records[0].get('name'),
      lat: result.records[0].get('lat'),
      lng: result.records[0].get('lng'),
      capacity: result.records[0].get('capacity'),
      contact: result.records[0].get('contact')
    };

    const route = await findRoute(lat, lng, target.lat, target.lng);
    res.json({
      destination: target,
      distanceMeters: route.distanceMeters,
      isFloodedAvoided: true,
      coords: route.coords
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await s.close();
  }
});

module.exports = r;
