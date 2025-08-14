import React, { useMemo, useState } from 'react'
import { COURSES } from './data'

type Difficulty = 'All' | 'Beginner' | 'Intermediate' | 'Advanced'

const difficultyOptions: Difficulty[] = ['All', 'Beginner', 'Intermediate', 'Advanced']

export default function App() {
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('All')
  const [onlyTopPicks, setOnlyTopPicks] = useState(false)
  const [sortBy, setSortBy] = useState<'rating' | 'name'>('rating')

  const results = useMemo(() => {
    let items = COURSES.filter((c) => {
      const matchesQuery = `${c.name} ${c.city}`.toLowerCase().includes(query.toLowerCase())
      const matchesDiff = difficulty === 'All' ? true : c.difficulty === difficulty
      const matchesTop = onlyTopPicks ? c.topPick : true
      return matchesQuery && matchesDiff && matchesTop
    })
    items = items.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating
      return a.name.localeCompare(b.name)
    })
    return items
  }, [query, difficulty, onlyTopPicks, sortBy])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Disc Golf Course Finder</h1>
            <p className="text-sm text-gray-600">A fast, static site you can deploy on Azure Static Web Apps.</p>
          </div>
          <a className="inline-flex items-center rounded-xl border px-3 py-2 text-sm hover:bg-gray-100 transition" href="#how-to-deploy">
            How to deploy
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Filters */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-3">Search</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or city..."
              className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <h2 className="font-semibold">Filters</h2>
            <div className="flex flex-wrap gap-2">
              {difficultyOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setDifficulty(opt)}
                  className={`px-3 py-1.5 rounded-full border text-sm ${
                    difficulty === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" checked={onlyTopPicks} onChange={(e) => setOnlyTopPicks(e.target.checked)} />
              Only show Top Picks
            </label>
          </div>
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-2">Sort</h2>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full rounded-xl border px-3 py-2">
              <option value="rating">Rating (High → Low)</option>
              <option value="name">Name (A → Z)</option>
            </select>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 text-xs text-gray-600">
            <p>
              Tip: Add or edit courses by modifying the <code>COURSES</code> array in <code>src/data.ts</code>.
            </p>
          </div>
        </aside>

        {/* Results */}
        <section className="lg:col-span-9 space-y-4">
          {results.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <p className="text-gray-600">No courses match your filters yet. Try clearing them.</p>
            </div>
          ) : (
            results.map((c) => <CourseCard key={c.id} course={c} />)
          )}
        </section>
      </main>

      <footer id="how-to-deploy" className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-semibold mb-2">How to deploy to Azure Static Web Apps</h2>
          <ol className="list-decimal pl-6 space-y-2 text-sm text-gray-700">
            <li>Create a new GitHub repo and push this project.</li>
            <li>In the Azure Portal, create <strong>Static Web App</strong> and connect your GitHub repo.</li>
            <li>Framework preset: <em>Custom</em> (or choose Vite if available). Build: <code>npm run build</code>. Output: <code>dist</code>.</li>
            <li>Finish to generate a GitHub Actions workflow. On push to <code>main</code>, the site deploys automatically.</li>
          </ol>
          <p className="text-xs text-gray-500 mt-3">Optional: add Azure Functions later for course suggestions or favorites.</p>
        </div>
      </footer>
    </div>
  )
}

function CourseCard({ course }: { course: any }) {
  return (
    <article className="bg-white rounded-2xl shadow overflow-hidden">
      <div className="p-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className="sm:w-1/2 w-full aspect-video rounded-xl overflow-hidden border">
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
              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Top Pick
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {course.city} • {course.holes} holes • {course.difficulty}
          </p>
          <p className="text-sm">{course.description}</p>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <span className="inline-flex items-center">⭐ {course.rating.toFixed(1)}</span>
            <a
              className="underline hover:no-underline"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(course.name + ', ' + course.city)}`}
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
