// Visual risk score bar (0-100)
export default function RiskBar({ score }) {
  const color =
    score >= 70 ? 'bg-red-500' :
    score >= 40 ? 'bg-amber-500' :
    'bg-emerald-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-400 w-6 text-right">{score}</span>
    </div>
  )
}
