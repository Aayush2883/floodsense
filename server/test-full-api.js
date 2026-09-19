const axios = require('axios');

const API = 'http://localhost:4000';

async function testAll() {
  console.log(' Starting Full FloodSense API Suite Test...\n');

  try {
    // 1. Health
    const health = await axios.get(`${API}/api/health`);
    console.log('1??  Health Check:', health.data);

    // 2. Auth Signup / Login
    const email = `test_${Date.now()}@flood.com`;
    const signup = await axios.post(`${API}/api/auth/signup`, {
      email,
      password: 'password123',
      name: 'Ayush Kumar'
    });
    const token = signup.data.token;
    console.log('2??  Auth Signup OK: Token generated for', email);

    const headers = { Authorization: `Bearer ${token}` };

    // 3. Family Watch - Add Family Member
    const addFamily = await axios.post(`${API}/api/family`, {
      name: 'Papa',
      phone: '+919559131611',
      pinCode: '800001',
      relationship: 'father'
    }, { headers });
    console.log('3??  Family Watch [POST /api/family]:', addFamily.data.contact.name, 'in', addFamily.data.regionCode);

    // 4. Family Watch - List Contacts
    const listFamily = await axios.get(`${API}/api/family`, { headers });
    console.log('4??  Family Watch [GET /api/family]:', listFamily.data.contacts.length, 'contacts, status:', listFamily.data.contacts[0].status);

    // 5. Community Safe Places - Submit a Safe Place
    const addSafe = await axios.post(`${API}/api/safeplaces`, {
      name: 'Krishna Temple Terrace',
      type: 'temple',
      capacity: 40,
      contact: '+91-9876543210',
      lat: 25.6150,
      lng: 85.1450,
      notes: '3rd floor terrace, safe high ground'
    }, { headers });
    console.log('5??  Safe Places [POST /api/safeplaces]:', addSafe.data.name, 'NodeId:', addSafe.data.nodeId);

    // 6. Community Safe Places - Nearby List
    const listSafe = await axios.get(`${API}/api/safeplaces/nearby?lat=25.6107&lng=85.1416&radiusM=5000`);
    console.log('6??  Safe Places [GET /api/safeplaces/nearby]:', listSafe.data.count, 'safe places found');

    // 7. Safe Route Finder to Relief Camp
    const campRoute = await axios.get(`${API}/api/route/camp?lat=25.6107&lng=85.1416`, { headers });
    console.log('7??  Route to Camp [GET /api/route/camp]: Destination:', campRoute.data.destination.name, 'Distance:', campRoute.data.distanceMeters, 'm');

    // 8. Safe Route Finder to Safe Place
    const safeRoute = await axios.get(`${API}/api/route/safeplace?lat=25.6107&lng=85.1416`, { headers });
    console.log('8??  Route to Safe Place [GET /api/route/safeplace]: Destination:', safeRoute.data.destination.name, 'Distance:', safeRoute.data.distanceMeters, 'm');

    // 9. Admin Flooded Roads
    const flooded = await axios.get(`${API}/api/admin/flooded?lat=25.6107&lng=85.1416`);
    console.log('9??  Admin Flooded Edges [GET /api/admin/flooded]:', flooded.data.count, 'flooded road segments');

    // 10. Admin Heatmap
    const heatmap = await axios.get(`${API}/api/admin/heatmap`);
    console.log('?? Admin Heatmap [GET /api/admin/heatmap]:', heatmap.data.points.length, 'data points');

    console.log('\n?? ALL 10 BACKEND ENDPOINTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('? Test failed at:', err.response?.config?.url || err.config?.url, '->', err.response?.data || err.message);
  }
}

testAll();

