require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server: SocketServer } = require('socket.io');
const { connectMongo } = require('./db/mongo');
const { verifyNeo4j } = require('./db/neo4j');
const { startSensorWatcher } = require('./services/sensorWatcher');

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: '*' }
});
app.set('io', io);

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));
// the Leaflet demo page (map.html) lives with the rest of the frontend
app.use(express.static(path.join(__dirname, '../../Frontend/web-demo')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'floodsense-api', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/route', require('./routes/route.routes'));
app.use('/api', require('./routes/alerts.routes'));
app.use('/api/family', require('./routes/family.routes'));
app.use('/api/safeplaces', require('./routes/safeplaces.routes'));
app.use('/api/region', require('./routes/region.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

// Sockets
io.on('connection', (socket) => {
  socket.on('subscribe:region', (regionCode) => {
    socket.join(`region:${regionCode}`);
  });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectMongo();
    await verifyNeo4j();
    startSensorWatcher(io);
    server.listen(PORT,'0.0.0.0', () => {
      console.log(`[api] listening on :${PORT}`);
    });
  } catch (err) {
    console.error('[server] Fatal startup failure:', err.message);
    process.exit(1);
  }
}
start();
