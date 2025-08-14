import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COURSES } from './data'

// Let TS be ok with Leaflet from a CDN:
declare const L: any

type Difficulty = 'All' | 'Beginner' | 'Intermediate' | 'Advanced'
const difficultyOptions: Difficulty[] = ['All', 'Beginner', 'Intermediate', 'Advanced']

type CourseItem = {
  id: string
  name: string
  city: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  rating: number
  holes: number
  description: string
  topPick: boolean
  mapUrl: string
  lat?: number
  lon?: number
}

function bboxAround(lat: number, lon: number, radiusKm = 50) {
  const d = radiusKm / 111 // ~degrees per 111 km
  return { south: lat - d, west: lon - d, north: lat + d, east: lon + d }
}

async function fetchCoursesInBBox(
  south: number,
  west: number,
  north: number,
  east: number
): Promise<CourseItem[]> {
  const overpassUrl = 'https://overpass-api.de/api/interpreter'
  const query = `
    [out:json][timeout:25];
    (
      nwr["leisure"="disc_golf"](${south},${west},${north},${east});
    );
    out center tags;
  `
  const res = await fetch(overpassUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: query,
  })
  if (!res.ok) throw new Error(`Overpass error ${res.status}`)

  const data = await res.json()
  const elements: any[] = data?.elements ?? []

  const items: CourseItem[] = elements.map((el, idx) => {
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    const name: string = el.tags?.name || 'Disc Golf Course'
    const city: string =
      el.tags?.['addr:city'] ||
      el.tags?.city ||
      el.tags?.addr_city ||
      'Unknown'
    const holesTag = Number(el.tags?.holes)

    return {
      id: String(el.id ?? idx),
      name,
      city,
      difficulty: 'Intermediate', // neutral default; OSM doesn’t have difficulty
      rating: 4.5,                 // placeholder
      holes: Number.isFinite(holesTag) ? holesTag : 18,
      description: el.tags?.description || 'Disc golf course (OpenStreetMap)',
      topPick: false,
      mapUrl:
        lat && lon
          ? `https://www.google.com/maps?q=${lat},${lon}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              name + ', ' + city
            )}`,
      lat, lon,
    }
  })

  // De-dup by name + city
  const seen = new Set<string>()
  return items.filter(c => {
    const key = `${c.name}__${c.city}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function geocodePlace(query: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  if (!res.ok) return null
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
}

export default function App() {
  // UI filters
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('All')
  const [onlyTopPicks, setOnlyTopPicks] = useState(false)
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating')

  // Dynamic data + status
  const [dynamicCourses, setDynamicCourses] = useState<CourseItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Map stuff
  const mapRef = useRef<any>(null)
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const markersLayerRef = useRef<any>(null)
  const [radiusKm, setRadiusKm] = useState<number>(50)
  const [areaText, setAreaText] = useState('')

  // Init the Leaflet map
  useEffect(() => {
    if (mapRef.current || !mapElRef.current || typeof L === 'undefined') return
    const map = L.map(mapElRef.current).setView([38.627, -90.199], 10) // default: St. Louis
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    const markers = L.layerGroup().addTo(map)
    mapRef.current = map
    markersLayerRef.current = markers
  }, [])

  // Add markers to map when results change
  useEffect(() => {
    const map = mapRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return
    layer.clearLayers()
    const items = (dynamicCourses && dynamicCourses.length > 0 ? dynamicCourses : COURSES) as any[]
    const bounds = L.latLngBounds()
    items.forEach(c => {
      if (!c.lat || !c.lon) return
      const m = L.marker([c.lat, c.lon]).bindPopup(`<b>${c.name}</b><br/>${c.city}`)
      layer.addLayer(m)
      bounds.extend([c.lat, c.lon])
    })
    if (items.some(c => c.lat && c.lon)) {
      map.fitBounds(bounds.pad(0.2))
    }
  }, [dynamicCourses])

  const sourceCourses: any[] =
    dynamicCourses && dynamicCourses.length > 0 ? dynamicCourses : (COURSES as any[])

  const results = useMemo(() => {
    let items = sourceCourses.filter((c: any) => {
      const matchesQuery = `${c.name} ${c.city}`.toLowerCase().includes(query.toLowerCase())
      const matchesDiff = difficulty === 'All' ? true : c.difficulty === difficulty
      const matchesTop = onlyTopPicks ? c.topPick : true
      return matchesQuery && matchesDiff && matchesTop
    })
    items = items.sort((a: any, b: any) => (sortBy === 'rating' ? b.rating - a.rating : a.name.localeCompare(b.name)))
    return items
  }, [query, difficulty, onlyTopPicks, sortBy, sourceCourses])

  async function loadNearby() {
    setErrorMsg(null)
    setLoading(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not available'))
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      })
      const { latitude, longitude } = pos.coords
      const bbox = bboxAround(latitude, longitude, radiusKm)
      const items = await fetchCoursesInBBox(bbox.south, bbox.west, bbox.north, bbox.east)
      setDynamicCourses(items)
      // Pan/zoom map
      if (mapRef.current) mapRef.current.setView([latitude, longitude], 11)
    } catch (e) {
      console.error(e)
      setErrorMsg('Could not get your location. Try "Search this area" instead.')
    } finally {
      setLoading(false)
    }
  }

  async function searchArea() {
    setErrorMsg(null)
    if (!areaText.trim()) {
      setErrorMsg('Type a city or area first.')
      return
    }
    setLoading(true)
    try {
      const loc = await geocodePlace(areaText.trim())
      if (!loc) {
        setErrorMsg('Area not found. Try a more specific name.')
        setLoading(false)
        return
      }
      const bbox = bboxAround(loc.lat, loc.lon, radiusKm)
      const items = await fetchCoursesInBBox(bbox.south, bbox.west, bbox.north, bbox.east)
      setDynamicCourses(items)
      if (mapRef.current) mapRef.current.setView([loc.lat, loc.lon], 11)
    } catch (e) {
      console.error(e)
      setErrorMsg('Could not load that area right now.')
    } finally {
      setLoading(false)
    }
  }

  async function searchThisMap() {
    setErrorMsg(null)
    const map = mapRef.current
    if (!map) return
    setLoading(true)
    try {
      const b = map.getBounds()
      const south = b.getSouth()
      const west = b.getWest()
      const north = b.getNorth()
      const east = b.getEast()
      const items = await fetchCoursesInBBox(south, west, north, east)
      setDynamicCourses(items)
    } catch (e) {
      console.error(e)
      setErrorMsg('Could not load courses for this map view.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-lightBg dark:bg-darkBg text-darkBg dark:text-lightBg">
      <header className="sticky top-0 z-10 bg-primary text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Disc Golf Course Finder</h1>
            <p className="text-sm text-white/80">Load nearby courses or search an area — live from OpenStreetMap.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="rounded-xl border border-white/20 bg-white/10 px-2 py-2 text-sm"
                title="Search radius"
              >
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>

              <button
                onClick={loadNearby}
                className="inline-flex items-center rounded-xl border border-white/20 px-3 py-2 text-sm bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load courses near me'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={areaText}
                onChange={(e) => setAreaText(e.target.value)}
                placeholder="City / area (e.g., St. Louis, MO)"
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm placeholder-white/70"
              />
              <button
                onClick={searchArea}
                className="inline-flex items-center rounded-xl border border-white/20 px-3 py-2 text-sm bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Searching…' : 'Search this area'}
              </button>
            </div>

            <button
              onClick={searchThisMap}
              className="inline-flex items-center rounded-xl border border-white/20 px-3 py-2 text-sm bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Searching…' : 'Search this map'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: filters + list */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white/70 dark:bg-black/20 backdrop-blur rounded-2xl shadow p-4 border border-primary/20">
            <h2 className="font-semibold mb-3">Filter results</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or city…"
              className="w-full rounded-xl border border-primary/30 bg-lightBg dark:bg-darkBg text-inherit px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="bg-white/70 dark:bg-black/20 backdrop-blur rounded-2xl shadow p-4 border border-primary/20 space-y-3">
            <h2 className="font-semibold">Difficulty</h2>
            <div className="flex flex-wrap gap-2">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setDifficulty(opt)}
                  className={`px-3 py-1.5 rounded-full border text-sm ${
                    difficulty === opt
                      ? 'bg-primary text-white border-primary shadow'
                      : 'border-primary/40 hover:bg-primary/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded accent-primary"
                checked={onlyTopPicks}
                onChange={(e) => setOnlyTopPicks(e.target.checked)}
              />
              Only show Top Picks
            </label>
          </div>

          <div className="bg-white/70 dark:bg-black/20 backdrop-blur rounded-2xl shadow p-4 border border-primary/20">
            <h2 className="font-semibold mb-2">Sort</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full rounded-xl border border-primary/30 bg-lightBg dark:bg-darkBg text-inherit px-3 py-2"
            >
              <option value="rating">Rating (High → Low)</option>
              <option value="name">Name (A → Z)</option>
            </select>
          </div>

          <section className="space-y-4">
            {results.length === 0 ? (
              <div className="rounded-2xl border border-primary/20 p-8 text-center">
                <p className="opacity-80">No courses match your filters yet.</p>
              </div>
            ) : (
              results.map((c: any) => <CourseCard key={c.id} course={c} />)
            )}
          </section>
        </aside>

        {/* Right column: map */}
        <section className="lg:col-span-8 space-y-4">
          <div
            ref={mapElRef}
            className="h-[520px] w-full rounded-2xl border border-primary/20 overflow-hidden"
            id="map"
          />
          <div className="rounded-2xl border border-primary/20 p-4 text-xs opacity-80">
            <p>
              Tip: pan/zoom the map, then click <strong>Search this map</strong>. Or type a city and
              <strong> Search this area</strong>.
            </p>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-12">
        <div className="rounded-2xl border border-primary/20 p-6">
          <h2 className="text-xl font-semibold mb-2">How it works</h2>
          <p className="text-sm opacity-80">
            We query public disc golf courses from OpenStreetMap via Overpass. Some attributes like ratings/holes may be missing.
          </p>
        </div>
      </footer>
    </div>
  )
}

function CourseCard({ course }: { course: any }) {
  return (
    <article className="rounded-2xl border border-primary/20 overflow-hidden">
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-bold">{course.name}</h3>
          {course.topPick && (
            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border border-accent/50 text-accent bg-accent/10">
              Top Pick
            </span>
          )}
        </div>
        <p className="text-sm opacity-80">
          {course.city} • {course.holes} holes • {course.difficulty}
        </p>
        <div className="flex items-center gap-3 text-sm opacity-90">
          <span>⭐ {course.rating?.toFixed ? course.rating.toFixed(1) : course.rating}</span>
          <a
            className="underline decoration-primary/60 hover:text-primary"
            href={course.mapUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    </article>
  )
}
