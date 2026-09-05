export default function StatCard({label,value,sub}) {
  return <div className="card stat">
    <div className="muted">{label}</div>
    <div className="stat-value">{value}</div>
    {sub && <div className="small">{sub}</div>}
  </div>
}
