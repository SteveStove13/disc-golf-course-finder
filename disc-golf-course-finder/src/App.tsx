import React, { useState, useEffect } from 'react'

interface CourseItem {
  id: string
  name: string
  city: string
  difficulty: string
  rating: number
  holes: number
  description: string
  topPick: boolean
  mapUrl: string
  lat?: number
  lon?: number
}

function App() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch courses from Overpass API
  const fetchCoursesInBBox = async (
    south: number,
    west: number,
    north: number,
    east: number
  ) => {
    setLoading(true)
    try {
      const query = `
        [out:json][timeout:25];
        (
          node["sport"="disc_golf"](${south},${west},${north},${east});
          way["sport"="disc_golf"](${south},${west},${north},${east});
          relation["sport"="disc_golf"](${south},${west},${north},${east});
        );
        out center tags;
      `

      const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query)
      const res = await fetch(url)
      const data = await res.json()

      const elements = data.elements || []

      const items: CourseItem[] = elements.map((el: any, idx: number) => {
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
          difficulty: 'Intermediate', // default
          rating: 4.5,                 // placeholder rating
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

      setCourses(items)
    } catch (err) {
      console.error('Error fetching courses:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load courses near me
  const loadCoursesNearMe = () => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        const offset = 0.1
        fetchCoursesInBBox(lat - offset, lon - offset, lat + offset, lon + offset)
      },
      err => {
        console.error(err)
        alert('Unable to retrieve your location')
      }
    )
  }

  // Search this area — example bounding box (replace with map integration later)
  const searchThisArea = () => {
    // Example: fetch a fixed bounding box (NYC area)
    fetchCoursesInBBox(40.5, -74.3, 40.9, -73.7)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Disc Golf Course Finder</h1>
      <div className="flex gap-4 mb-6">
        <button
          onClick={loadCoursesNearMe}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          Load Courses Near Me
        </button>
        <button
          onClick={searchThisArea}
          className="bg-secondary text-white px-4 py-2 rounded"
        >
          Search This Area
        </button>
      </div>
      {loading ? (
        <p>Loading courses...</p>
      ) : (
        <div className="grid gap-4">
          {courses.map(course => (
            <div key={course.id} className="border p-4 rounded bg-lightBg">
              <h2 className="text-lg font-bold">{course.name}</h2>
              <p>{course.city}</p>
              <p>{course.holes} holes — {course.difficulty}</p>
              <a
                href={course.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
              >
                View on Google Maps
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default App
