const { Router } = require('express');
const { ensureRegion, getRegionCode } = require('../services/regionIngester');

const r = Router();

// GET /api/region/ensure?lat=X&lng=Y
r.get('/ensure', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat-and-lng-required' });
    }

    const regionCode = getRegionCode(lat, lng);
    console.log(`[GET /api/region/ensure] Checking region ${regionCode} for (${lat}, ${lng})`);

    const result = await ensureRegion(lat, lng);
    return res.json({
      status: 'ready',
      cached: !!result.cached,
      regionCode: result.regionCode || regionCode,
      segmentsCount: result.segmentsCount,
    });
  } catch (err) {
    console.error('[GET /api/region/ensure] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = r;
