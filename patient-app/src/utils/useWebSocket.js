import { useCallback, useEffect, useRef } from "react"

export const useWebSocket = (url, onMessage) => {
  const wsRef = useRef(null)
  const reconnectDelay = useRef(1000)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!url) return
    try {
      const ws = new WebSocket(url)
      ws.onopen = () => {
        reconnectDelay.current = 1000
      }
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          onMessageRef.current?.(data)
        } catch {
          console.warn("WS message parse error")
        }
      }
      ws.onclose = () => {
        window.setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000)
          connect()
        }, reconnectDelay.current)
      }
      ws.onerror = () => {
        try {
          ws.close()
        } catch {
          /* ignore */
        }
      }
      wsRef.current = ws
    } catch {
      console.warn("WebSocket connection failed")
    }
  }, [url])

  useEffect(() => {
    connect()
    return () => {
      try {
        wsRef.current?.close()
      } catch {
        /* ignore */
      }
    }
  }, [connect])

  return wsRef
}
