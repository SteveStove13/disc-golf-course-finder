import React, { useEffect, useMemo, useRef, useState } from 'react'
import { COURSES } from './data'

// Let TS know about the google global
declare global {
  interface Window { google: any }
}

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
  placeId?: string
}

// --- Utilities -------------------------------------------------------------

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google && window.google.maps) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    s.async = true
    s.onerror = () => reject(new Error('Failed to load Google Maps'))
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
}

function placeToCourse(p: any, idx: number): CourseItem {
  const lat = p.geometry?.location?.lat()
  const lon = p.geometry?.location?.lng()
  const name = p.name || 'Disc Golf Course'
  const city = (p.vicinity || p.formatted_address || 'Unknown').toString()
  const rating = typeof p.rating === 'number' ? p.rating : 4.5
  const holesGuess = 18 // Places API doesn’t know hole count; sensible default
  const mapUrl = p.place_id
    ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}`
    : (lat && lon ? `https://www.google.com/maps?q=${lat},${lon}` : 'https://maps.google.com')

  return {
    id: String(p.place_id || idx),
    name,
    city,
    difficulty: 'Intermediate',
    rating,
    holes: holesGuess,
    description: p.types?.includes('park') ? 'Disc golf course / park' : 'Disc golf course',
    topPick: Boolean(p.user_ratings_total && p.user_ratings_total > 200 && rating >= 4.5),
    mapUrl,
    lat, lon,
    placeId: p.place_id
  }
}

function boundsRadiusMeters(map: any) {
  // approximate radius from map center to NE corner
  const c = map.getCenter()
  const ne = map.getBounds().getNorthEast()
  const R = 6378137
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(ne.lat() - c.lat())
  const dLng = toRad(ne.lng() - c.lng())
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(c.lat())) * Math.cos(toRad(ne.lat())) * Math.sin(dLng / 2) ** 2
  const dist = 2 * R * Math.asin(Math.sqrt(a))
  return Math.min(Math.max(dist, 500), 50000) // clamp 0.5km..50km (Places NearbySearch limit)
}

// --- Component -------------------------------------------------------------

