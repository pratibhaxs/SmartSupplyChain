import { Clock, DollarSign, AlertTriangle, Navigation, Route } from 'lucide-react'

function MetricCell({ value, better, unit = '' }) {
  return (
    <td className="px-3 py-3 text-center">
      <span className={`text-sm font-mono font-semibold ${better ? 'text-emerald-400' : 'text-slate-300'}`}>
        {value}{unit}
      </span>
      {better && <span className="ml-1 text-xs text-emerald-500">✓</span>}
    </td>
  )
}

function SegmentPill({ seg, color }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
      seg.condition?.incident
        ? 'bg-red-500/10 border-red-500/20'
        : seg.condition?.traffic_factor > 1.6
        ? 'bg-amber-500/10 border-amber-500/20'
        : 'bg-white/[0.03] border-white/[0.06]'
    }`}>
      <span className={`w-2 h-2 rounded-full shrink-0`} style={{ background: color }} />
      <span className="text-slate-400">{seg.highway}</span>
      <span className="text-slate-600">·</span>
      <span className="text-slate-300">{seg.from_city}→{seg.to_city}</span>
      <span className="ml-auto text-slate-500">{seg.condition?.label}</span>
      {seg.condition?.incident && <span className="text-red-400 font-semibold">⚠</span>}
    </div>
  )
}

export default function RouteComparison({ routeData, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-[#00d4a0] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-600">Computing routes…</p>
        </div>
      </div>
    )
  }

  if (!routeData) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-600 text-sm">
        Select a shipment and click "Compute Routes" to see comparison
      </div>
    )
  }

  const { route_a, route_b, comparison } = routeData

  const aFasterTime = route_a.total_time_hr <= route_b.total_time_hr
  const aCheaper    = route_a.total_cost_inr <= route_b.total_cost_inr
  const aSafer      = route_a.avg_risk <= route_b.avg_risk
  const aShorter    = route_a.total_distance_km <= route_b.total_distance_km

  return (
    <div className="flex flex-col gap-4">
      {/* Comparison table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0b0f1a] border-b border-white/[0.06]">
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Metric</th>
              <th className="text-center px-3 py-3 text-xs font-medium uppercase tracking-wider">
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-blue-400">Route A</span>
                  <span className="text-slate-600 text-xs normal-case font-normal ml-1">(Primary)</span>
                </span>
              </th>
              <th className="text-center px-3 py-3 text-xs font-medium uppercase tracking-wider">
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                  <span className="text-violet-400">Route B</span>
                  <span className="text-slate-600 text-xs normal-case font-normal ml-1">(Alternative)</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            <tr className="bg-[#111827]">
              <td className="px-3 py-3 text-xs text-slate-500 flex items-center gap-2">
                <Navigation size={12} /> Distance
              </td>
              <MetricCell value={route_a.total_distance_km} unit=" km" better={aShorter} />
              <MetricCell value={route_b.total_distance_km} unit=" km" better={!aShorter} />
            </tr>
            <tr className="bg-[#0f1724]">
              <td className="px-3 py-3 text-xs text-slate-500 flex items-center gap-2">
                <Clock size={12} /> Est. Time
              </td>
              <MetricCell value={`${Math.floor(route_a.total_time_hr)}h ${Math.round((route_a.total_time_hr%1)*60)}m`} better={aFasterTime} />
              <MetricCell value={`${Math.floor(route_b.total_time_hr)}h ${Math.round((route_b.total_time_hr%1)*60)}m`} better={!aFasterTime} />
            </tr>
            <tr className="bg-[#111827]">
              <td className="px-3 py-3 text-xs text-slate-500 flex items-center gap-2">
                <DollarSign size={12} /> Cost
              </td>
              <MetricCell value={`₹${Math.round(route_a.total_cost_inr).toLocaleString()}`} better={aCheaper} />
              <MetricCell value={`₹${Math.round(route_b.total_cost_inr).toLocaleString()}`} better={!aCheaper} />
            </tr>
            <tr className="bg-[#0f1724]">
              <td className="px-3 py-3 text-xs text-slate-500 flex items-center gap-2">
                <AlertTriangle size={12} /> Risk
              </td>
              <MetricCell value={`${Math.round(route_a.avg_risk * 100)}%`} better={aSafer} />
              <MetricCell value={`${Math.round(route_b.avg_risk * 100)}%`} better={!aSafer} />
            </tr>
            <tr className="bg-[#111827]">
              <td className="px-3 py-3 text-xs text-slate-500 flex items-center gap-2">
                <Route size={12} /> Hops
              </td>
              <MetricCell value={route_a.cities?.length || 0} unit=" cities" better={route_a.cities?.length <= route_b.cities?.length} />
              <MetricCell value={route_b.cities?.length || 0} unit=" cities" better={route_b.cities?.length <= route_a.cities?.length} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Route path pills */}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <p className="text-xs text-blue-400 font-semibold mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Route A Segments
          </p>
          <div className="flex flex-col gap-1.5">
            {route_a.segments?.map((seg, i) => (
              <SegmentPill key={i} seg={seg} color="#3b82f6" />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-violet-400 font-semibold mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-400" /> Route B Segments
          </p>
          <div className="flex flex-col gap-1.5">
            {route_b.segments?.map((seg, i) => (
              <SegmentPill key={i} seg={seg} color="#8b5cf6" />
            ))}
          </div>
        </div>
      </div>

      {/* AI comparison text */}
      {comparison && (
        <div className="bg-[#0b0f1a] border border-white/[0.06] rounded-xl p-3">
          <p className="text-xs font-semibold text-[#00d4a0] mb-1.5">Quick Analysis</p>
          <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans">{comparison}</pre>
        </div>
      )}
    </div>
  )
}
