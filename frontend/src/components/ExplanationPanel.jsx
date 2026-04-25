import { Brain, Zap, RefreshCw } from 'lucide-react'

// Very lightweight markdown bolding: **text** → <strong>
function RichText({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="text-slate-200 font-semibold">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </span>
  )
}

export default function ExplanationPanel({ data, loading, onGenerate, shipmentId }) {
  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={!shipmentId || loading}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          shipmentId
            ? 'bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:bg-violet-500/20'
            : 'bg-white/[0.03] border border-white/[0.06] text-slate-600 cursor-not-allowed'
        }`}
      >
        {loading
          ? <RefreshCw size={14} className="animate-spin" />
          : <Brain size={14} />
        }
        {loading ? 'Generating…' : 'Generate AI Explanation'}
      </button>

      {!data && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-600">
          <Brain size={28} className="opacity-30" />
          <p className="text-sm">Select a shipment and click Generate</p>
          <p className="text-xs">The AI engine will explain the routing decision</p>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Zap size={24} className="text-violet-400 mx-auto mb-2 animate-pulse" />
            <p className="text-xs text-slate-500">Analysing routes and conditions…</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-3 overflow-y-auto flex-1">
          {/* Decision action badge */}
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit border ${
            data.decision_action === 'REROUTE'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <Zap size={10} />
            {data.decision_action === 'REROUTE' ? 'Reroute' : 'Keep Route'}
          </div>

          {/* Main explanation */}
          <div className="bg-[#0b0f1a] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={13} className="text-violet-400" />
              <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">AI Analysis</span>
            </div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-3">
              {data.explanation.split('\n\n').map((block, i) => (
                <p key={i}><RichText text={block} /></p>
              ))}
            </div>
          </div>

          {/* Route summaries */}
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl px-3 py-2.5">
              <p className="text-xs text-blue-400 font-semibold mb-1">Route A</p>
              <p className="text-xs text-slate-500">{data.route_a_summary}</p>
            </div>
            <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl px-3 py-2.5">
              <p className="text-xs text-violet-400 font-semibold mb-1">Route B</p>
              <p className="text-xs text-slate-500">{data.route_b_summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
