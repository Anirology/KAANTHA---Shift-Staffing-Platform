import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { ShiftCard } from '../components/ShiftCard'
import { StatusMessage } from '../components/StatusMessage'

export function Applicants({ shiftId, onNavigate }) {
  const [shift, setShift] = useState(null)
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const load = useCallback(async () => {
    try {
      const [record, list] = await Promise.all([api.shift(shiftId), api.applicants(shiftId)])
      setShift(record)
      setApplicants(list)
    } catch (caught) { setError(caught.message) }
    finally { setLoading(false) }
  }, [shiftId])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  function retry() { setLoading(true); setError(''); load() }

  async function decide(id, decision) {
    setProcessingId(id)
    setActionError('')
    setFeedback('')
    try {
      const updated = decision === 'accept' ? await api.acceptApplication(id) : await api.rejectApplication(id)
      setApplicants((current) => current.map((item) => item.id === id ? updated : item))
      setFeedback(`Application ${updated.status.toLowerCase()}.`)
      setShift(await api.shift(shiftId))
    } catch (caught) { setActionError(caught.message) }
    finally { setProcessingId(null) }
  }

  return <div className="screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">Business</span><h1>Applicants</h1><p>Review applications for this shift.</p></div><Button type="button" variant="secondary" onClick={() => onNavigate('/business')}>Manage shifts</Button></header>
    <DataState loading={loading} error={error} onRetry={retry} empty={!shift} emptyMessage="This shift is unavailable.">
      <><ShiftCard shift={shift} actions={<Button type="button" variant="secondary" onClick={() => onNavigate(`/business/shifts/${shiftId}`)}>Shift details</Button>} />
      {actionError && <StatusMessage type="error">{actionError}</StatusMessage>}{feedback && <StatusMessage type="success">{feedback}</StatusMessage>}
      <section className="applicants-section" aria-labelledby="applicants-heading"><h2 id="applicants-heading">Applications</h2>
        <DataState loading={false} error="" empty={applicants.length === 0} emptyMessage="No one has applied for this shift yet.">
          <div className="card-list">{applicants.map((item) => <article className="applicant-card" key={item.id}>
            <div><h3>{item.worker_name}</h3><p>Applied {new Date(item.applied_at).toLocaleString()}</p></div>
            <span className={`chip chip-${item.status?.toLowerCase()}`}>{item.status}</span>
            <div className="shift-actions"><Button type="button" disabled={processingId !== null || item.status !== 'PENDING' || shift.status !== 'OPEN'} onClick={() => decide(item.id, 'accept')}>{processingId === item.id ? 'Processing…' : 'Accept'}</Button><Button type="button" variant="secondary" disabled={processingId !== null || item.status !== 'PENDING'} onClick={() => decide(item.id, 'reject')}>{processingId === item.id ? 'Processing…' : 'Reject'}</Button></div>
          </article>)}</div>
        </DataState>
      </section></>
    </DataState>
  </div>
}
