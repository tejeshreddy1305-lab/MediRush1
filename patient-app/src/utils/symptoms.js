export function humanizeFeatureName(name) {
  if (!name) return ""
  const s = String(name).replace(/_/g, " ").trim()
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function normalizeSymptomToken(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_")
}
