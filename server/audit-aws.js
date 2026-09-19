process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';
require('dotenv').config();
const AWS = require('aws-sdk');
AWS.config.update({ region: process.env.AWS_REGION });

const ddb = new AWS.DynamoDB();
const doc = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const sns = new AWS.SNS();
const iot = new AWS.Iot();

const show = (label, fn) => fn().then(
  (v) => console.log(`${label}: ${v}`),
  (e) => console.log(`${label}: ERROR ${e.code}`)
);

(async () => {
  console.log('region:', process.env.AWS_REGION);

  console.log('\n--- DynamoDB ---');
  await show('tables', async () =>
    (await ddb.listTables().promise()).TableNames.join(', '));
  for (const t of ['SensorReadings', 'Reports', 'Alerts']) {
    await show(`  ${t}`, async () =>
      `${(await ddb.describeTable({ TableName: t }).promise()).Table.ItemCount} items`);
  }

  console.log('\n--- latest sensor readings ---');
  await show('rows', async () => {
    const r = await doc.scan({ TableName: 'SensorReadings', Limit: 20 }).promise();
    if (!r.Items.length) return 'NONE';
    const rows = r.Items
      .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
      .slice(0, 3)
      .map(i => `\n  ${i.sensorId} | ${i.timestamp} | ${i.waterLevelCm}cm | ${i.alert}`);
    return rows.join('');
  });

  console.log('\n--- S3 ---');
  await show('buckets', async () =>
    (await s3.listBuckets().promise()).Buckets.map(b => b.Name).join(', '));

  console.log('\n--- SNS ---');
  await show('subscriptions', async () => {
    const r = await sns.listSubscriptionsByTopic(
      { TopicArn: process.env.SNS_TOPIC_ARN }).promise();
    if (!r.Subscriptions.length) return 'NONE - no SMS can ever be delivered';
    return r.Subscriptions.map(s =>
      `\n  ${s.Protocol} ${s.Endpoint} -> ${
        s.SubscriptionArn === 'PendingConfirmation' ? 'NOT CONFIRMED' : 'confirmed'}`
    ).join('');
  });

  console.log('\n--- IoT Core ---');
  await show('things', async () =>
    (await iot.listThings().promise()).things.map(t => t.thingName).join(', '));

  let ruleNames = [];
  await show('rules', async () => {
    const r = await iot.listTopicRules().promise();
    ruleNames = r.rules.map(x => x.ruleName);
    return ruleNames.length ? ruleNames.join(', ') : 'NONE - sensor data goes nowhere';
  });

  for (const name of ruleNames) {
    await show(`\n  [${name}]`, async () => {
      const r = await iot.getTopicRule({ ruleName: name }).promise();
      const actions = r.rule.actions.map(a => Object.keys(a)[0]).join(', ');
      return `\n    SQL:      ${r.rule.sql}\n    actions:  ${actions}\n    disabled: ${r.rule.ruleDisabled}`;
    });
  }
    console.log('\n--- Alerts key schema ---');
  await show('keys', async () =>
    JSON.stringify((await ddb.describeTable({ TableName: 'Alerts' }).promise()).Table.KeySchema));
})();