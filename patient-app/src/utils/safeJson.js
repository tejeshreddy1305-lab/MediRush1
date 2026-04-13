export const safeJsonParse = (str, fallback = null) => {
  if (str == null || str === "") return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

export const safeLocalStorage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return fallback
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value))
    } catch {
      console.warn("localStorage unavailable")
    }
  },
  setString(key, value) {
    try {
      localStorage.setItem(key, String(value))
    } catch {
      console.warn("localStorage unavailable")
    }
  },
  getString(key, fallback = "") {
    try {
      return localStorage.getItem(key) ?? fallback
    } catch {
      return fallback
    }
  },
}
