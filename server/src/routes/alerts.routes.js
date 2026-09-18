const { Router } = require('express');
const { ddb } = require('../db/dynamo');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

const r = Router();

r.get('/alerts', async (req, res) => {
  try {
    const out = await ddb.send(new ScanCommand({
      TableName: process.env.DDB_ALERTS, Limit: 50,
    }));
    const alerts = (out.Items || [])
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    res.json({ count: alerts.length, alerts });
  } catch (e) {
    res.json({ count: 0, alerts: [], warning: e.name });
  }
});

r.get('/sensors', async (req, res) => {
  try {
    const out = await ddb.send(new ScanCommand({
      TableName: process.env.DDB_SENSOR_READINGS,
    }));
    const latest = new Map();
    for (const item of out.Items || []) {
      const prev = latest.get(item.sensorId);
      if (!prev || String(item.timestamp) > String(prev.timestamp)) {
        latest.set(item.sensorId, item);
      }
    }
    res.json({ sensors: [...latest.values()] });
  } catch (e) {
    res.json({ sensors: [], warning: e.name });
  }
});

module.exports = r;