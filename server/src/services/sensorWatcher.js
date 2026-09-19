const { randomUUID } = require('crypto');
const { ddb } = require('../db/dynamo');
const { ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { markRoadsFlooded } = require('../graph/routing');

const POLL_MS = 5000;
const FLOOD_RADIUS_M = 450;
const COOLDOWN_MS = 60000;

const seen = new Set();
const lastAlert = new Map();
let primed = false;

async function dangerReadings() {
  const out = await ddb.send(new ScanCommand({
    TableName: process.env.DDB_SENSOR_READINGS || process.env.DYNAMODB_TABLE_SENSOR_READINGS || 'SensorReadings',
    FilterExpression: '#a = :d',
    ExpressionAttributeNames: { '#a': 'alert' },
    ExpressionAttributeValues: { ':d': 'DANGER' },
  }));
  return out.Items || [];
}

async function raiseAlert(reading, io) {
  const roadsFlooded = await markRoadsFlooded(reading.lat, reading.lng, FLOOD_RADIUS_M);

  const alert = {
    alertId: randomUUID(),
    timestamp: new Date().toISOString(),
    sensorId: reading.sensorId,
    regionCode: reading.regionCode,
    lat: reading.lat,
    lng: reading.lng,
    waterLevelCm: reading.waterLevelCm,
    severity: 'DANGER',
    roadsFlooded,
    source: 'sensor',
    message: `Water at ${reading.waterLevelCm}cm near ${reading.regionCode}. `
           + `${roadsFlooded} road segments closed. Move to higher ground.`,
  };

  try {
    await ddb.send(new PutCommand({ TableName: process.env.DDB_ALERTS || process.env.DYNAMODB_TABLE_ALERTS || 'Alerts', Item: alert }));
  } catch (e) {
    console.warn('[watcher] Alerts write failed:', e.name, '-', e.message);
  }

  console.log(`[watcher] DANGER ${reading.sensorId} ${reading.waterLevelCm}cm `
            + `-> ${roadsFlooded} roads flooded`);

  io?.emit('alert:new', alert);
  io?.emit('graph:updated', {
    lat: reading.lat, lng: reading.lng,
    radius: FLOOD_RADIUS_M, roadsFlooded, severity: 'DANGER',
  });
}

async function tick(io) {
  const items = await dangerReadings();

  if (!primed) {
    items.forEach(i => seen.add(`${i.sensorId}|${i.timestamp}`));
    primed = true;
    console.log(`[watcher] watching SensorReadings (${seen.size} existing DANGER rows ignored)`);
    return;
  }

  const fresh = items
    .filter(i => !seen.has(`${i.sensorId}|${i.timestamp}`))
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));

  for (const reading of fresh) {
    seen.add(`${reading.sensorId}|${reading.timestamp}`);
    if (!reading.lat || !reading.lng) continue;

    const last = lastAlert.get(reading.sensorId) || 0;
    if (Date.now() - last < COOLDOWN_MS) continue;
    lastAlert.set(reading.sensorId, Date.now());

    await raiseAlert(reading, io);
  }
}

function startSensorWatcher(io) {
  const run = () => tick(io).catch(e => console.warn('[watcher]', e.name, '-', e.message));
  run();
  setInterval(run, POLL_MS);
}

module.exports = { startSensorWatcher };