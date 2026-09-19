const { Router } = require('express');
const { session } = require('../db/neo4j');
const { ddb } = require('../db/dynamo');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

const r = Router();

r.get('/flooded', async (req, res) => {
  const lat = Number(req.query.lat) || 25.6107;
  const lng = Number(req.query.lng) || 85.1416;
  const radiusM = Number(req.query.radiusM) || 10000;

  const s = session();
  try {
    const result = await s.run(
      `MATCH (a:Location)-[r:ROAD]->(b:Location)
       WHERE r.isFlooded = true
         AND point.distance(a.point, point({latitude: $lat, longitude: $lng, srid: 4326})) < $radiusM
       RETURN a.point.y AS aLat, a.point.x AS aLng,
              b.point.y AS bLat, b.point.x AS bLng,
              r.roadName AS roadName, r.floodLevel AS floodLevel,
              r.floodedAt AS floodedAt
       LIMIT 500`,
      { lat, lng, radiusM }
    );

    const edges = result.records.map(rec => ({
      from: { lat: rec.get('aLat'), lng: rec.get('aLng') },
      to: { lat: rec.get('bLat'), lng: rec.get('bLng') },
      roadName: rec.get('roadName') || 'Road Segment',
      floodLevel: rec.get('floodLevel') || 0,
      floodedAt: rec.get('floodedAt')
    }));

    res.json({ ok: true, count: edges.length, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await s.close();
  }
});

r.get('/heatmap', async (req, res) => {
  try {
    const scan = await ddb.send(new ScanCommand({
      TableName: process.env.DYNAMODB_TABLE_REPORTS || 'Reports',
      Limit: 100
    }));

    const points = (scan.Items || []).map(item => ({
      lat: item.lat || item.location?.lat,
      lng: item.lng || item.location?.lng,
      severity: item.extracted?.severity || item.severity || 'MEDIUM',
      weight: item.severity === 'DANGER' ? 1.0 : (item.severity === 'HIGH' ? 0.7 : 0.4)
    })).filter(p => p.lat && p.lng);

    res.json({ ok: true, points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = r;
