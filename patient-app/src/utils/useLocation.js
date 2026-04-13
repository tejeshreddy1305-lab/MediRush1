import { useEffect, useState } from "react"

const FALLBACK = { lat: 13.6288, lng: 79.4192, source: "fallback" }

export const useLocation = () => {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(FALLBACK)
      setError("Geolocation not supported")
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: "gps",
        })
        setLoading(false)
      },
      (err) => {
        console.warn("Geolocation error:", err.message)
        setLocation(FALLBACK)
        setError("Location access denied — using Tirupati center")
        setLoading(false)
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
    )
  }, [])

  return { location, error, loading }
}
