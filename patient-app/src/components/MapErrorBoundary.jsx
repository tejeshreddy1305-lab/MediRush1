import React from "react"

export default class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error("Maps error:", error, info)
  }

  render() {
    if (this.state.hasError) {
      const lat = this.props.lat ?? 13.6288
      const lng = this.props.lng ?? 79.4192
      return (
        <iframe
          title="map-fallback"
          width="100%"
          height="100%"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}&marker=${lat},${lng}`}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      )
    }
    return this.props.children
  }
}
