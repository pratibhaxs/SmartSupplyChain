import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function markerColor(s) {
  if (s.status === 'Delivered') return '#10b981'
  const risk = s.prediction?.risk_level
  if (risk === 'HIGH')   return '#ef4444'
  if (risk === 'MEDIUM') return '#f59e0b'
  if (s.status === 'Delayed') return '#ef4444'
  return '#3b82f6'
}

function createIcon(color, size = 14) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 0 8px ${color}80;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  })
}

function FlyTo({ shipment }) {
  const map = useMap()
  useEffect(() => {
    if (!shipment) return
    map.flyTo([shipment.current_location.lat, shipment.current_location.lng], 7, { duration: 1.0 })
  }, [shipment?.id])
  return null
}

function fmtETA(iso) {
  try { return new Date(iso).toLocaleString('en-IN', { day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true }) }
  catch { return iso }
}

export default function MapView({ shipments, selectedId, onSelect, routeData }) {
  const selected = shipments.find(s => s.id === selectedId)

  return (
    <MapContainer center={[22.5, 80.0]} zoom={5} style={{ height: '100%', width: '100%' }} className="rounded-xl overflow-hidden">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
      {selected && <FlyTo shipment={selected} />}

      {/* Route A polyline (blue) */}
      {routeData?.route_a?.coordinates?.length > 1 && (
        <Polyline
          positions={routeData.route_a.coordinates.map(c => [c.lat, c.lng])}
          pathOptions={{ color: '#3b82f6', weight: 3.5, opacity: 0.9 }}
        />
      )}
      {/* Route B polyline (violet dashed) */}
      {routeData?.route_b?.coordinates?.length > 1 && (
        <Polyline
          positions={routeData.route_b.coordinates.map(c => [c.lat, c.lng])}
          pathOptions={{ color: '#8b5cf6', weight: 2.5, opacity: 0.7, dashArray: '9 6' }}
        />
      )}
      {/* Route A waypoints */}
      {routeData?.route_a?.coordinates?.map((c, i) => (
        <CircleMarker key={`wa${i}`} center={[c.lat, c.lng]} radius={5}
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 1.5 }}>
          <Popup><span style={{fontSize:12,color:'#3b82f6',fontFamily:'monospace'}}>A: {c.city}</span></Popup>
        </CircleMarker>
      ))}
      {/* Route B waypoints */}
      {routeData?.route_b?.coordinates?.map((c, i) => (
        <CircleMarker key={`wb${i}`} center={[c.lat, c.lng]} radius={4}
          pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.8, weight: 1 }}>
          <Popup><span style={{fontSize:12,color:'#8b5cf6',fontFamily:'monospace'}}>B: {c.city}</span></Popup>
        </CircleMarker>
      ))}

      {/* Shipment markers */}
      {shipments.map(s => {
        const color = markerColor(s)
        const isSel = s.id === selectedId
        const pred  = s.prediction
        return (
          <div key={s.id}>
            <Polyline
              positions={[[s.origin.lat,s.origin.lng],[s.destination.lat,s.destination.lng]]}
              pathOptions={{ color, weight: isSel?2:1, opacity: isSel?0.55:0.15, dashArray:'5 5' }}
            />
            <Marker position={[s.origin.lat,s.origin.lng]} icon={createIcon(color,8)} />
            <Marker position={[s.destination.lat,s.destination.lng]} icon={createIcon(color,8)} />
            <Marker
              position={[s.current_location.lat,s.current_location.lng]}
              icon={createIcon(color,16)}
              eventHandlers={{ click: () => onSelect(s.id) }}
            >
              <Popup>
                <div style={{minWidth:190}}>
                  <p style={{fontFamily:'Space Mono,monospace',fontSize:13,color:'#00d4a0',marginBottom:4}}>{s.id}</p>
                  <p style={{fontSize:12,color:'#94a3b8',marginBottom:6}}>{s.cargo} · {s.carrier}</p>
                  <p style={{fontSize:12,color:'#e2e8f0'}}><span style={{color:'#475569'}}>From:</span> {s.origin.city}</p>
                  <p style={{fontSize:12,color:'#e2e8f0'}}><span style={{color:'#475569'}}>To:</span> {s.destination.city}</p>
                  <p style={{fontSize:12,color:'#e2e8f0',marginBottom:6}}><span style={{color:'#475569'}}>Now:</span> {s.current_location.city}</p>
                  {pred && <>
                    <p style={{fontSize:11,color:'#64748b'}}>ETA: {fmtETA(pred.eta_updated)}</p>
                    <p style={{fontSize:11,color:'#64748b'}}>{pred.speed_kmh} km/h · {pred.distance_remaining_km} km left</p>
                    <p style={{fontSize:11,marginTop:4,color:pred.risk_level==='HIGH'?'#ef4444':pred.risk_level==='MEDIUM'?'#f59e0b':'#10b981'}}>
                      Risk: {pred.risk_level} ({Math.round(pred.delay_probability*100)}%)
                    </p>
                  </>}
                </div>
              </Popup>
            </Marker>
          </div>
        )
      })}
    </MapContainer>
  )
}
