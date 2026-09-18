const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const { extractReport } = require('../services/reportExtractor');

const r = Router();

r.post('/text', requireAuth, async (req, res) => {
  try {
    const { text, lang, lat, lng } = req.body;
    if (!text) return res.status(400).json({ error: 'text-required' });

    const started = Date.now();
    const extracted = await extractReport({ text, lang, lat, lng });
    const latencyMs = Date.now() - started;

    res.json({
      ok: true,
      userId: req.user.uid,
      input: { text, lang, lat, lng },
      extracted,
      latencyMs,
    });
  } catch (e) {
    console.error('[reports/text]', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = r;