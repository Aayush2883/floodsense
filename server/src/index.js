require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server: SocketServer } = require('socket.io');
const { connectMongo } = require('./db/mongo');
const authRoutes = require('./routes/auth.routes');
const reportsRoutes = require('./routes/reports.routes');
const routeRoutes = require('./routes/route.routes');
const alertRoutes = require('./routes/alerts.routes');
const { startSensorWatcher } = require('./services/sensorWatcher');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(require('path').join(__dirname, '..', 'public')));
app.use('/api/reports', reportsRoutes);
app.use('/api/route', routeRoutes);
app.use('/api', alertRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now(), service: 'floodsense-server' });
});

app.use('/api/auth', authRoutes);

const httpServer = createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: '*' } });
app.set('io', io);
startSensorWatcher(io);

const port = Number(process.env.PORT || 4000);

connectMongo()
  .then(() => {
    httpServer.listen(port, () => console.log(`[api] listening on :${port}`));
  })
  .catch((err) => {
    console.error('[mongo] connection failed:', err.message);
    process.exit(1);
  });