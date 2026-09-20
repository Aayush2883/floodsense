# FloodSense Frontend

Everything the user sees lives in this folder:

- the **Expo / React Native app** (Android, iOS and web; the web build is what we use for the demo video)
- `web-demo/map.html`, the first Leaflet demo page. The server still serves it at `http://localhost:4000/map.html`.

## Run it

```bash
cd Frontend
npm install
npx expo start --web      # website at http://localhost:8081
npx expo start            # scan the QR code with Expo Go on a phone
```

On a wide browser window the app is shown inside a phone frame with a short project blurb, ready for screen recording.

## Server or demo data

On start the app checks `GET /api/health` on the FloodSense server:

- **Server reachable** → everything is live: Bedrock reads reports, Neo4j closes roads and finds routes, the sensor watcher pushes alerts over Socket.io.
- **Server not reachable** → the app switches to built-in demo data (`src/api/mock.js`) and shows a "Demo data" chip. Every screen still works.

The app finds the server by itself: on the web it uses `http://<same host>:4000`, and in Expo Go it uses the computer that is running Expo (port 4000). To point somewhere else:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000 npx expo start
```

You can also switch "Demo data" on or off in **More → Profile & settings**.

## Demo script (about 90 seconds)

1. **Sign in** → pick हिंदी or English → "Just need the flood map?" (no account needed).
2. **Map** → red flood circle at Gandhi Maidan, live sensor levels, camps and safe places. Tap the map to move yourself.
3. **Report (+)** → type or speak *"Gandhi Maidan ke paas paani chest tak aa gaya hai, log phase hue hain"* → **Send**. The AI result shows DANGER, chest-deep, people stuck, and how many roads were closed.
4. **Get to safety** → **Other places** → *Rajendra Nagar Community Hall*: the green dry route versus the grey usual route that crosses flooded roads.
5. **More → Volunteer view → Simulate sensor flood** → the danger alert slides in and reads itself aloud. **Family** now shows Nani in danger.
6. Tap the map inside the red circle → **Get to safety** → the red **No dry route** screen with Call 112 and "I'm stuck".

For the live version, run the server and `python iot-simulator/simulator.py --sensor-id sensor-02 --scenario flash-flood` instead of step 5.

## Where things are

| Path | What |
|---|---|
| `web-demo/map.html` | Old single-page Leaflet demo, served by Express |
| `App.js` | Fonts, navigation (5 tabs + stack), web phone frame |
| `src/state/AppState.js` | Server check, data refresh, Socket.io, family status |
| `src/api/live.js` | Calls to the Express server |
| `src/api/mock.js` | Demo data and demo routing |
| `src/components/FloodMap.web.js` / `.native.js` | Leaflet on the web, react-native-maps on phones |
| `src/components/DepthFigure.js` | The "water on a body" severity figure |
| `src/screens/` | One file per screen |
| `src/i18n.js` | Hindi and English text |
