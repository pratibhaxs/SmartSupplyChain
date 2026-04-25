import { useState, useMemo } from 'react'
import { useShipmentSocket } from '../hooks/useShipmentSocket'
import ShipmentTable from '../components/ShipmentTable'
import MapView from '../components/MapView'
import StatsBar from '../components/StatsBar'
import PredictionPanel from '../components/PredictionPanel'
import { Wifi, WifiOff, Truck, Brain, Radio } from 'lucide-react'

function formatTime(date) {
  if (!date) return ''
  return date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })
}

export default function Dashboard() {
  const { shipments, connected, lastUpdated, reconnectCount } = useShipmentSocket()
  const [selectedId, setSelectedId] = useState(null)
  const [activePanel, setActivePanel] = useState('table') // 'table' | 'ai'

  const selected = shipments.find(s => s.id === selectedId) || null

  // Compute stats live from WS data
  const stats = useMemo(() => ({
    total:      shipments.length,
    in_transit: shipments.filter(s => s.status === 'In Transit').length,
    delayed:    shipments.filter(s => s.status === 'Delayed').length,
    delivered:  shipments.filter(s => s.status === 'Delivered').length,
    high_risk:  shipments.filter(s => s.prediction?.risk_level === 'HIGH').length,
  }), [shipments])

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-white/[0.06] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#00d4a0]/10 rounded-lg">
            <Truck size={18} className="text-[#00d4a0]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 tracking-wide">Smart Supply Chain</h1>
            <p className="text-xs text-slate-600">Phase 2 · Live Simulation + AI Predictions</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live badge */}
          <div className="flex items-center gap-1.5">
            {connected
              ? <><Radio size={12} className="text-[#00d4a0] pulse-dot" /><span className="text-xs text-[#00d4a0]">Live</span></>
              : <><WifiOff size={12} className="text-red-400" /><span className="text-xs text-red-400">Reconnecting… ({reconnectCount})</span></>
            }
          </div>
          {lastUpdated && (
            <span className="text-xs text-slate-600 font-mono hidden sm:block">
              {formatTime(lastUpdated)}
            </span>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        <StatsBar stats={stats} />

        {/* Disconnected banner */}
        {!connected && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <WifiOff size={14} />
            WebSocket disconnected — make sure the backend is running on port 8000.
          </div>
        )}

        {shipments.length === 0 && connected && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Radio size={24} className="text-[#00d4a0] mx-auto mb-3 pulse-dot" />
              <p className="text-slate-500 text-sm">Waiting for first tick…</p>
            </div>
          </div>
        )}

        {shipments.length > 0 && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
            {/* Left panel */}
            <div className="flex flex-col min-h-0 bg-[#111827] rounded-xl border border-white/[0.06] p-4">
              {/* Panel switcher */}
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setActivePanel('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activePanel === 'table' ? 'bg-[#1a2235] text-[#00d4a0]' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Truck size={11} /> Shipments
                </button>
                <button
                  onClick={() => setActivePanel('ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activePanel === 'ai' ? 'bg-[#1a2235] text-violet-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Brain size={11} /> AI Prediction
                  {selected && <span className="ml-1 bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full text-xs">{selected.id}</span>}
                </button>
              </div>

              {activePanel === 'table'
                ? <ShipmentTable shipments={shipments} selectedId={selectedId} onSelect={id => { setSelectedId(id); setActivePanel('ai') }} />
                : <PredictionPanel shipment={selected} />
              }
            </div>

            {/* Right: Map */}
            <div className="flex flex-col min-h-0 bg-[#111827] rounded-xl border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Map</h2>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />In Transit</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Medium Risk</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />High Risk</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Delivered</span>
                </div>
              </div>
              <div className="flex-1 min-h-[400px]">
                <MapView
                  shipments={shipments}
                  selectedId={selectedId}
                  onSelect={id => { setSelectedId(id); setActivePanel('ai') }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
