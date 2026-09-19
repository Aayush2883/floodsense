const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  findRoute, nearestCamp, markRoadsFlooded, clearAllFloods, getFloodedRoads
} = require('../graph/routing');
const { session } = require('../db/neo4j');

const r = Router();

r.get('/camp', requireAuth, async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!lat || !lng) return res.status(400).json({ error: 'lat-lng-required' });

    const dest = await nearestCamp(lat, lng, 50000);
    if (!dest) {
      return res.json({
        ok: true, status: 'no-destination', noDestinationFound: true,
        destinationKind: 'none',
        message: 'No relief camps or safe places found within 50km.',
      });
    }

    const route = await findRoute(lat, lng, dest.lat, dest.lng, { avoidFlooded: true });

    if (route.error || !route.coords || route.coords.length === 0) {
      return res.json({
        ok: true, status: 'no-safe-route', shelterInPlace: true,
        destinationKind: dest.kind,
        message: 'All roads to the nearest shelter are flooded. Move to higher ground and shelter in place.',
        camp: dest, destination: dest, isFloodedAvoided: false, coords: [],
      });
    }

    res.json({
      ok: true, status: 'ok', shelterInPlace: false,
      destinationKind: dest.kind,
      camp: dest, destination: dest,
      distanceM: route.distanceM, distanceMeters: route.distanceM,
      hops: route.hops, isFloodedAvoided: true, coords: route.coords,
    });
  } catch (e) {
    console.error('[route/camp]', e);
    res.status(500).json({ error: e.message });
  }
});

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
      return res.json({
        status: 'no-safe-route', shelterInPlace: true,
        message: 'No flood-free route exists between these points.',
        coords: [],
      });
    }

    res.json({
      status: 'ok', shelterInPlace: false,
      distanceM: route.distanceM, distanceMeters: route.distanceM,
      hops: route.hops, coords: route.coords,
      isFloodedAvoided: avoidFlooded,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.get('/safeplace', requireAuth, async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!lat || !lng) return res.status(400).json({ error: 'lat-lng-required' });

  const s = session();
  try {
    const result = await s.run(
      `MATCH (sp:SafePlace)
       WHERE (sp.isFull = false OR sp.isFull IS NULL)
       RETURN sp.nodeId AS nodeId, sp.name AS name, sp.point.y AS lat, sp.point.x AS lng,
              sp.capacity AS capacity, sp.contact AS contact,
              point.distance(sp.point, point({latitude: $lat, longitude: $lng, srid: 4326})) AS dist
       ORDER BY dist LIMIT 1`,
      { lat, lng }
    );
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'no-safe-place-found' });
    }

    const rec = result.records[0];
    const target = {
      nodeId: rec.get('nodeId'), name: rec.get('name'),
      lat: rec.get('lat'), lng: rec.get('lng'),
      capacity: rec.get('capacity'), contact: rec.get('contact'),
    };

    const route = await findRoute(lat, lng, target.lat, target.lng);
    if (route.error || !route.coords || route.coords.length === 0) {
      return res.json({
        status: 'no-safe-route', shelterInPlace: true,
        message: 'All roads to this safe place are flooded. Shelter on high ground.',
        camp: target, destination: target, coords: [],
      });
    }

    res.json({
      status: 'ok', shelterInPlace: false,
      camp: target, destination: target,
      distanceM: route.distanceM, distanceMeters: route.distanceM,
      hops: route.hops, isFloodedAvoided: true, coords: route.coords,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await s.close();
  }
});

r.get('/floods', async (req, res) => {
  try {
    const segments = await getFloodedRoads();
    res.json({ ok: true, count: segments.length, segments });
  } catch (e) {
    res.json({ ok: true, count: 0, segments: [], warning: e.message });
  }
});

r.post('/floods/mark', async (req, res) => {
  try {
    const { lat, lng, radiusM = 300 } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat-lng-required' });
    const marked = await markRoadsFlooded(Number(lat), Number(lng), Number(radiusM));
    req.app.get('io')?.emit('graph:updated', { lat, lng, radiusM, marked });
    res.json({ ok: true, marked, roadsFlooded: marked });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

r.post('/floods/clear', async (req, res) => {
  try {
    const cleared = await clearAllFloods();
    req.app.get('io')?.emit('graph:updated', { cleared });
    res.json({ ok: true, cleared, message: 'All floods cleared' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = r;