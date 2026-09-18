const { claudeJSON } = require('./bedrock.service');

const SYSTEM = `You extract structured JSON from citizen flood reports in India. Reply with only a JSON object, no prose, no code fences.

Severity guidance:
- LOW: minor puddles, passable
- MEDIUM: ankle-deep, slow movement
- HIGH: knee to waist deep, vehicles blocked, people stranded
- DANGER: chest deep or above, buildings flooded, lives at risk, casualties mentioned`;

async function extractReport({ text, lang = 'unknown', lat, lng }) {
  const userPrompt = `Report text (${lang}):
"""
${text}
"""

Reporter GPS: lat=${lat}, lng=${lng}

Return JSON with exactly these keys:
locationText (string - the place named in the report),
severity ("LOW"|"MEDIUM"|"HIGH"|"DANGER"),
hazardType ("waterlogging"|"road-blocked"|"building-damage"|"missing-person"|"other"),
waterLevelEstimate ("ankle"|"knee"|"waist"|"chest"|"above-head"|"unknown"),
casualtiesMentioned (boolean),
summary (one-line English summary)`;

  return claudeJSON(SYSTEM, userPrompt);
}

module.exports = { extractReport };