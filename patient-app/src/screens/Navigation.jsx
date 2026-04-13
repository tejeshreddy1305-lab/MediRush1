import { useCallback, useEffect, useMemo, useState } from "react"
import { GoogleMap, DirectionsRenderer, Marker, useJsApiLoader } from "@react-google-maps/api"
import BottomSheet from "../components/BottomSheet"
import MapErrorBoundary from "../components/MapErrorBoundary"
import AmbulanceTracker from "../components/AmbulanceTracker"
import { updateLocation, dispatchAmbulance } from "../api/medirush"
import { DARK_MAP_STYLE } from "../utils/mapStyles"
import { useWebSocket } from "../utils/useWebSocket"
import { useTranslation } from "../utils/i18n"

const containerStyle = { width: "100%", height: "100%" }

function GoogleNavigation({ apiKey, pos, dest, onMetrics }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "medirush-map",
    googleMapsApiKey: apiKey,
    libraries: ["places"],
  })
  const [directions, setDirections] = useState(null)

  useEffect(() => {
    if (!isLoaded || loadError || !dest) return
    const ds = new window.google.maps.DirectionsService()
    ds.route(
      {
        origin: pos,
        destination: dest,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result)
          const leg = result.routes[0].legs[0]
          onMetrics({
            etaMin: Math.round(leg.duration.value / 60),
            distKm: leg.distance.value / 1000,
            summary: leg.end_address || "",
          })
        }
      }
    )
  }, [isLoaded, loadError, pos, dest, onMetrics])

  if (loadError || !isLoaded) {
    return (
      <iframe
        title="map"
        width="100%"
        height="100%"
        className="h-full w-full border-0"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${pos.lng - 0.02},${pos.lat - 0.02},${pos.lng + 0.02},${pos.lat + 0.02}&layer=mapnik&marker=${pos.lat},${pos.lng}`}
      />
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={pos}
      zoom={14}
      options={{
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "greedy",
      }}
    >
      <Marker position={pos} />
      {dest && <Marker position={dest} />}
      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: true,
            polylineOptions: { strokeColor: "var(--accent-red)", strokeWeight: 4 },
          }}
        />
      )}
    </GoogleMap>
  )
}

export default function Navigation({
  go,
  selectedHospital,
  token,
  showToast,
  triageData,
  language,
}) {
  const t = useTranslation(language || "en")
  const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim()

  const [pos, setPos] = useState({ lat: 13.6288, lng: 79.4192 })
  const [metrics, setMetrics] = useState({ etaMin: 0, distKm: 0, summary: "" })
  const [doctorStatus, setDoctorStatus] = useState("pending")
  const [doctorLine, setDoctorLine] = useState("")
  const [showAmbulance, setShowAmbulance] = useState(false)
  const [dispatchMeta, setDispatchMeta] = useState(null)

  const wsBase = import.meta.env.VITE_WS_BASE || "ws://localhost:8000"
  const wsUrl = token ? `${wsBase}/ws/patient/${token}` : ""

  const onWs = useCallback((msg) => {
    try {
      if (msg.type === "DOCTOR_ACCEPTED") setDoctorStatus("accepted")
      if (msg.type === "DOCTOR_ASSIGNED") {
        setDoctorStatus("accepted")
        setDoctorLine(`${msg.doctor_name || "Doctor"} (${msg.role || ""}) assigned to your case`)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useWebSocket(wsUrl, onWs)

  const dest = useMemo(
    () =>
      selectedHospital?.lat && selectedHospital?.lng
        ? { lat: selectedHospital.lat, lng: selectedHospital.lng }
        : null,
    [selectedHospital]
  )

  const onMetrics = useCallback((m) => setMetrics(m), [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => showToast?.(t("error_location")),
      { timeout: 8000, maximumAge: 60000 }
    )
  }, [showToast, t])

  useEffect(() => {
    if (!navigator.geolocation || !token || !selectedHospital?.id) return
    const id = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const lat = p.coords.latitude
          const lng = p.coords.longitude
          setPos({ lat, lng })
          updateLocation(token, { lat, lng, hospital_id: selectedHospital.id }).catch(() => {})
        },
        () => {},
        { timeout: 8000, maximumAge: 60000 }
      )
    }, 10000)
    return () => clearInterval(id)
  }, [token, selectedHospital])

  const handleAmbulanceDispatch = async () => {
    try {
      const res = await dispatchAmbulance({
        lat: pos.lat,
        lng: pos.lng,
        token: token || "",
        severity: triageData?.severity || "CRITICAL",
        condition: triageData?.condition || "Emergency",
        hospital_id: selectedHospital?.id,
      })
      if (res.ok && res.data) {
        setDispatchMeta(res.data)
        setShowAmbulance(true)
        showToast?.(t("toast_dispatched"))
        if (/Mobi|Android/i.test(navigator.userAgent || "")) {
          window.open("tel:108", "_self")
        }
      } else {
        showToast?.("Dispatch unavailable")
      }
    } catch {
      showToast?.("Dispatch failed")
    }
  }

  const mapInner =
    key && dest ? (
      <GoogleNavigation apiKey={key} pos={pos} dest={dest} onMetrics={onMetrics} />
    ) : (
      <iframe
        title="map"
        width="100%"
        height="100%"
        className="h-full w-full border-0"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${pos.lng - 0.02},${pos.lat - 0.02},${pos.lng + 0.02},${pos.lat + 0.02}&layer=mapnik&marker=${pos.lat},${pos.lng}`}
      />
    )

  const mapEl = (
    <MapErrorBoundary lat={pos.lat} lng={pos.lng}>
      {mapInner}
    </MapErrorBoundary>
  )

  const critical = (triageData?.severity || "").toUpperCase() === "CRITICAL"

  return (
    <div className="relative h-full bg-[var(--bg-primary)]">
      <div className="h-full w-full">{mapEl}</div>

      {critical && (
        <div
          className="absolute left-3 right-3 top-3 z-[50] flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-md"
          style={{
            background: "rgba(255,59,92,0.12)",
            border: "1px solid rgba(255,59,92,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <span
            className="inline-block h-3 w-3 flex-shrink-0 rounded-full bg-[#FF3B5C]"
            style={{ animation: "mr-amb-pulse 0.8s ease-in-out infinite alternate" }}
          />
          <p className="flex-1 text-primary" style={{ fontSize: "13px", fontWeight: 600 }}>
            {t("nav_ambulance_title")}
          </p>
          <button
            type="button"
            className="flex-shrink-0 rounded-full px-3 py-1.5 font-semibold text-white"
            style={{ background: "#FF3B5C", fontSize: "12px" }}
            onClick={handleAmbulanceDispatch}
          >
            {t("nav_dispatch_btn")}
          </button>
        </div>
      )}
      <style>{`@keyframes mr-amb-pulse { from { transform: scale(1); } to { transform: scale(1.3); } }`}</style>

      <AmbulanceTracker
        open={showAmbulance}
        onClose={() => setShowAmbulance(false)}
        meta={dispatchMeta}
        patientLat={pos.lat}
        patientLng={pos.lng}
      />

      <BottomSheet>
        <p className="font-semibold text-primary" style={{ fontSize: "17px" }}>
          {selectedHospital?.name}
        </p>
        <p className="mt-2 text-secondary" style={{ fontSize: "13px" }}>
          {t("nav_arriving")}{" "}
          {metrics.etaMin || Math.round((selectedHospital?.eta_seconds || 0) / 60)} min ·{" "}
          {metrics.distKm ? metrics.distKm.toFixed(1) : selectedHospital?.distance_km} km
          {metrics.summary ? ` · ${metrics.summary}` : ""}
        </p>
        <p
          className="mt-2 text-secondary"
          style={{
            fontSize: "13px",
            color: doctorStatus === "accepted" ? "var(--accent-green)" : "var(--accent-amber)",
          }}
        >
          {doctorLine || (doctorStatus === "accepted" ? t("nav_notified") + " ✓" : t("nav_waiting") + "…")}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a className="mr-btn-primary flex items-center justify-center no-underline" href="tel:108">
            {t("nav_call")}
          </a>
          <button type="button" className="mr-btn-secondary" onClick={() => go("confirmation")}>
            {t("nav_confirm")}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
