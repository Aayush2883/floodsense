require('dotenv').config();
const { ddb } = require('./src/db/dynamo');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');

const lat = Number(process.argv[2] || 25.6100);
const lng = Number(process.argv[3] || 85.1377);

(async () => {
  const item = {
    sensorId: 'sensor-01',
    timestamp: new Date().toISOString(),
    waterLevelCm: 165,
    rainfallMm: 14.2,
    regionCode: `${Math.floor(lat * 100) / 100}_${Math.floor(lng * 100) / 100}`,
    lat,
    lng,
    source: 'manual-test',
    alert: 'DANGER',
  };
  await ddb.send(new PutCommand({
    TableName: process.env.DDB_SENSOR_READINGS, Item: item,
  }));
  console.log('injected DANGER reading at', lat, lng);
  console.log('watch Terminal 1 — the watcher fires within 5 seconds');
})().catch(e => console.error('FAILED:', e.name, '-', e.message));