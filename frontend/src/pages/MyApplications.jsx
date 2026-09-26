import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { formatMoney, formatShiftTime } from '../utils/format'

export function MyApplications({ onNavigate }) {
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { const applications = await api.myApplications(); const details = await Promise.all(applications.map((item) => api.shift(item.shift_id))); setItems(applications.map((application, index) => ({ application, shift: details[index] }))); setError('') }
    catch (caught) { setError(caught.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  function refresh() { setLoading(true); setError(''); load() }
  const visible = items.filter(({ application, shift }) => status === 'ALL' || (status === 'COMPLETED' ? application.status === 'ACCEPTED' && shift.status === 'COMPLETED' : application.status === status && !(status === 'ACCEPTED' && shift.status === 'COMPLETED')))
  return <div className="screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">Worker</span><h1>My applications</h1><p>Check pending, confirmed and completed work.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={refresh}>Refresh</Button></header>
    <div className="report-tabs" role="group" aria-label="Application status">{['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED'].map((value) => <button className={status === value ? 'report-tab active' : 'report-tab'} type="button" aria-pressed={status === value} key={value} onClick={() => setStatus(value)}>{value === 'ACCEPTED' ? 'Confirmed' : value === 'ALL' ? 'All' : value[0] + value.slice(1).toLowerCase()}</button>)}</div>
    <DataState loading={loading} error={error} onRetry={refresh} empty={visible.length === 0} emptyMessage="No applications in this view." emptyAction={<Button type="button" onClick={() => onNavigate('/worker')}>Browse open shifts</Button>}>
      <div className="card-list">{visible.map(({ application, shift }) => <article className="application-card" key={application.id}>
        <div><h2>{shift.role}</h2><p>{shift.business_name} · {shift.date} · {formatShiftTime(shift)} · {formatMoney(shift.payment)}</p>{application.status === 'ACCEPTED' && <p>Confirmed · {shift.status === 'COMPLETED' ? 'Shift completed' : 'Upcoming or in progress'} · Attendance: {application.attendance_status || 'NOT_MARKED'}</p>}{application.rejection_reason && <p>Reason: {application.rejection_reason}</p>}</div>
        <span className={`chip chip-${application.status?.toLowerCase()}`}>{application.status}</span>
        <Button type="button" variant="secondary" onClick={() => onNavigate(`/worker/shifts/${shift.id}`)}>Details</Button>
      </article>)}</div>
    </DataState>
  </div>
}
