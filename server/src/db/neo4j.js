const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

function session() {
  return driver.session({ database: process.env.NEO4J_DATABASE });
}

async function verifyNeo4j() {
  await driver.verifyConnectivity();
  console.log('[neo4j] connected');
}

module.exports = { driver, session, verifyNeo4j };