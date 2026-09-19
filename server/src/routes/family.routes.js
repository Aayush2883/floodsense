const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { LocationClient, SearchPlaceIndexForTextCommand } = require('@aws-sdk/client-location');
const { ddb } = require('../db/dynamo');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');

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

const familyStore = new Map();

r.post('/', requireAuth, async (req, res) => {
  try {
    const { name, phone, pinCode, relationship } = req.body;
    if (!name || !pinCode) {
      return res.status(400).json({ error: 'name-and-pincode-required' });
    }

    const geo = await geocodePin(pinCode);
    const regionCode = `${geo.lat.toFixed(2)}_${geo.lng.toFixed(2)}`;
    const contactId = `fam_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const contact = {
      contactId,
      userId: req.user?.uid || 'anonymous',
      name,
      phone: phone || '',
      pinCode,
      relationship: relationship || 'family',
      location: geo,
      regionCode,
      createdAt: new Date().toISOString()
    };

    const userContacts = familyStore.get(contact.userId) || [];
    userContacts.push(contact);
    familyStore.set(contact.userId, userContacts);

    res.json({ ok: true, contact, regionCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

r.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.uid || 'anonymous';
    const contacts = familyStore.get(userId) || [];

    let activeAlerts = [];
    try {
      const alertScan = await ddb.send(new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE_ALERTS || 'Alerts',
        Limit: 20
      }));
      activeAlerts = alertScan.Items || [];
    } catch (e) {}

    const enrichedContacts = contacts.map(c => {
      const matchingAlert = activeAlerts.find(a => 
        a.regionCode === c.regionCode || a.sensorId?.includes(c.pinCode)
      );
      return {
        ...c,
        status: matchingAlert ? 'DANGER' : 'SAFE',
        activeAlert: matchingAlert || null
      };
    });

    res.json({ ok: true, contacts: enrichedContacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

r.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.uid || 'anonymous';
    const contacts = familyStore.get(userId) || [];
    const updated = contacts.filter(c => c.contactId !== req.params.id);
    familyStore.set(userId, updated);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = r;
