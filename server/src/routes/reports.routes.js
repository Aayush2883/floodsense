const { Router } = require('express');
const { randomUUID } = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { extractReport } = require('../services/reportExtractor');
const { geocode } = require('../services/geocode.service');
const { markRoadsFlooded } = require('../graph/routing');
const { ddb } = require('../db/dynamo');
const { PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const r = Router();

const FLOOD_RADIUS = { LOW: 0, MEDIUM: 150, HIGH: 350, DANGER: 600 };

function regionCode(lat, lng) {
  return `${(Math.floor(lat * 100) / 100).toFixed(2)}_${(Math.floor(lng * 100) / 100).toFixed(2)}`;
}

r.post('/text', requireAuth, async (req, res) => {
  const t0 = Date.now();
  try {
    const { text, lang = 'unknown', lat, lng } = req.body;
    if (!text) return res.status(400).json({ error: 'text-required' });

    const extracted = await extractReport({ text, lang, lat, lng });

    const geo = await geocode(extracted.locationText, lat, lng);
    const finalLat = geo?.lat ?? lat;
    const finalLng = geo?.lng ?? lng;

    let roadsFlooded = 0;
    const radius = FLOOD_RADIUS[extracted.severity] ?? 0;
    if (radius > 0 && finalLat && finalLng) {
      roadsFlooded = await markRoadsFlooded(finalLat, finalLng, radius);
      req.app.get('io')?.emit('graph:updated', {
        lat: finalLat, lng: finalLng, radius, roadsFlooded, severity: extracted.severity,
      });
    }

    const reportId = randomUUID();
    const item = {
      reportId,
      createdAt: Date.now(),
      userId: req.user.uid,
      regionCode: finalLat && finalLng ? regionCode(finalLat, finalLng) : 'unknown',
      kind: 'text',
      lang,
      text,
      lat: finalLat,
      lng: finalLng,
      geocodedLabel: geo?.label ?? null,
      extracted,
      roadsFlooded,
      status: 'active',
    };
    let persisted = false;
    try {
      await ddb.send(new PutCommand({ TableName: process.env.DDB_REPORTS || process.env.DYNAMODB_TABLE_REPORTS, Item: item }));
      persisted = true;
    } catch (e) {
      console.warn('[reports] DynamoDB write skipped:', e.name);
    }

    req.app.get('io')?.emit('report:new', item);

    res.json({ ok: true, reportId, extracted, geocoded: geo, roadsFlooded, persisted, latencyMs: Date.now() - t0 });
  } catch (e) {
    console.error('[reports/text]', e);
    res.status(500).json({ error: e.message });
  }
});

r.get('/', async (req, res) => {
  try {
    const out = await ddb.send(new ScanCommand({ TableName: process.env.DDB_REPORTS, Limit: 100 }));
    const items = (out.Items || []).sort((a, b) => b.createdAt - a.createdAt);
    res.json({ count: items.length, reports: items });
  } catch (e) {
    console.warn('[reports] scan skipped:', e.name);
    res.json({ count: 0, reports: [], warning: 'dynamodb-unavailable' });
  }
});

module.exports = r;