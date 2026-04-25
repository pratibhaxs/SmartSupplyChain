// Visual badge for AI-predicted risk level: LOW / MEDIUM / HIGH
const RISK = {
  HIGH:   { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20',    icon: '🔴' },
  MEDIUM: { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20',  icon: '🟡' },
  LOW:    { bg: 'bg-emerald-500/10',text: 'text-emerald-400',border: 'border-emerald-500/20',icon: '🟢' },
}

export default function RiskBadge({ level }) {
  const r = RISK[level] || RISK.LOW
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${r.bg} ${r.text} ${r.border}`}>
      {r.icon} {level}
    </span>
  )
}
