// Show every application beside the worker's future confirmed schedule.
import { useCallback, useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faClock, faCoins } from '@fortawesome/free-solid-svg-icons'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { formatMoney, formatShiftTime } from '../utils/format'

function dateRange(shift) {
  const days = shift.duration_days || 1
  if (days === 1) return shift.date
  const end = new Date(`${shift.date}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + days - 1)
  return `${shift.date} – ${end.toISOString().slice(0, 10)}`
}

function lastShiftDay(shift) {
  const end = new Date(`${shift.date}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + (shift.duration_days || 1) - 1)
  return end
}

export function MyApplications({ onNavigate }) {
  // Show application outcomes alongside an upcoming-work timeline for approved shifts.
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    // Fetch application summaries first, then load each associated shift for dates and time details.
    try {
      const applications = await api.myApplications()
      const shifts = await Promise.all(applications.map((item) => api.shift(item.shift_id)))
      setRecords(applications.map((application, index) => ({ application, shift: shifts[index] })))
      setError('')
    } catch (caught) { setError(caught.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  function refresh() { setLoading(true); setError(''); load() }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const upcoming = records
    // Only accepted shifts whose final day has not passed and whose business status is still active.
    .filter(({ application, shift }) => application.status === 'ACCEPTED' && lastShiftDay(shift) >= today && !['COMPLETED', 'CANCELLED'].includes(shift.status))
    .sort((a, b) => a.shift.date.localeCompare(b.shift.date) || a.shift.start_time.localeCompare(b.shift.start_time))

  return <div className="screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">Worker planner</span><h1>My applications</h1><p>Review your complete application history and plan around confirmed upcoming work.</p></div><Button type="button" variant="secondary" disabled={loading} onClick={refresh}>Refresh</Button></header>
    <DataState loading={loading} error={error} onRetry={refresh} empty={records.length === 0} emptyMessage="You have not applied for a shift yet." emptyAction={<Button type="button" onClick={() => onNavigate('/worker')}>Browse open shifts</Button>}>
      <div className="applications-dashboard">
        <section className="panel application-history-panel" aria-labelledby="application-history-title">
          <div className="worker-timeline-heading"><div><span className="intro-eyebrow">All activity</span><h2 id="application-history-title">Application history</h2></div><span className="timeline-count">{records.length} total</span></div>
          <div className="application-history-list">{records.map(({ application, shift }) => <article className="application-history-card" key={application.id}>
            <div><span className={`chip chip-${application.status.toLowerCase()}`}>{application.status}</span><h3>{shift.role}</h3><p>{shift.business_name}</p></div>
            <dl><div><dt>Dates</dt><dd>{dateRange(shift)} · {shift.duration_days || 1} {(shift.duration_days || 1) === 1 ? 'day' : 'days'}</dd></div><div><dt>Applied</dt><dd>{new Date(application.applied_at).toLocaleDateString()}</dd></div></dl>
            {application.rejection_reason && <p className="application-reason">Reason: {application.rejection_reason}</p>}
            <Button type="button" variant="secondary" onClick={() => onNavigate(`/worker/shifts/${shift.id}`)}>Details</Button>
          </article>)}</div>
        </section>
        <section className="panel upcoming-work-panel" aria-labelledby="upcoming-work-title">
          <div className="worker-timeline-heading"><div><span className="intro-eyebrow">Your schedule</span><h2 id="upcoming-work-title">Upcoming confirmed work</h2></div><span className="timeline-count">{upcoming.length}</span></div>
          {upcoming.length === 0 ? <div className="empty-state compact-empty"><p>No upcoming approved shifts yet.</p><Button type="button" onClick={() => onNavigate('/worker')}>Browse shifts</Button></div> : <div className="upcoming-work-list">{upcoming.map(({ application, shift }) => <article className="upcoming-work-card" key={application.id}>
            <div><span className="chip chip-accepted">Confirmed</span><h3>{shift.role}</h3><p>{shift.business_name}</p></div>
            <dl><div><dt><FontAwesomeIcon icon={faCalendarDays} /> Commitment</dt><dd>{dateRange(shift)} · {shift.duration_days || 1} {(shift.duration_days || 1) === 1 ? 'day' : 'days'}</dd></div><div><dt><FontAwesomeIcon icon={faClock} /> Daily hours</dt><dd>{formatShiftTime(shift)}</dd></div><div><dt><FontAwesomeIcon icon={faCoins} /> Total pay</dt><dd>{formatMoney(shift.total_payment || Number(shift.payment) * (shift.duration_days || 1))}</dd></div></dl>
            <Button type="button" variant="secondary" onClick={() => onNavigate(`/worker/shifts/${shift.id}`)}>View commitment</Button>
          </article>)}</div>}
        </section>
      </div>
    </DataState>
  </div>
}
