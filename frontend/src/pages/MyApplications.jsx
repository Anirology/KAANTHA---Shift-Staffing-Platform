import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { formatMoney, formatShiftTime } from '../utils/format'

export function MyApplications({ onNavigate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const applications = await api.myApplications()
      const details = await Promise.all(applications.map((item) => api.shift(item.shift_id)))
      setItems(applications.map((application, index) => ({ application, shift: details[index] })))
    } catch (caught) { setError(caught.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  function refresh() { setLoading(true); setError(''); load() }

  return <div className="screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">Worker</span><h1>My applications</h1><p>Statuses are shown as returned by the server. Refresh to check for decisions.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={refresh}>Refresh</Button></header>
    <DataState loading={loading} error={error} onRetry={refresh} empty={items.length === 0} emptyMessage="You have not applied for a shift yet.">
      <div className="card-list">{items.map(({ application, shift }) => <article className="application-card" key={application.id}>
        <div><h2>{shift.role}</h2><p>{shift.business_name} · {shift.date} · {formatShiftTime(shift)} · {formatMoney(shift.payment)}</p>{application.rejection_reason && <p>Reason: {application.rejection_reason}</p>}</div>
        <span className={`chip chip-${application.status?.toLowerCase()}`}>{application.status}</span>
        <Button type="button" variant="secondary" onClick={() => onNavigate(`/worker/shifts/${shift.id}`)}>Details</Button>
      </article>)}</div>
    </DataState>
  </div>
}
