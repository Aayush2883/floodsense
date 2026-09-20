# FloodSense

**Flood early-warning and safe-routing for India.**

A citizen reports flooding in Hindi or English. AI understands it. The affected
streets close on a live road graph. Everyone nearby gets a route out that
avoids the water.

Built for **First Commit — Bharat Builds Tour** (WeMakeDevs × AWS) by **Leaf Ninjas**.

---

## The number that matters

A real 8.3 km journey across Patna, with 497 road segments underwater:

| Route | Flooded roads crossed |
| --- | --- |
| **FloodSense** | **0** |
| An ordinary maps app | **33** |

Thirty-three chances to drive into water. FloodSense goes around all of them.

---

## The problem

When a city floods, nobody knows which streets are underwater.

People drive into water deeper than it looks. Others stay home not knowing the
road they would have taken is already gone. Rescue teams work from phone calls
and guesswork.

The information almost always exists — someone has seen it, a sensor has
measured it. It just never reaches the person standing at the edge of it.

FloodSense is about closing that gap in seconds.

---

## How it works

Two completely different inputs converge on one road graph.

```
A citizen types, in Hindi or English:
  "Gandhi Maidan ke paas paani chest tak aa gaya hai, log phase hue hain"
         |
         |-- Amazon Bedrock ----> { severity: DANGER,
         |                          waterLevel: chest,
         |                          casualties: true,
         |                          place: "Gandhi Maidan Patna" }
         |
         |-- AWS Location ------> 25.6158, 85.1445
         |
         '-- Neo4j -------------> 450 road segments closed
                                            |
A water sensor crosses 150 cm:              |
         |                                  |
         |-- AWS IoT Core ------> DynamoDB  |
         |                                  |
         '-- sensor watcher ----> Neo4j ----+
                                            |
                                            v
                         flood-free route to the nearest shelter,
                         broadcast live to every connected device
```

The model's judgement decides how much of the city closes:

| Severity | Radius closed |
| --- | --- |
| LOW | 0 m |
| MEDIUM | 150 m |
| HIGH | 350 m |
| DANGER | 600 m |

**When every road is underwater, it refuses to route.** It says *shelter in
place and await rescue* rather than sending someone into chest-deep water.
A system that cannot admit defeat is worse than no system at all.

---

## Built on AWS

| Service | What it does here |
| --- | --- |
| **Amazon Bedrock** (Claude) | Turns a sentence of Hinglish into structured data — place, severity, water depth, whether people are stranded |
| **AWS Location Service** | Resolves "Gandhi Maidan, Patna" into coordinates |
| **Amazon DynamoDB** | Reports, sensor readings, alerts, ingested regions |
| **AWS IoT Core** | Three water sensors publishing every two seconds; a rule writes readings straight to DynamoDB |
| **Amazon SNS** | Danger alerts by SMS, for people who do not have the app |
| **Amazon S3** | Voice and photo report storage |

Region: `ap-southeast-2`. Bedrock is called through the `au.` regional
inference profile.

Alongside AWS: **Neo4j AuraDB** holds the road graph, **MongoDB Atlas** holds
accounts and family watch lists.

---

## What it does

### Reporting a flood

Type it, speak it, or photograph it. Hindi or English, including Hindi typed
in English letters — which is how most people in India actually text. A
water-depth picker for anyone who would rather tap than write.

No forms. No dropdowns. In a flood, at night, one-handed, a six-field form is
a barrier. A sentence is not.

### The live map

Flooded roads in red. Relief camps and community shelters. Live sensor water
levels. A clear answer to the only question that matters: *am I in danger, and
how far away is it?*

### Getting out

A dry route drawn against the ordinary route, with the number of flooded roads
each one crosses. Distance, walking time, and a share button.

If nothing is safe, a dedicated screen: get to high ground, save battery,
signal to rescuers, call 112, tell people where you are.

### Alerts

Raised automatically when a sensor crosses its danger threshold — no human
involved anywhere in the chain. Each alert can be read aloud, for people who
cannot read the screen.

### Family Watch

Add relatives by PIN code and see whether their area is flooding. They do not
need the app installed. Call them, or send them a safe route, in one tap.

### Community Safe Places

Anyone can register a dry, elevated building — a temple terrace, a school, a
neighbour's second floor. It is wired into the road graph immediately, so
routing can actually reach it.

### Works anywhere

Roads are pulled from OpenStreetMap on demand for whatever area you are in,
then cached. Not limited to one city.

### Degrades gracefully

If the server is unreachable, the app runs on local data and says so, rather
than showing a broken screen. A flood app that dies with the network is
useless precisely when it is needed.

---

## The road graph

Central Patna, from OpenStreetMap:

- **19,077** location nodes
- **20,799** road segments
- Motorway, trunk, primary, secondary, tertiary and residential roads
- Five relief camps, plus community shelters added by users

Routing runs `shortestPath` with flood avoidance applied as a query predicate,
not a filter afterwards — so a flooded road is never part of a candidate path
in the first place.

---

## Repository layout

