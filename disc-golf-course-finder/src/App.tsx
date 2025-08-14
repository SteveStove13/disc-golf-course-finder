import React, { useMemo, useState } from 'react'
import { COURSES } from './data'

type Difficulty = 'All' | 'Beginner' | 'Intermediate' | 'Advanced'
const difficultyOptions: Difficulty[] = ['All', 'Beginner', 'Intermediate', 'Advanced']

// ----- Client-side Overpass helpers (Option A) -----
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

// Build a bbox around a lat/lon (roughly; 1 degree ~ 111km)
function bboxAround(lat: number, lon: number, radiusKm = 50) {
  const d = radiusKm / 111
  return { south: lat - d, west: lon - d, north: lat + d, east: lon + d }
}

// Query OpenStreetMap Overpass API for disc golf courses in a bbox
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
      difficulty: 'Intermediate',                 // OSM doesn't track difficulty: neutral default
      rating: 4.5,                                // placeholder
      holes: Number.isFinite(holesTag) ? holesTag : 18,
      description: el.tags?.description || 'Disc golf course (OpenStreetMap)',
      topPick: false,
      mapUrl:
        lat && lon
          ? `https://www.google.com/maps?q=${lat},${lon}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              name + ', ' + city
            )}`,
      lat,
      lon,
    }
  })

  // De-dup by name+city to reduce near-duplicates
  const seen = new Set<string>()
  return items.filter((c) => {
    const key = `${c.name}__${c.city}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ---------------------------------------------------

export default function App() {
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('All')
  const [onlyTopPicks, setOnlyTopPicks] = useState(false)
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating')

  // New state for dynamic results & UI
  const [dynamicCourses, setDynamicCourses] = useState<CourseItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Prefer fetched data; fall back to your static COURSES
  const sourceCourses: any[] =
    dynamicCourses && dynamicCourses.length > 0 ? dynamicCourses : (COURSES as any[])

  const results = useMemo(() => {
    let items = sourceCourses.filter((c: any) => {
      const matchesQuery = `${c.name} ${c.city}`.toLowerCase().includes(query.toLowerCase())
      const matchesDiff = difficulty === 'All' ? true : c.difficulty === difficulty
      const matchesTop = onlyTopPicks ? c.topPick : true
      return matchesQuery && matchesDiff && matchesTop
    })
    items = items.sort((a: any, b: any) => {
      if (sortBy === 'rating') return b.rating - a.rating
      return a.name.localeCompare(b.name)
    })
    return items
  }, [query, difficulty, onlyTopPicks, sortBy, sourceCourses])

  // Load courses near the user (uses browser geolocation)
  async function loadNearby() {
    setErrorMsg(null)
    setLoading(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Geolocation not available'))
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })
      const { latitude, longitude } = pos.coords
      const bbox = bboxAround(latitude, longitude, 50) // ~50km radius
      const items = await fetchCoursesInBBox(bbox.south, bbox.west, bbox.north, bbox.east)
      setDynamicCourses(items)
    } catch (e) {
      console.error(e)
      // Fallback if user blocks location: St. Louis area
      const bbox = bboxAround(38.627, -90.199, 50)
      try {
        const items = await fetchCoursesInBBox(bbox.south, bbox.west, bbox.north, bbox.east)
        setDynamicCourses(items)
      } catch (e2) {
        console.error(e2)
        setErrorMsg('Could not load courses right now. Please try again.')
      }
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
            <p className="text-sm text-white/80">Deployed on Azure Static Web Apps</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadNearby}
              className="inline-flex items-center rounded-xl border border-white/20 px-3 py-2 text-sm bg-white/10 hover:bg-white/20 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Load courses near me'}
            </button>
            <a
              className="inline-flex items-center rounded-xl border border-white/20 px-3 py-2 text-sm hover:bg-white/10 transition"
              href="#how-to-deploy"
            >
              How to deploy
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Filters */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white/70 dark:bg-black/20 backdrop-blur rounded-2xl shadow p-4 border border-primary/20">
            <h2 className="font-semibold mb-3">Search</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or city..."
              className="w-full rounded-xl border border-primary/30 bg-lightBg dark:bg-darkBg text-inherit px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="bg-white/70 dark:bg-black/20 backdrop-blur rounded-2xl shadow p-4 border border-primary/20 space-y-3">
            <h2 className="font-semibold">Filters</h2>
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

          <div className="rounded-2xl p-4 text-xs text-inherit border border-primary/10">
            <p>Tip: This page can load public disc golf courses from OpenStreetMap near you.</p>
            <p className="mt-1 opacity-70">Some details like ratings/holes may be placeholders.</p>
          </div>
        </aside>

        {/* Results */}
        <section className="lg:col-span-9 space-y-4">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-primary/20 p-8 text-center">
              <p className="opacity-80">No courses match your filters yet. Try clearing them.</p>
            </div>
          ) : (
            results.map((c: any) => <CourseCard key={c.id} course={c} />)
          )}
        </section>
      </main>

      <footer id="how-to-deploy" className="max-w-6xl mx-auto px-4 pb-12">
        <div className="rounded-2xl border border-primary/20 p-6">
          <h2 className="text-xl font-semibold mb-2">How to deploy to Azure Static Web Apps</h2>
          <ol className="list-decimal pl-6 space-y-2 text-sm">
            <li>Push changes to <code>main</code> on GitHub.</li>
            <li>Azure builds with <code>npm run build</code> and serves <code>dist</code>.</li>
            <li>Every push triggers an automatic redeploy.</li>
          </ol>
          <p className="text-xs opacity-70 mt-3">Optional: add Azure Functions later for course suggestions or favorites.</p>
        </div>
      </footer>
    </div>
  )
}

function CourseCard({ course }: { course: any }) {
  return (
    <article className="rounded-2xl border border-primary/20 overflow-hidden">
      <div className="p-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className="sm:w-1/2 w-full aspect-video rounded-xl overflow-hidden border border-primary/20">
          <iframe
            title={`${course.name} map`}
            src={course.mapUrl}
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="sm:w-1/2 w-full space-y-2">
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
          <p className="text-sm">{course.description}</p>
          <div className="flex items-center gap-3 text-sm opacity-90">
            <span>⭐ {course.rating?.toFixed ? course.rating.toFixed(1) : course.rating}</span>
            <a
              className="underline decoration-primary/60 hover:text-primary"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                (course.name || '') + ', ' + (course.city || '')
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
