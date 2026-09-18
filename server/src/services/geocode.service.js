const { LocationClient, SearchPlaceIndexForTextCommand } = require('@aws-sdk/client-location');

const client = new LocationClient({ region: process.env.AWS_REGION });

async function geocode(text, biasLat, biasLng) {
  if (!text || !text.trim()) return null;
  try {
    const out = await client.send(new SearchPlaceIndexForTextCommand({
      IndexName: process.env.PLACE_INDEX_NAME,
      Text: text,
      BiasPosition: (biasLat && biasLng) ? [biasLng, biasLat] : undefined,
      MaxResults: 1,
      FilterCountries: ['IND'],
    }));
    const place = out.Results?.[0]?.Place;
    if (!place?.Geometry?.Point) return null;
    const [lng, lat] = place.Geometry.Point;
    return { lat, lng, label: place.Label };
  } catch (e) {
    console.warn('[geocode] failed:', e.message);
    return null;
  }
}

module.exports = { geocode };