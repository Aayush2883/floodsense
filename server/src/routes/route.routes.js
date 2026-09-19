const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  findRoute,
  findSafeRoute,
  nearestCamp,
  markRoadsFlooded,
  clearAllFloods,
  getFloodedRoads
} = require('../graph/routing');
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
    
    // Check if route was blocked (Shelter in place)
    if (route.error || !route.coords || route.coords.length === 0) {
      return res.status(200).json({
        shelterInPlace: true,
        message: 'All roads to relief camp are currently flooded. Move to highest ground and shelter in place.',
        destination: camp,
        isFloodedAvoided: false,
        coords: []
      });
    }

    res.json({
  ok: true,
  status: 'ok',
  camp: camp,
  destination: camp,
  distanceM: route.distanceM || route.distanceMeters || 0,
  distanceMeters: route.distanceM || route.distanceMeters || 0,
  hops: route.hops || 0,
  isFloodedAvoided: true,
  coords: route.coords,
  shelterInPlace: false
});
  } catch (e) {
    console.error('[route/camp]', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/route/safe - Route from origin to arbitrary destination (used by map.html & verify-all)
r.get('/safe', requireAuth, async (req, res) => {
  try {
    const fromLat = Number(req.query.fromLat || req.query.lat);
    const fromLng = Number(req.query.fromLng || req.query.lng);
    const toLat = Number(req.query.toLat);
    const toLng = Number(req.query.toLng);

    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ error: 'from-and-to-coords-required' });
    }

    const avoidFlooded = req.query.avoid !== 'false';
    const route = await findRoute(fromLat, fromLng, toLat, toLng, { avoidFlooded });
    if (route.error || !route.coords || route.coords.length === 0) {
      return res.status(200).json({
        shelterInPlace: true,
        message: 'No safe route found avoiding floods.',
        coords: []
      });
    }

    res.json({
      distanceM: route.distanceM || route.distanceMeters || 0,
      distanceMeters: route.distanceM || route.distanceMeters || 0,
      coords: route.coords,
      isFloodedAvoided: true
    });
  } catch (e) {
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
    if (route.error || !route.coords || route.coords.length === 0) {
      return res.status(200).json({
        shelterInPlace: true,
        message: 'All roads to community safe place are flooded. Shelter on high ground.',
        destination: target,
        coords: []
      });
    }

    res.json({
      destination: target,
      distanceM: route.distanceM || route.distanceMeters || 0,
      distanceMeters: route.distanceM || route.distanceMeters || 0,
      isFloodedAvoided: true,
      coords: route.coords,
      shelterInPlace: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await s.close();
  }
});

// GET /api/route/floods - Returns flooded roads for map.html red lines
r.get('/floods', async (req, res) => {
  try {
    const segments = typeof getFloodedRoads === 'function' ? await getFloodedRoads() : [];
    res.json({ ok: true, count: segments.length, segments });
  } catch (e) {
    res.json({ ok: true, count: 0, segments: [] });
  }
});

// POST /api/route/floods/mark - Mark roads flooded manually (for tests / verify-all)
r.post('/floods/mark', async (req, res) => {
  try {
    const { lat, lng, radiusM = 300 } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat-lng-required' });
    const count = await markRoadsFlooded(Number(lat), Number(lng), Number(radiusM));
    res.json({ ok: true, roadsFlooded: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/route/floods/clear - Clear floods (for map.html button)
r.post('/floods/clear', async (req, res) => {
  try {
    await clearAllFloods();
    res.json({ ok: true, message: 'All floods cleared' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = r;
