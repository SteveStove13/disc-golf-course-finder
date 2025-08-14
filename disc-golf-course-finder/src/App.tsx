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
    <div className="min-h-screen bg-lightBg dark:bg-darkBg text-darkBg dark:text-lightBg">
      <header className="sticky top-0 z-10 bg-primary text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Disc Golf Course Finder</h1>
            <p className="text-sm text-white/80">Deployed on Azure Static Web Apps</p>
          </div>
          <a
            className="inline-flex items-center rounded-xl border border-white/20 px-3 py-2 text-sm hover:bg-white/10 transition"
            href="#how-to-deploy"
          >
            How to deploy
          </a>
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
            Tip: Edit courses in <code>src/data.ts</code>.
          </div>
        </aside>

        {/* Results */}
        <section className="lg:col-span-9 space-y-4">
          {results.length === 0 ? (
            <div className="rounded-2xl border border-primary/20 p-8 text-center">
              <p className="opacity-80">No courses match your filters yet. Try clearing them.</p>
            </div>
          ) : (
            results.map((c) => <CourseCard key={c.id} course={c} />)
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
            <span>⭐ {course.rating.toFixed(1)}</span>
            <a
              className="underline decoration-primary/60 hover:text-primary"
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
