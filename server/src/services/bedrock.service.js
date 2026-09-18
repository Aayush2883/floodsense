const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

async function claudeJSON(systemPrompt, userPrompt) {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 800,
    system: systemPrompt,
    messages: [{ role: 'user', content: [{ type: 'text', text: userPrompt }] }],
  };

  const out = await client.send(new InvokeModelCommand({
    modelId: process.env.BEDROCK_TEXT_MODEL,
    contentType: 'application/json',
    accept: 'application/json',
    body: Buffer.from(JSON.stringify(body)),
  }));

  const parsed = JSON.parse(new TextDecoder().decode(out.body));
  const text = parsed.content?.[0]?.text ?? '';
  const clean = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(clean);
}

module.exports = { claudeJSON };