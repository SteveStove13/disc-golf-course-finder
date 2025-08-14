// Replace the COURSES import with this:
type CourseItem = {
  id: string;
  name: string;
  city: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'; // unknown from OSM; we’ll default
  rating: number; // unknown from OSM; placeholder
  holes: number;  // unknown from OSM; placeholder
  description: string;
  topPick: boolean;
  mapUrl: string;
  lat: number;
  lon: number;
};

// Overpass query to get disc golf courses inside a bbox (south, west, north, east)
async function fetchCoursesInBBox(south: number, west: number, north: number, east: number): Promise<CourseItem[]> {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  // nwr = nodes, ways, relations. We ask for center so we get a lat/lon for ways/relations.
  const query = `
    [out:json][timeout:25];
    (
      nwr["leisure"="disc_golf"](${south},${west},${north},${east});
    );
    out center tags;
  `;
  const res = await fetch(overpassUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: query,
  });
  const data = await res.json();

  const items: CourseItem[] = (data.elements || []).map((el: any, idx: number) => {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const name = el.tags?.name || 'Unnamed Disc Golf Course';
    const city = el.tags?.addr:city || el.tags?.city || el.tags?.addr_city || 'Unknown';
    return {
      id: String(el.id ?? idx),
      name,
      city,
      difficulty: 'Intermediate',        // unknown; set a neutral default
      rating: 4.5,                        // placeholder
      holes: Number(el.tags?.holes) || 18,// some courses have holes tag; default 18
      description: el.tags?.description || 'Disc golf course (OSM)',
      topPick: false,
      mapUrl: `https://www.google.com/maps?q=${lat},${lon}`,
      lat, lon,
    };
  });

  // de-dup by name+city to reduce clutter
  const seen = new Set<string>();
  return items.filter(c => {
    const key = `${c.name}__${c.city}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Utility: make a bbox around a point (roughly; 1 degree ~ 111km)
function bboxAround(lat: number, lon: number, radiusKm = 50) {
  const d = radiusKm / 111; // approx degrees
  return { south: lat - d, west: lon - d, north: lat + d, east: lon + d };
}
