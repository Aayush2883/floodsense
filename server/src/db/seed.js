require('dotenv').config();
const { session } = require('./neo4j');

async function seed() {
  const s = session();
  try {
    console.log('?? Creating Neo4j constraints and indexes...');
    
    // 1. Constraints
    await s.run(`CREATE CONSTRAINT unique_location_node IF NOT EXISTS FOR (l:Location) REQUIRE l.nodeId IS UNIQUE`);
    await s.run(`CREATE CONSTRAINT unique_camp_node IF NOT EXISTS FOR (c:ReliefCamp) REQUIRE c.nodeId IS UNIQUE`);
    await s.run(`CREATE CONSTRAINT unique_safe_node IF NOT EXISTS FOR (s:SafePlace) REQUIRE s.nodeId IS UNIQUE`);

    console.log('??? Seeding 5 Official Relief Camps...');

    const camps = [
      {
        nodeId: 'camp_001',
        name: 'Gandhi Maidan Relief Camp',
        city: 'Patna',
        capacity: 500,
        currentOccupancy: 120,
        contact: '+91-9876543210',
        facilities: ['food', 'water', 'medical', 'shelter'],
        lat: 25.6107,
        lng: 85.1416
      },
      {
        nodeId: 'camp_002',
        name: 'Patna Sahib Community Shelter',
        city: 'Patna',
        capacity: 350,
        currentOccupancy: 85,
        contact: '+91-9876543211',
        facilities: ['food', 'water', 'shelter'],
        lat: 25.5941,
        lng: 85.2285
      },
      {
        nodeId: 'camp_003',
        name: 'Danapur Cantonment Relief Hub',
        city: 'Patna',
        capacity: 600,
        currentOccupancy: 40,
        contact: '+91-9876543212',
        facilities: ['food', 'water', 'medical', 'boats', 'shelter'],
        lat: 25.6320,
        lng: 85.0450
      },
      {
        nodeId: 'camp_004',
        name: 'Marina Relief Center',
        city: 'Chennai',
        capacity: 450,
        currentOccupancy: 60,
        contact: '+91-9876543213',
        facilities: ['food', 'water', 'medical'],
        lat: 13.0475,
        lng: 80.2824
      },
      {
        nodeId: 'camp_005',
        name: 'Tambaram Flood Rescue Shelter',
        city: 'Chennai',
        capacity: 400,
        currentOccupancy: 110,
        contact: '+91-9876543214',
        facilities: ['food', 'water', 'shelter'],
        lat: 12.9249,
        lng: 80.1000
      }
    ];

    for (const c of camps) {
      await s.run(
        `MERGE (c:ReliefCamp {nodeId: $nodeId})
         SET c.name = $name,
             c.city = $city,
             c.capacity = $capacity,
             c.currentOccupancy = $currentOccupancy,
             c.contact = $contact,
             c.facilities = $facilities,
             c.point = point({latitude: $lat, longitude: $lng, srid: 4326})`,
        c
      );
      console.log(`  ? Seeded: ${c.name} (${c.city})`);
    }

    console.log('\n?? Relief Camps successfully seeded in Neo4j!');
  } catch (err) {
    console.error('? Seeding failed:', err.message);
  } finally {
    await s.close();
    process.exit(0);
  }
}

seed();
