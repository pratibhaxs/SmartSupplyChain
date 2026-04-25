import { useState, useMemo, useCallback } from 'react'
import { useShipmentSocket } from '../hooks/useShipmentSocket'
import ShipmentTable from '../components/ShipmentTable'
import MapView from '../components/MapView'
import StatsBar from '../components/StatsBar'
import PredictionPanel from '../components/PredictionPanel'
import RouteComparison from '../components/RouteComparison'
import DecisionPanel from '../components/DecisionPanel'
import ExplanationPanel from '../components/ExplanationPanel'
import { routingService } from '../services/api'
import { Wifi, WifiOff, Truck, Brain, Radio, Route, AlertTriangle, Zap } from 'lucide-react'

function formatTime(date) {
  if (!date) return ''
  return date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true })
}

const LEFT_PANELS = [
  { id: 'table',    label: 'Shipments', icon: Truck },
  { id: 'ai',       label: 'AI Predict', icon: Brain },
  { id: 'routes',   label: 'Routes', icon: Route },
  { id: 'decision', label: 'Decision', icon: AlertTriangle },
  { id: 'explain',  label: 'AI Explain', icon: Zap },
]

export default function Dashboard() {
  const { shipments, connected, lastUpdated, reconnectCount } = useShipmentSocket()
  const [selectedId, setSelectedId]     = useState(null)
  const [activePanel, setActivePanel]   = useState('table')
  const [optimizeFor, setOptimizeFor]   = useState('balanced')

  // Phase 3 state
  const [routeData, setRouteData]       = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [decision, setDecision]         = useState(null)
  const [decisionLoading, setDecisionLoading] = useState(false)
  const [explanation, setExplanation]   = useState(null)
  const [explainLoading, setExplainLoading]   = useState(false)

  const selected = shipments.find(s => s.id === selectedId) || null

  const stats = useMemo(() => ({
    total:      shipments.length,
    in_transit: shipments.filter(s => s.status === 'In Transit').length,
    delayed:    shipments.filter(s => s.status === 'Delayed').length,
    delivered:  shipments.filter(s => s.status === 'Delivered').length,
    high_risk:  shipments.filter(s => s.prediction?.risk_level === 'HIGH').length,
  }), [shipments])

  const handleSelect = useCallback((id) => {
    setSelectedId(id)
    // Clear previous route data when selection changes
    setRouteData(null)
    setDecision(null)
    setExplanation(null)
  }, [])

  const handleComputeRoutes = useCallback(async () => {
    if (!selectedId) return
    setRouteLoading(true)
    try {
      const data = await routingService.getRoute(selectedId, optimizeFor)
      setRouteData(data)
    } catch (e) {
      console.error('Route fetch failed', e)
    } finally {
      setRouteLoading(false)
    }
  }, [selectedId, optimizeFor])

  const handleDecision = useCallback(async () => {
    if (!selectedId) return
    setDecisionLoading(true)
    try {
      const data = await routingService.triggerReroute(selectedId, optimizeFor)
      setDecision(data.decision)
      // Also update route data from decision response
      if (data.active_route && data.alternative_route) {
        setRouteData(prev => ({
          ...prev,
          route_a: data.active_route,
          route_b: data.alternative_route,
        }))
      }
    } catch (e) {
      console.error('Decision failed', e)
    } finally {
      setDecisionLoading(false)
    }
  }, [selectedId, optimizeFor])

  const handleExplain = useCallback(async () => {
    if (!selectedId) return
    setExplainLoading(true)
    try {
      const data = await routingService.explainRoute(selectedId, optimizeFor)
      setExplanation(data)
    } catch (e) {
      console.error('Explanation failed', e)
    } finally {
      setExplainLoading(false)
    }
  }, [selectedId, optimizeFor])

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
            <p className="text-xs text-slate-600">Phase 3 · Routing Engine + Decision Intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Optimize selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 hidden sm:block">Optimize:</span>
            <select
              value={optimizeFor}
              onChange={e => setOptimizeFor(e.target.value)}
              className="bg-[#1a2235] border border-white/[0.08] text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00d4a0]/40"
            >
              <option value="balanced">⚖ Balanced</option>
              <option value="time">⚡ Speed</option>
              <option value="cost">💰 Cost</option>
            </select>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            {connected
              ? <><Radio size={12} className="text-[#00d4a0] pulse-dot" /><span className="text-xs text-[#00d4a0]">Live</span></>
              : <><WifiOff size={12} className="text-red-400" /><span className="text-xs text-red-400">Reconnecting ({reconnectCount})</span></>
            }
          </div>
          {lastUpdated && (
            <span className="text-xs text-slate-600 font-mono hidden lg:block">{formatTime(lastUpdated)}</span>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        <StatsBar stats={stats} />

        {!connected && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <WifiOff size={14} />
            WebSocket disconnected — ensure backend is running on port 8000.
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

            {/* ── Left panel ── */}
            <div className="flex flex-col min-h-0 bg-[#111827] rounded-xl border border-white/[0.06] p-4">
              {/* Tab bar */}
              <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                {LEFT_PANELS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActivePanel(id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                      activePanel === id
                        ? id === 'explain' ? 'bg-[#1a2235] text-violet-400'
                        : id === 'decision' ? 'bg-[#1a2235] text-amber-400'
                        : id === 'routes' ? 'bg-[#1a2235] text-blue-400'
                        : id === 'ai' ? 'bg-[#1a2235] text-violet-400'
                        : 'bg-[#1a2235] text-[#00d4a0]'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Icon size={11} /> {label}
                    {id === 'routes' && selected && (
                      <span className="ml-1 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">{selected.id}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {activePanel === 'table' && (
                  <ShipmentTable
                    shipments={shipments}
                    selectedId={selectedId}
                    onSelect={id => { handleSelect(id); setActivePanel('ai') }}
                  />
                )}

                {activePanel === 'ai' && (
                  <PredictionPanel shipment={selected} />
                )}

                {activePanel === 'routes' && (
                  <div className="flex flex-col gap-3">
                    {/* Compute button */}
                    <button
                      onClick={handleComputeRoutes}
                      disabled={!selectedId || routeLoading || selected?.status === 'Delivered'}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        selectedId && selected?.status !== 'Delivered'
                          ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                          : 'bg-white/[0.03] border border-white/[0.06] text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <Route size={14} className={routeLoading ? 'animate-spin' : ''} />
                      {routeLoading ? 'Computing…' : selectedId ? `Compute Routes for ${selectedId}` : 'Select a shipment first'}
                    </button>
                    <RouteComparison routeData={routeData} loading={routeLoading} />
                  </div>
                )}

                {activePanel === 'decision' && (
                  <DecisionPanel
                    decision={decision}
                    loading={decisionLoading}
                    shipmentId={selectedId}
                    onTrigger={handleDecision}
                  />
                )}

                {activePanel === 'explain' && (
                  <ExplanationPanel
                    data={explanation}
                    loading={explainLoading}
                    shipmentId={selectedId}
                    onGenerate={handleExplain}
                  />
                )}
              </div>
            </div>

            {/* ── Right: Map ── */}
            <div className="flex flex-col min-h-0 bg-[#111827] rounded-xl border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Map</h2>
                <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />In Transit</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Med. Risk</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />High Risk</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Delivered</span>
                  {routeData && <>
                    <span className="flex items-center gap-1"><span className="w-8 border-t-2 border-blue-400 inline-block" />Route A</span>
                    <span className="flex items-center gap-1"><span className="w-8 border-t-2 border-dashed border-violet-400 inline-block" />Route B</span>
                  </>}
                </div>
              </div>
              <div className="flex-1 min-h-[400px]">
                <MapView
                  shipments={shipments}
                  selectedId={selectedId}
                  onSelect={id => { handleSelect(id); setActivePanel('ai') }}
                  routeData={routeData}
                />
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}
