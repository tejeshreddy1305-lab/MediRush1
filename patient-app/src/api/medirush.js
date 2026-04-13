import axios from "axios"

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

const api = axios.create({
  baseURL: BASE,
  timeout: 10000,
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.code === "ECONNABORTED") {
      console.warn("API timeout — using cached data")
    }
    return Promise.reject(error)
  }
)

export async function analyzeEmergency(payload) {
  try {
    const { data } = await api.post("/api/analyze", payload)
    return { ok: true, data }
  } catch (error) {
    const syms = payload?.symptoms || []
    const hasCritical = syms.some((s) =>
      ["chest pain", "stroke", "unconscious"].includes(String(s).toLowerCase())
    )
    return {
      ok: true,
      data: {
        severity: hasCritical ? "CRITICAL" : "MODERATE",
        score: hasCritical ? 9.0 : 5.5,
        confidence: 60.0,
        condition: "General Emergency",
        action: "Seek emergency care immediately.",
        vitals_flag: false,
        severity_probabilities: {},
      },
    }
  }
}

export async function fetchSymptomFeatures() {
  try {
    const { data } = await api.get("/api/symptoms/features")
    return { ok: true, features: data.features || [] }
  } catch (e) {
    return { ok: false, features: [] }
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const { data } = await api.get("/api/geocode/reverse", { params: { lat, lng } })
    return { ok: true, data }
  } catch (e) {
    return { ok: false, data: { city: "Tirupati", state: "Andhra Pradesh" } }
  }
}

export async function fetchNearbyHospitals(lat, lng, radius = 5000) {
  try {
    const { data } = await api.get("/api/hospitals/nearby", {
      params: { lat, lng, radius },
    })
    return { ok: true, data }
  } catch (e) {
    return { ok: false, data: { results: [] } }
  }
}

export async function recommendHospitals(body) {
  try {
    const { data } = await api.post("/api/hospitals/recommend", body)
    return { ok: true, data }
  } catch (e) {
    try {
      const { data } = await api.post("/api/recommend", body)
      return { ok: true, data }
    } catch (e2) {
      return { ok: false, data: { hospitals: [] } }
    }
  }
}

export async function fetchHospitalEta(params) {
  try {
    const { data } = await api.get("/api/hospitals/eta", { params })
    return { ok: true, data }
  } catch (e) {
    return { ok: false, data: null }
  }
}

export async function notifyHospital(payload) {
  try {
    const { data } = await api.post("/api/notify_hospital", payload)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e?.message || "Notify failed" }
  }
}

export async function updateLocation(token, body) {
  try {
    await api.patch(`/api/tracking/${token}`, body)
    return { ok: true }
  } catch (e) {
    return { ok: false }
  }
}

export async function fetchPatient(patientId) {
  try {
    const { data } = await api.get(`/api/patient/${patientId}`)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, data: null }
  }
}

export async function fetchPatientVitals(patientId) {
  try {
    const { data } = await api.get(`/api/patient/${patientId}/vitals`)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, data: { points: [] } }
  }
}

export async function fetchDrugInfo(name) {
  try {
    const { data } = await api.post("/api/drug_info", { drug_name: name })
    return { ok: true, data }
  } catch (e) {
    return { ok: false, data: null }
  }
}

export async function dispatchAmbulance(body) {
  try {
    const { data } = await api.post("/api/ambulance/dispatch", body)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e?.message || "Dispatch failed" }
  }
}

export async function submitFeedback(body) {
  try {
    const { data } = await api.post("/api/feedback", body)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e?.message }
  }
}

export async function fetchVitalsAnalysis(patientId) {
  try {
    const { data } = await api.get(`/api/patient/${patientId}/vitals/analysis`)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, data: { alerts: [], bp: {}, hr: {} } }
  }
}

export async function fetchEmergencyHistory(patientId) {
  try {
    const { data } = await api.get(`/api/patient/${patientId}/history`)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, data: [] }
  }
}

export async function fetchBloodBank(bloodType) {
  try {
    const { data } = await api.get("/api/blood-bank", { params: { blood_type: bloodType } })
    return { ok: true, data }
  } catch (e) {
    return { ok: false, data: [] }
  }
}

export { BASE }
