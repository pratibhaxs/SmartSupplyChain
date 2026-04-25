import RiskBadge from './RiskBadge'
import ProgressBar from './ProgressBar'
import { Brain, Gauge, Navigation, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon size={12} />
        {label}
      </div>
      <div className="text-right">{children}</div>
    </div>
  )
}

function formatETA(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch { return iso }
}

export default function PredictionPanel({ shipment }) {
  if (!shipment) return (
    <div className="flex items-center justify-center h-full text-slate-600 text-sm">
      Select a shipment to see AI predictions
    </div>
  )

  const pred = shipment.prediction
  if (!pred) return (
    <div className="flex items-center justify-center h-full text-slate-600 text-sm">
      Waiting for first prediction tick...
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-500/10 rounded-lg">
            <Brain size={14} className="text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300">{shipment.id}</p>
            <p className="text-xs text-slate-600">{shipment.cargo} · {shipment.carrier}</p>
          </div>
        </div>
        <RiskBadge level={pred.risk_level} />
      </div>

      {/* Route progress */}
      <div>
        <div className="flex justify-between text-xs text-slate-600 mb-1">
          <span>{shipment.origin.city}</span>
          <span>{shipment.destination.city}</span>
        </div>
        <ProgressBar value={shipment.progress} />
      </div>

      {/* AI stats */}
      <div className="bg-[#0b0f1a] rounded-xl p-3">
        <Row icon={Clock} label="Updated ETA">
          <span className="text-xs font-mono text-slate-300">
            {formatETA(pred.eta_updated)}
          </span>
        </Row>

        <Row icon={Navigation} label="ETA in">
          <span className="text-xs font-mono text-[#00d4a0]">
            {pred.eta_minutes_remaining > 9000
              ? '—'
              : `${pred.eta_minutes_remaining} min`}
          </span>
        </Row>

        <Row icon={Gauge} label="Current Speed">
          <span className="text-xs font-mono text-slate-300">
            {pred.speed_kmh} km/h
          </span>
        </Row>

        <Row icon={Navigation} label="Distance Left">
          <span className="text-xs font-mono text-slate-300">
            {pred.distance_remaining_km} km
          </span>
        </Row>

        <Row icon={AlertTriangle} label="Delay Probability">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  pred.delay_probability > 0.65 ? 'bg-red-500' :
                  pred.delay_probability > 0.35 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.round(pred.delay_probability * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-400">
              {Math.round(pred.delay_probability * 100)}%
            </span>
          </div>
        </Row>

        <Row icon={pred.delay_status ? AlertTriangle : CheckCircle} label="Delay Status">
          {pred.delay_status
            ? <span className="text-xs text-red-400 font-semibold">⚠ DELAYED</span>
            : <span className="text-xs text-emerald-400 font-semibold">✓ ON TRACK</span>
          }
        </Row>
      </div>

      {/* Recommendation */}
      <div className={`rounded-xl px-3 py-2 text-xs border ${
        pred.risk_level === 'HIGH'
          ? 'bg-red-500/5 border-red-500/20 text-red-300'
          : pred.risk_level === 'MEDIUM'
          ? 'bg-amber-500/5 border-amber-500/20 text-amber-300'
          : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
      }`}>
        {pred.risk_level === 'HIGH' && '🚨 High disruption risk — consider rerouting or notifying recipient.'}
        {pred.risk_level === 'MEDIUM' && '⚡ Moderate risk — monitor closely, potential delay developing.'}
        {pred.risk_level === 'LOW' && '✅ Shipment on track — no action required.'}
      </div>
    </div>
  )
}
