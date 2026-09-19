const { ddb } = require('../db/dynamo');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { session } = require('../db/neo4j');

const TABLE_REGIONS = process.env.DYNAMODB_TABLE_REGIONS || process.env.TABLE_REGIONS || 'RegionsIngested';
const PRIMARY_OVERPASS = 'https://overpass-api.de/api/interpreter';
const FALLBACK_OVERPASS = 'https://overpass.kumi.systems/api/interpreter';
const HIGHWAY_TYPES = 'motorway|trunk|primary|secondary|tertiary|residential|unclassified';
const BATCH_SIZE = 500;

// Track ongoing ingestion promises to prevent race conditions
const inProgressIngestions = new Map();

function getRegionCode(lat, lng) {
  const rLat = Math.floor(Number(lat) * 10) / 10;
  const rLng = Math.floor(Number(lng) * 10) / 10;
  return `${rLat}_${rLng}`;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const nodeId = (lat, lng) => `n_${Number(lat).toFixed(6)}_${Number(lng).toFixed(6)}`;

// 25km bounding box around center (lat, lng)
function get25KmBoundingBox(lat, lng) {
  const centerLat = Number(lat);
  const centerLng = Number(lng);
  const halfSideMeters = 12500; // 12.5km each side -> 25km x 25km bounding box
  const dLat = halfSideMeters / 111000;
  const radLat = (centerLat * Math.PI) / 180;
  const dLng = halfSideMeters / (111000 * Math.max(0.01, Math.cos(radLat)));

  return {
    south: Number((centerLat - dLat).toFixed(4)),
    west: Number((centerLng - dLng).toFixed(4)),
    north: Number((centerLat + dLat).toFixed(4)),
    east: Number((centerLng + dLng).toFixed(4)),
  };
}

async function fetchOverpassRoads(bbox, attempt = 1) {
  const query = `
    [out:json][timeout:60];
    (
      way["highway"~"^(${HIGHWAY_TYPES})$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out geom;
  `;

  const endpoints = [PRIMARY_OVERPASS, FALLBACK_OVERPASS];
  const url = endpoints[(attempt - 1) % endpoints.length];

  try {
    console.log(`[regionIngester] fetching roads from ${url} (attempt ${attempt}) for bbox `, bbox);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'FloodSense/1.0 (emergency flood response platform)',
        'Accept': 'application/json',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      throw new Error(`Overpass HTTP ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const ways = (json.elements || []).filter((e) => e.type === 'way' && Array.isArray(e.geometry));
    console.log(`[regionIngester] Overpass returned ${ways.length} ways`);
    return ways;
  } catch (err) {
    console.warn(`[regionIngester] Overpass attempt ${attempt} failed: ${err.message}`);
    if (attempt >= 3) {
      throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    return fetchOverpassRoads(bbox, attempt + 1);
  }
}

function buildSegments(ways) {
  const segments = [];
  for (const way of ways) {
    const g = way.geometry;
    for (let i = 0; i < g.length - 1; i++) {
      const a = g[i];
      const b = g[i + 1];
      if (!a || !b) continue;
      segments.push({
        roadId: `w${way.id}_${i}`,
        aId: nodeId(a.lat, a.lon),
        aLat: a.lat,
        aLng: a.lon,
        bId: nodeId(b.lat, b.lon),
        bLat: b.lat,
        bLng: b.lon,
        distM: haversine(a.lat, a.lon, b.lat, b.lon),
        highway: way.tags?.highway ?? 'unknown',
        name: way.tags?.name ?? null,
      });
    }
  }
  return segments;
}

const UPSERT = `
UNWIND $batch AS seg
MERGE (a:Location { nodeId: seg.aId })
  ON CREATE SET a.point = point({ latitude: seg.aLat, longitude: seg.aLng, srid: 4326 })
MERGE (b:Location { nodeId: seg.bId })
  ON CREATE SET b.point = point({ latitude: seg.bLat, longitude: seg.bLng, srid: 4326 })
MERGE (a)-[r:ROAD { roadId: seg.roadId }]->(b)
  ON CREATE SET r.distanceM = seg.distM,
                r.highway   = seg.highway,
                r.name      = seg.name,
                r.isFlooded = false
`;

async function ingestRegion(regionCode, lat, lng) {
  console.log(`[regionIngester] Starting ingestion for ${regionCode} near (${lat}, ${lng})...`);
  const bbox = get25KmBoundingBox(lat, lng);
  const ways = await fetchOverpassRoads(bbox);
  const segments = buildSegments(ways);

  console.log(`[regionIngester] Built ${segments.length} road segments to batch-merge into Neo4j`);

  if (segments.length > 0) {
    const s = session();
    try {
      for (let i = 0; i < segments.length; i += BATCH_SIZE) {
        const batch = segments.slice(i, i + BATCH_SIZE);
        await s.run(UPSERT, { batch });
      }
      console.log(`[regionIngester] Successfully merged ${segments.length} segments into Neo4j`);
    } finally {
      await s.close();
    }
  }

  // Record READY status in DynamoDB
  const item = {
    regionCode,
    lat: Number(lat),
    lng: Number(lng),
    status: 'READY',
    segmentsIngested: segments.length,
    bbox,
    updatedAt: new Date().toISOString(),
    timestamp: Date.now(),
  };

  try {
    await ddb.send(new PutCommand({
      TableName: TABLE_REGIONS,
      Item: item,
    }));
    console.log(`[regionIngester] Recorded ${regionCode} as READY in DynamoDB table ${TABLE_REGIONS}`);
  } catch (ddbErr) {
    console.warn(`[regionIngester] Warning saving region to DynamoDB: ${ddbErr.message}`);
  }

  return { status: 'ready', cached: false, regionCode, segmentsCount: segments.length };
}

async function ensureRegion(lat, lng) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) {
    throw new Error('Invalid latitude or longitude');
  }

  const regionCode = getRegionCode(numLat, numLng);

  // 1. Check DynamoDB table first
  try {
    const result = await ddb.send(new GetCommand({
      TableName: TABLE_REGIONS,
      Key: { regionCode },
    }));

    if (result.Item && result.Item.status === 'READY') {
      return { status: 'ready', cached: true, regionCode };
    }
  } catch (checkErr) {
    console.warn(`[regionIngester] DynamoDB check error for ${regionCode}: ${checkErr.message}`);
  }

  // 2. If already being ingested, join the in-progress promise
  if (inProgressIngestions.has(regionCode)) {
    return await inProgressIngestions.get(regionCode);
  }

  // 3. Trigger ingestion with lock
  const ingestionPromise = (async () => {
    try {
      return await ingestRegion(regionCode, numLat, numLng);
    } finally {
      inProgressIngestions.delete(regionCode);
    }
  })();

  inProgressIngestions.set(regionCode, ingestionPromise);
  return await ingestionPromise;
}

module.exports = {
  getRegionCode,
  ensureRegion,
  get25KmBoundingBox,
};