export default function App() {
  // UI
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('All')
  const [onlyTopPicks, setOnlyTopPicks] = useState(false)
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating')

  // Dynamic data
  const [dynamicCourses, setDynamicCourses] = useState<CourseItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Map
  const mapRef = useRef<any>(null)
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<any[]>([])
  const [areaText, setAreaText] = useState('')
  const [radiusChoice, setRadiusChoice] = useState<number>(5000) // m (used for "near me")

  // Init Google Map
  useEffect(() => {
    (async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
        if (!apiKey) { setErrorMsg('Missing Google Maps API key. Add VITE_GOOGLE_MAPS_API_KEY.'); return }
        await loadGoogleMaps(apiKey)
        const center = { lat: 38.627, lng: -90.199 } // St. Louis default
        const map = new window.google.maps.Map(mapElRef.current!, { center, zoom: 11, mapTypeControl: false })
        mapRef.current = map
      } catch (e) {
        console.error(e); setErrorMsg('Failed to load Google Maps.')
      }
    })()
  }, [])

  // Helpers to manage markers
  function clearMarkers() { markersRef.current.forEach(m => m.setMap(null)); markersRef.current = [] }
  function addMarkers(items: CourseItem[]) {
    if (!mapRef.current) return
    const map = mapRef.current
    const bounds = new window.google.maps.LatLngBounds()
    items.forEach((c) => {
      if (!c.lat || !c.lon) return
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: c.lat, lng: c.lon },
        title: c.name,
      })
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-weight:600">${c.name}</div><div style="opacity:.8">${c.city}</div>`
      })
      marker.addListener('click', () => info.open({ anchor: marker, map }))
      markersRef.current.push(marker)
      bounds.extend({ lat: c.lat, lng: c.lon })
    })
    if (!bounds.isEmpty()) map.fitBounds(bounds, 80)
  }

  async function runNearbySearch(centerLat: number, centerLng: number, radiusMeters: number) {
    if (!mapRef.current) return
    setLoading(true); setErrorMsg(null)
    try {
      const svc = new window.google.maps.places.PlacesService(mapRef.current)
      const results: any[] = await new Promise((resolve, reject) => {
        svc.nearbySearch(
          { location: { lat: centerLat, lng: centerLng }, radius: radiusMeters, keyword: 'disc golf course' },
          (res: any[], status: string) => (status === 'OK' || status === 'ZERO_RESULTS') ? resolve(res || []) : reject(status)
        )
      })
      const items = results.map(placeToCourse)
      setDynamicCourses(items)
      clearMarkers(); addMarkers(items)
      mapRef.current.setCenter({ lat: centerLat, lng: centerLng })
    } catch (e) { console.error(e); setErrorMsg('Places Nearby search failed.') }
    finally { setLoading(false) }
  }

  async function runTextSearchInBounds() {
    if (!mapRef.current) return
    setLoading(true); setErrorMsg(null)
    try {
      const map = mapRef.current
      const bounds = map.getBounds()
      const svc = new window.google.maps.places.PlacesService(map)
      const request: any = { query: 'disc golf course', bounds }
      const results: any[] = await new Promise((resolve, reject) => {
        svc.textSearch(request, (res: any[], status: string) =>
          (status === 'OK' || status === 'ZERO_RESULTS') ? resolve(res || []) : reject(status)
        )
      })
      const items = results.map(placeToCourse)
      setDynamicCourses(items)
      clearMarkers(); addMarkers(items)
    } catch (e) { console.error(e); setErrorMsg('Places Text search failed.') }
    finally { setLoading(false) }
  }

  async function geocodeAndSearchArea(text: string) {
    if (!mapRef.current) return
    setLoading(true); setErrorMsg(null)
    try {
      const geocoder = new window.google.maps.Geocoder()
      const geo: any = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: text }, (res: any[], status: string) =>
          (status === 'OK' && res?.length) ? resolve(res[0]) : reject(status)
        )
      })
      const loc = geo.geometry.location
      mapRef.current.setCenter(loc)
      mapRef.current.setZoom(12)
      const radius = 10000 // 10km default for typed area
      await runNearbySearch(loc.lat(), loc.lng(), radius)
    } catch (e) { console.error(e); setErrorMsg('Geocoding failed for that area.') }
    finally { setLoading(false) }
  }

  async function loadNearby() {
    if (!mapRef.current) return
    setErrorMsg(null)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not available'))
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      })
      const { latitude, longitude } = pos.coords
      mapRef.current.setCenter({ lat: latitude, lng: longitude })
      mapRef.current.setZoom(12)
      await runNearbySearch(latitude, longitude, radiusChoice)
    } catch (e) {
      console.error(e); setErrorMsg('Could not get your location.')
    }
  }

  async function searchThisMap() {
    if (!mapRef.current) return
    const r = boundsRadiusMeters(mapRef.current)
    const c = mapRef.current.getCenter()
    await runNearbySearch(c.lat(), c.lng(), r)
  }

  // Use dynamic results or static fallback
  const sourceCourses: any[] = dynamicCourses && dynamicCourses.length > 0 ? dynamicCourses : (COURSES as any[])

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

  return (
    <div className="min-h-screen bg-lightBg dark:bg-darkBg text-darkBg dark:text-lightBg">
      <header className="sticky top-0 z-10 bg-primary text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Disc Golf Course Finder</h1>
            <p className="text-sm text-white/80">Google Maps + Places — find courses near you or in any area.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <select
                value={radiusChoice}
                onChange={(e) => setRadiusChoice(Number(e.target.value))}
                className="rounded-xl border border-white/20 bg-white/10 px-2 py-2 text-sm"
                title="Nearby radius"
              >
                <option value={2000}>2 km</option>
                <option value={5000}>5 km</option>
                <option value={10000}>10 km</option>
                <option value={20000}>20 km</option>
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
                placeholder="City / area (e.g., Kansas City, MO)"
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm placeholder-white/70"
              />
              <button
                onClick={() => geocodeAndSearchArea(areaText)}
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
        {/* Left: filters + results */}
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
            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
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

        {/* Right: Google map */}
        <section className="lg:col-span-8 space-y-4">
          <div
            ref={mapElRef}
            className="h-[520px] w-full rounded-2xl border border-primary/20 overflow-hidden"
            id="map"
          />
          <div className="rounded-2xl border border-primary/20 p-4 text-xs opacity-80">
            <p>Pan/zoom the map and click <strong>Search this map</strong>, or type a city and click <strong>Search this area</strong>.</p>
          </div>
        </section>
      </main>
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
