require('dotenv').config();
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

const PROMPT = `You extract structured JSON from Indian flood reports. Reply with only JSON, no prose, no code fences.

Transcript (hi-IN): "Bhaiya, Rajendra Nagar Patna mein paani ghutne tak aa gaya hai, gaadi nahi nikal paa rahi, jaldi kuch karo."

Return JSON with these keys:
locationText, severity ("LOW"|"MEDIUM"|"HIGH"|"DANGER"), hazardType ("waterlogging"|"road-blocked"|"building-damage"|"missing-person"|"other"), waterLevelEstimate ("ankle"|"knee"|"waist"|"chest"|"above-head"|"unknown"), casualtiesMentioned (boolean), summary (one-line English)`;

const CANDIDATES = [
  'au.anthropic.claude-opus-4-6-v1:0',
  'au.anthropic.claude-opus-4-6-v1',
];

async function tryModel(modelId) {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 500,
    messages: [{ role: 'user', content: [{ type: 'text', text: PROMPT }] }],
  };
  const out = await client.send(new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: Buffer.from(JSON.stringify(body)),
  }));
  const parsed = JSON.parse(new TextDecoder().decode(out.body));
  return parsed.content[0].text;
}

(async () => {
  console.log('key present:', !!process.env.AWS_BEARER_TOKEN_BEDROCK);
  console.log('region:', process.env.AWS_REGION);

  for (const id of CANDIDATES) {
    try {
      console.log(`\nTrying: ${id}`);
      const text = await tryModel(id);
      console.log('SUCCESS\n');
      console.log(text);
      console.log(`\n>>> Add this to .env:\nBEDROCK_TEXT_MODEL=${id}`);
      return;
    } catch (e) {
      console.log(`  failed: ${e.name} — ${e.message.slice(0, 150)}`);
    }
  }
  console.log('\nAll candidates failed — paste the errors above.');
})();