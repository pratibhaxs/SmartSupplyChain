import { Package, Truck, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="flex items-center gap-3 bg-[#1a2235] border border-white/[0.06] rounded-xl px-4 py-3">
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon size={15} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-semibold text-slate-100 font-mono">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  </div>
)

export default function StatsBar({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
      <StatCard icon={Package}      label="Total"      value={stats?.total}       color="bg-slate-600" />
      <StatCard icon={Truck}        label="In Transit" value={stats?.in_transit}   color="bg-blue-600"  />
      <StatCard icon={AlertTriangle}label="Delayed"    value={stats?.delayed}      color="bg-red-600"   />
      <StatCard icon={CheckCircle}  label="Delivered"  value={stats?.delivered}    color="bg-emerald-600" />
      <StatCard icon={ShieldAlert}  label="High Risk"  value={stats?.high_risk}    color="bg-violet-600"  sub="AI flagged" />
    </div>
  )
}
