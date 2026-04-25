import { useState, useEffect, useRef, useCallback } from 'react'

const WS_URL ='wss://smartsupplychain.onrender.com/ws/shipments';
const RECONNECT_DELAY = 3000

/**
 * useShipmentSocket
 * ------------------
 * Connects to the FastAPI WebSocket, parses incoming shipment snapshots,
 * and returns live state. Auto-reconnects on disconnect.
 *
 * Returns: { shipments, connected, lastUpdated, reconnectCount }
 */
export function useShipmentSocket() {
  const [shipments, setShipments]       = useState([])
  const [connected, setConnected]       = useState(false)
  const [lastUpdated, setLastUpdated]   = useState(null)
  const [reconnectCount, setReconnect]  = useState(0)

  const wsRef      = useRef(null)
  const timerRef   = useRef(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setConnected(true)
      // Keep-alive ping every 25 s
      timerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 25000)
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'shipment_update' && Array.isArray(data.shipments)) {
          setShipments(data.shipments)
          setLastUpdated(new Date())
        }
      } catch (e) {
        console.warn('WS parse error', e)
      }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnected(false)
      clearInterval(timerRef.current)
      // Auto-reconnect
      setTimeout(() => {
        if (mountedRef.current) {
          setReconnect(n => n + 1)
          connect()
        }
      }, RECONNECT_DELAY)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearInterval(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { shipments, connected, lastUpdated, reconnectCount }
}
