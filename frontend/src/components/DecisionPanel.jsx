import { AlertTriangle, CheckCircle, RefreshCw, Shield } from 'lucide-react'

export default function DecisionPanel({ decision, loading, onTrigger, shipmentId }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <RefreshCw size={12} className="animate-spin" /> Evaluating decision…
      </div>
    )
  }

  const isReroute = decision?.action === 'REROUTE'

  return (
    <div className="flex flex-col gap-3">
      {/* Trigger button */}
      <button
        onClick={onTrigger}
        disabled={!shipmentId || loading}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          shipmentId
            ? 'bg-[#00d4a0]/10 border border-[#00d4a0]/30 text-[#00d4a0] hover:bg-[#00d4a0]/20'
            : 'bg-white/[0.03] border border-white/[0.06] text-slate-600 cursor-not-allowed'
        }`}
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Run Decision Engine
      </button>

      {decision && (
        <>
          {/* Action banner */}
          <div className={`rounded-xl px-4 py-3 border flex items-start gap-3 ${
            isReroute
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            {isReroute
              ? <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              : <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`text-sm font-semibold ${isReroute ? 'text-red-300' : 'text-emerald-300'}`}>
                {isReroute
                  ? decision.rerouted ? '🔄 Rerouting Triggered' : '⚠️ Reroute Evaluated'
                  : '✅ Keeping Current Route'
                }
              </p>
              <p className="text-xs text-slate-400 mt-1">{decision.reason_short}</p>
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-xs text-slate-600">Confidence</p>
              <p className={`text-sm font-mono font-semibold ${isReroute ? 'text-red-400' : 'text-emerald-400'}`}>
                {Math.round(decision.confidence * 100)}%
              </p>
            </div>
          </div>

          {/* Rule fired */}
          <div className="bg-[#0b0f1a] border border-white/[0.06] rounded-xl px-3 py-2.5">
            <p className="text-xs text-slate-600 mb-1 flex items-center gap-1.5">
              <Shield size={10} /> Rule Triggered
            </p>
            <p className="text-xs text-slate-300">{decision.triggered_rule}</p>
          </div>

          {/* Active route chip */}
          {decision.chosen_route_id && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Active Route:</span>
              <span className="text-xs font-mono font-semibold text-[#00d4a0] bg-[#00d4a0]/10 px-2 py-0.5 rounded-full">
                {decision.chosen_route_id}
              </span>
            </div>
          )}

          {/* Detail text */}
          <div className="bg-[#0b0f1a] border border-white/[0.06] rounded-xl px-3 py-3">
            <p className="text-xs text-slate-600 mb-1.5">Decision Detail</p>
            <p className="text-xs text-slate-400 leading-relaxed">{decision.reason_detail}</p>
          </div>
        </>
      )}
    </div>
  )
}
