require('dotenv').config();
const { session, verifyNeo4j, driver } = require('./src/db/neo4j');

(async () => {
  console.log('URI:', process.env.NEO4J_URI);
  console.log('user:', process.env.NEO4J_USER);
  console.log('database:', process.env.NEO4J_DATABASE);

  await verifyNeo4j();

  const s = session();
  try {
    const r = await s.run('RETURN 1 AS n, datetime() AS now');
    console.log('query ok:', r.records[0].get('n').toNumber(), r.records[0].get('now').toString());

    const counts = await s.run('MATCH (n) RETURN count(n) AS total');
    console.log('nodes in db:', counts.records[0].get('total').toNumber());
  } finally {
    await s.close();
    await driver.close();
  }
})().catch(e => {
  console.error('FAILED:', e.code || e.name);
  console.error(e.message);
  process.exit(1);
});