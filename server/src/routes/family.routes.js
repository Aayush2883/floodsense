const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { LocationClient, SearchPlaceIndexForTextCommand } = require('@aws-sdk/client-location');
const { ddb } = require('../db/dynamo');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const User = require('../models/User');

const r = Router();
const location = new LocationClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

async function geocodePin(pinCode) {
  try {
    const cmd = new SearchPlaceIndexForTextCommand({
      IndexName: process.env.PLACE_INDEX_NAME || 'floodsense-places',
      Text: `${pinCode}, India`,
      MaxResults: 1
    });
    const res = await location.send(cmd);
    if (res.Results && res.Results.length > 0) {
      const [lng, lat] = res.Results[0].Place.Geometry.Point;
      const label = res.Results[0].Place.Label;
      return { lat, lng, label };
    }
  } catch (err) {
    console.warn('[family] Geocoding fallback for PIN:', pinCode, err.message);
  }
  return { lat: 25.6107, lng: 85.1416, label: `PIN ${pinCode}, Patna` };
}

// same rounding as reports.routes.js so family and alert region codes match
function getRegionCode(lat, lng) {
  return `${(Math.floor(lat * 100) / 100).toFixed(2)}_${(Math.floor(lng * 100) / 100).toFixed(2)}`;
}

r.post('/', requireAuth, async (req, res) => {
  try {
    const { name, relation, pinCode, phone } = req.body;
    if (!name || !pinCode) return res.status(400).json({ error: 'name-and-pincode-required' });
    const coords = await geocodePin(pinCode);
    const contact = {
      name,
      relation: relation || 'Family',
      pinCode,
      phone: phone || '',
      lat: coords.lat,
      lng: coords.lng,
      regionCode: getRegionCode(coords.lat, coords.lng),
      addedAt: new Date()
    };
    const user = await User.findByIdAndUpdate(
      req.user.uid,
      { $push: { familyWatchList: contact } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'user-not-found' });
    res.status(201).json({ ok: true, contact, totalContacts: user.familyWatchList.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

r.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.uid).lean();
    const contacts = user?.familyWatchList || [];

    let activeAlerts = [];
    try {
      const alertScan = await ddb.send(new ScanCommand({
        TableName: process.env.DDB_ALERTS || process.env.DYNAMODB_TABLE_ALERTS || 'Alerts',
        Limit: 50
      }));
      activeAlerts = alertScan.Items || [];
    } catch (e) {
      console.warn('[family] alerts scan skipped:', e.name);
    }

    const enriched = contacts.map(c => {
      const match = activeAlerts.find(a => a.regionCode === c.regionCode);
      return { ...c, id: String(c._id), status: match ? 'DANGER' : 'SAFE', activeAlert: match || null };
    });
    res.json({ ok: true, contacts: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

r.delete('/:id', requireAuth, async (req, res) => {
  try {
    await User.updateOne({ _id: req.user.uid }, { $pull: { familyWatchList: { _id: req.params.id } } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = r;
