import { useState } from 'react'
import StatusBadge from './StatusBadge'
import RiskBadge from './RiskBadge'
import ProgressBar from './ProgressBar'
import { Gauge } from 'lucide-react'

function formatETA(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch { return iso }
}

export default function ShipmentTable({ shipments, selectedId, onSelect }) {
  const [filter, setFilter] = useState('All')
  const statuses = ['All', 'In Transit', 'Delayed', 'Delivered']

  const filtered = filter === 'All'
    ? shipments
    : shipments.filter(s => s.status === filter)

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 p-1 bg-[#0b0f1a] rounded-lg">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all duration-150 ${
              filter === s ? 'bg-[#1a2235] text-[#00d4a0] shadow' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#111827] border-b border-white/[0.06]">
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Shipment</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Updated ETA</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Speed</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Risk</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Progress</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const pred = s.prediction
              const isSelected = selectedId === s.id
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={`border-b border-white/[0.04] cursor-pointer transition-all duration-150 table-row-hover ${
                    isSelected
                      ? 'bg-[#00d4a0]/5 border-l-2 border-l-[#00d4a0]'
                      : 'bg-[#111827]'
                  }`}
                >
                  {/* ID + cargo */}
                  <td className="px-3 py-3">
                    <span className="font-mono text-xs text-[#00d4a0] block">{s.id}</span>
                    <span className="text-xs text-slate-600">{s.cargo}</span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <StatusBadge status={s.status} />
                    {pred?.delay_status && s.status !== 'Delayed' && (
                      <span className="block text-xs text-red-400 mt-0.5">⚠ delay risk</span>
                    )}
                  </td>

                  {/* Updated ETA */}
                  <td className="px-3 py-3">
                    <span className="text-xs font-mono text-slate-300 whitespace-nowrap">
                      {pred ? formatETA(pred.eta_updated) : formatETA(s.eta)}
                    </span>
                    {pred && (
                      <span className="block text-xs text-slate-600">
                        {pred.eta_minutes_remaining > 9000 ? '—' : `in ${pred.eta_minutes_remaining}m`}
                      </span>
                    )}
                  </td>

                  {/* Speed */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 text-xs text-slate-300">
                      <Gauge size={10} className="text-slate-600" />
                      {pred ? `${pred.speed_kmh}` : s.speed_kmh} km/h
                    </div>
                  </td>

                  {/* Risk level */}
                  <td className="px-3 py-3">
                    {pred
                      ? <RiskBadge level={pred.risk_level} />
                      : <span className="text-xs text-slate-600">—</span>
                    }
                  </td>

                  {/* Progress */}
                  <td className="px-3 py-3 min-w-[90px]">
                    <ProgressBar value={s.progress} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">No shipments found</div>
        )}
      </div>

      <p className="text-xs text-slate-600 mt-2 text-right">
        {filtered.length} of {shipments.length} shipments
      </p>
    </div>
  )
}
