import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { ShiftCard } from '../components/ShiftCard'
import { StatusMessage } from '../components/StatusMessage'

export function ManageShifts({ businessName, onNavigate }) {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const load = useCallback(async () => {
    try { setShifts(await api.businessShifts()) }
    catch (caught) { setError(caught.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  function retry() { setLoading(true); setError(''); load() }

  async function cancel(shift) {
    if (!window.confirm(`Cancel ${shift.role} on ${shift.date}?`)) return
    setProcessingId(shift.id)
    setActionError('')
    setFeedback('')
    try {
      await api.cancelShift(shift.id)
      setShifts(await api.businessShifts())
      setFeedback('Shift cancelled.')
    } catch (caught) { setActionError(caught.message) }
    finally { setProcessingId(null) }
  }

  const summary = {
    total: shifts.length,
    open: shifts.filter((shift) => shift.status === 'OPEN').length,
    filled: shifts.filter((shift) => shift.status === 'FILLED').length,
    completed: shifts.filter((shift) => shift.status === 'COMPLETED').length,
  }

  return <div className="screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">Active business · {businessName || 'Business'}</span><h1>Manage shifts</h1><p>Review staffing, applicants and shift progress.</p></div><Button type="button" onClick={() => onNavigate('/business/shifts/new')}>Create shift</Button></header>
    {!loading && !error && <section className="summary-grid" aria-label="Shift summary">{Object.entries(summary).map(([name, value]) => <div className="summary-card" key={name}><strong>{value}</strong><span>{name}</span></div>)}</section>}
    {actionError && <StatusMessage type="error">{actionError}</StatusMessage>}{feedback && <StatusMessage type="success">{feedback}</StatusMessage>}
    <DataState loading={loading} error={error} onRetry={retry} empty={shifts.length === 0} emptyMessage="You have no shifts yet. Create your first shift to get started." emptyAction={<Button type="button" onClick={() => onNavigate('/business/shifts/new')}>Create first shift</Button>}>
      <div className="card-list">{shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} actions={<>
        <Button type="button" onClick={() => onNavigate(`/business/shifts/${shift.id}/applicants`)}>Applicants</Button>
        <Button type="button" variant="secondary" onClick={() => onNavigate(`/business/shifts/${shift.id}`)}>Details</Button>
        <Button type="button" variant="secondary" disabled={processingId !== null || ['CANCELLED', 'COMPLETED'].includes(shift.status)} onClick={() => onNavigate(`/business/shifts/${shift.id}/edit`)}>Edit</Button>
        <Button type="button" variant="danger" disabled={processingId !== null || ['CANCELLED', 'COMPLETED'].includes(shift.status)} onClick={() => cancel(shift)}>{processingId === shift.id ? 'Cancelling…' : 'Cancel'}</Button>
      </>} />)}</div>
    </DataState>
  </div>
}
