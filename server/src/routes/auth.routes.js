const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const r = Router();

r.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'missing-fields' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'email-exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name, phone });
    const token = jwt.sign({ uid: user.id, email }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, user: { id: user.id, email, name } });
  } catch (e) {
    console.error('[signup]', e);
    res.status(500).json({ error: 'server-error' });
  }
});

r.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid-credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid-credentials' });

    const token = jwt.sign({ uid: user.id, email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email, name: user.name } });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: 'server-error' });
  }
});

r.get('/me', requireAuth, async (req, res) => {
  const u = await User.findById(req.user.uid).lean();
  if (!u) return res.status(404).json({ error: 'not-found' });
  res.json({ id: u._id, email: u.email, name: u.name });
});

r.post('/push-token', requireAuth, async (req, res) => {
  await User.updateOne({ _id: req.user.uid }, { expoPushToken: req.body.token });
  res.json({ ok: true });
});

module.exports = r;