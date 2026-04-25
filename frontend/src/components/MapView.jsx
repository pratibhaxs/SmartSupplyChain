import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Color by status/risk
function markerColor(s) {
  if (s.status === 'Delivered') return '#10b981'
  const risk = s.prediction?.risk_level
  if (risk === 'HIGH')   return '#ef4444'
  if (risk === 'MEDIUM') return '#f59e0b'
  if (s.status === 'Delayed') return '#ef4444'
  return '#3b82f6'
}

function createMarker(color, isMain) {
  const size = isMain ? 16 : 8
  const pulse = isMain && color === '#ef4444'
    ? `animation: pulse-ring 1.5s ease-in-out infinite;` : ''
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border-radius:50%;
      border:2px solid white;
      box-shadow:0 0 ${isMain ? 10 : 4}px ${color}90;
      ${pulse}
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  })
}

// Auto-pan when selection changes
function FlyTo({ shipment }) {
  const map = useMap()
  useEffect(() => {
    if (!shipment) return
    const { lat, lng } = shipment.current_location
    map.flyTo([lat, lng], 7, { duration: 1.0 })
  }, [shipment?.id, shipment?.current_location?.lat])
  return null
}

function formatETA(iso) {
  try { return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }) }
  catch { return iso }
}

const ROUTE_ALPHA = { 'In Transit': 0.6, 'Delayed': 0.8, 'Delivered': 0.25 }

export default function MapView({ shipments, selectedId, onSelect }) {
  const selected = shipments.find(s => s.id === selectedId)

  return (
    <MapContainer
      center={[22.5, 80.0]}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl overflow-hidden"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      {selected && <FlyTo shipment={selected} />}

      {shipments.map(s => {
        const color   = markerColor(s)
        const alpha   = ROUTE_ALPHA[s.status] || 0.4
        const isSel   = s.id === selectedId
        const pred    = s.prediction

        return (
          <div key={s.id}>
            {/* Route line */}
            <Polyline
              positions={[
                [s.origin.lat, s.origin.lng],
                [s.destination.lat, s.destination.lng],
              ]}
              pathOptions={{
                color,
                weight: isSel ? 2.5 : 1,
                opacity: isSel ? alpha : alpha * 0.4,
                dashArray: '6 5',
              }}
            />
            {/* Origin dot */}
            <Marker position={[s.origin.lat, s.origin.lng]} icon={createMarker(color, false)} />
            {/* Destination dot */}
            <Marker position={[s.destination.lat, s.destination.lng]} icon={createMarker(color, false)} />
            {/* Current position — main interactive marker */}
            <Marker
              position={[s.current_location.lat, s.current_location.lng]}
              icon={createMarker(color, true)}
              eventHandlers={{ click: () => onSelect(s.id) }}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, color: '#00d4a0', marginBottom: 6 }}>{s.id}</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{s.cargo} · {s.carrier}</p>
                  <p style={{ fontSize: 12, color: '#e2e8f0' }}><span style={{color:'#475569'}}>From:</span> {s.origin.city}</p>
                  <p style={{ fontSize: 12, color: '#e2e8f0' }}><span style={{color:'#475569'}}>To:</span> {s.destination.city}</p>
                  <p style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 8 }}><span style={{color:'#475569'}}>Now:</span> {s.current_location.city}</p>
                  {pred && (
                    <>
                      <p style={{ fontSize: 11, color: '#64748b' }}>Updated ETA: {formatETA(pred.eta_updated)}</p>
                      <p style={{ fontSize: 11, color: '#64748b' }}>Speed: {pred.speed_kmh} km/h</p>
                      <p style={{ fontSize: 11, color: '#64748b' }}>Distance left: {pred.distance_remaining_km} km</p>
                      <p style={{ fontSize: 11, marginTop: 4,
                        color: pred.risk_level==='HIGH' ? '#ef4444' : pred.risk_level==='MEDIUM' ? '#f59e0b' : '#10b981'
                      }}>
                        Risk: {pred.risk_level} ({Math.round(pred.delay_probability*100)}% delay prob)
                      </p>
                    </>
                  )}
                  <p style={{ fontSize: 12, marginTop: 6, color: color }}>
                    Progress: {Math.round(s.progress * 100)}%
                  </p>
                </div>
              </Popup>
            </Marker>
          </div>
        )
      })}
    </MapContainer>
  )
}