```
floodsense/
├── server/                     Node + Express API
│   ├── src/
│   │   ├── graph/routing.js    flood marking, route finding, nearest shelter
│   │   ├── services/           Bedrock, geocoding, sensor watcher, region ingest
│   │   ├── routes/             auth, reports, route, alerts, family, safeplaces, admin
│   │   └── db/                 Mongo, Neo4j, DynamoDB clients
│   ├── ingest-osm.js           one-shot OpenStreetMap loader
│   ├── seed-neo4j.js           schema, spatial indexes, relief camps
│   └── verify-all.js           18 end-to-end checks
├── Frontend/                   Expo app — Android, iOS, web
│   ├── src/screens/            13 screens
│   ├── src/components/         map components (native and web)
│   └── web-demo/map.html       plain Leaflet demo page
└── iot-simulator/
    └── simulator.py            three water sensors, three scenarios
```

---

## Running it

### Server

```bash
cd server
cp ../.env.example .env        # then fill in your values
npm install
node seed-neo4j.js             # schema, indexes, relief camps
node ingest-osm.js             # ~100s, loads Patna roads from OpenStreetMap
npm run dev                    # http://localhost:4000
```

### App

```bash
cd Frontend
npm install
npx expo start --web           # http://localhost:8081
npx expo start                 # scan the QR code with Expo Go
```

The app finds the server automatically. If it cannot reach one, it switches to
demo data and shows a chip saying so.

A plain Leaflet page is also served at `http://localhost:4000/map.html`.

### Sensors

```bash
cd iot-simulator
pip install boto3
python simulator.py --sensor-id sensor-01 --scenario flash-flood
```

`flash-flood` crosses the 150 cm danger threshold in about 22 seconds.

---

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create an account, returns a JWT |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user |
| POST | `/api/reports/text` | The main pipeline — text in, flooded roads out |
| GET | `/api/reports` | Recent reports |
| GET | `/api/route/camp` | Nearest shelter plus a flood-free route |
| GET | `/api/route/safe` | Route between two points (`?avoid=false` for the naive route) |
| GET | `/api/route/safeplace` | Nearest community shelter plus route |
| GET | `/api/route/floods` | Flooded segments, for map rendering |
| POST | `/api/route/floods/mark` | Close roads around a point |
| POST | `/api/route/floods/clear` | Reopen every road |
| GET | `/api/alerts` | Recent danger alerts |
| GET | `/api/sensors` | Latest reading per sensor |
| GET | `/api/family` | Family contacts with safe/danger status |
| POST | `/api/family` | Add a contact by PIN code |
| POST | `/api/safeplaces` | Register a community shelter |
| GET | `/api/safeplaces/nearby` | Shelters near a point |
| GET | `/api/region/ensure` | Load OpenStreetMap roads for an area |
| GET | `/api/admin/flooded` | Flooded segments with timestamps |
| GET | `/api/admin/heatmap` | Report density by area |

Live updates are pushed over Socket.io: `graph:updated`, `report:new`,
`alert:new`.

---

## Verification

```bash
cd server && node verify-all.js
```

Eighteen assertions against live AWS, Neo4j and MongoDB:

```
=== 1. SERVER AND ACCOUNTS ===
  PASS  server is up
  PASS  account can be created
  PASS  logged-in user is recognised
  PASS  protected routes reject strangers

=== 2. THE ROAD GRAPH ===
  PASS  a route exists across the city      8298m, 166 hops
  PASS  nearest relief camp is found        Boring Road Relief Point

=== 3. UNDERSTANDING WRITTEN REPORTS (BEDROCK) ===
  PASS  Hindi report graded DANGER
  PASS  "small puddle" graded LOW
  PASS  place name resolved to coordinates
  PASS  report closed roads automatically   450 segments
  PASS  report saved permanently

=== 4. SAFE ROUTING AROUND WATER ===
  PASS  flooded streets can be listed
  PASS  our route crosses ZERO flooded roads
  PASS  the ordinary route drives through water

=== 5. REFUSING WHEN THERE IS NO SAFE WAY ===
  PASS  tells people to shelter in place when cut off

=== 6. SENSORS ACTING ON THEIR OWN ===
  PASS  sensor danger raises an alert with no human involved
  PASS  current sensor readings can be read

=== 7. STORAGE ===
  PASS  reports are stored and retrievable

  18 passed, 0 failed
```

---

## Known limitations

An honest list. A flood app that hides its weaknesses is the wrong kind of
flood app.

- **Floods never recede.** The time each road was closed is recorded but never
  expires. Real water drains; ours does not yet.
- **One report closes a lot of road.** A single unverified sentence can close
  450 segments. Requiring corroboration between reports and sensors is the
  right fix.
- `POST /api/route/floods/mark` and `/clear` are unauthenticated. Acceptable
  on localhost, not for a deployment.
- Nothing is deployed yet; everything runs locally.
- Route finding minimises the number of road segments rather than metres.
  Proper distance weighting needs Dijkstra, which the free Neo4j tier does not
  provide.
- Voice reports use on-device speech recognition rather than the Transcribe
  pipeline the S3 buckets were provisioned for.

---

## Where this goes next

The routing graph for central Patna is about 19,000 nodes. **That fits on a
phone.**

Which means the part of this system that saves your life does not need a
network — and that matters, because floods take the network down first. The
cloud is needed for understanding language and pooling reports from strangers.
Deciding which road is dry is pure local computation over a graph small enough
to ship inside the app.

It also means a whole city's flood state compresses to a single SMS. You do
not sync flooded roads; you sync flood *zones* — a centre, a radius, a
severity, about eight bytes each. The phone already has the map. It only needs
telling where the water is.

That is the roadmap: offline map tiles, on-device routing, region packs per
state, and zone sync over SMS for when the data network is gone.
