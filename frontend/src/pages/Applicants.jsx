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
    try { const [record, list] = await Promise.all([api.shift(shiftId), api.applicants(shiftId)]); setShift(record); setApplicants(list); setError(''); return true }
    catch (caught) { setError(caught.message); return false }
    finally { setLoading(false) }
  }, [shiftId])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  function retry() { setLoading(true); setError(''); load() }
  async function act(id, work, success) {
    setProcessingId(id); setActionError(''); setFeedback('')
    try { await work(); if (await load()) setFeedback(success); else setActionError('Action succeeded, but the latest records could not be loaded. Try again.') }
    catch (caught) { setActionError(caught.message) }
    finally { setProcessingId(null) }
  }
  const incomplete = applicants.filter((item) => item.status === 'ACCEPTED').some((item) => !item.attendance_status || item.attendance_status === 'NOT_MARKED')
  const acceptedCount = applicants.filter((item) => item.status === 'ACCEPTED').length
  const canComplete = ['OPEN', 'FILLED'].includes(shift?.status) && acceptedCount > 0 && !incomplete
  const completionReason = acceptedCount === 0 ? 'Accept at least one worker before completing this shift.' : incomplete ? 'Mark attendance for every accepted worker before completing.' : !['OPEN', 'FILLED'].includes(shift?.status) ? `This shift is already ${shift?.status?.toLowerCase()}.` : 'Attendance is ready. You can complete this shift.'
  return <div className="screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">Business</span><h1>Applicants</h1><p>Review workers, record attendance and complete the shift.</p></div><Button type="button" variant="secondary" onClick={() => onNavigate('/business')}>Manage shifts</Button></header>
    <DataState loading={loading} error={error} onRetry={retry} empty={!shift} emptyMessage="This shift is unavailable.">
      {shift && <><ShiftCard shift={shift} actions={<Button type="button" variant="secondary" onClick={() => onNavigate(`/business/shifts/${shiftId}`)}>Shift details</Button>} />
      {actionError && <StatusMessage type="error">{actionError}</StatusMessage>}{feedback && <StatusMessage type="success">{feedback}</StatusMessage>}
      <section className="applicants-section" aria-labelledby="applicants-heading"><div className="section-heading-row"><h2 id="applicants-heading">Applications</h2><span className="staffing-count">{acceptedCount} confirmed · {shift.remaining_slots} remaining</span></div>
        <DataState loading={false} error="" empty={applicants.length === 0} emptyMessage="No one has applied for this shift yet.">
          <div className="card-list">{applicants.map((item) => <article className="applicant-card" key={item.id}>
            <div><h3>{item.worker_name}</h3><p>Applied {new Date(item.applied_at).toLocaleString()}</p>{item.status === 'ACCEPTED' && <p>Attendance: {item.attendance_status || 'NOT_MARKED'}</p>}{item.rejection_reason && <p>Reason: {item.rejection_reason}</p>}</div>
            <span className={`chip chip-${item.status?.toLowerCase()}`}>{item.status}</span>
            <div className="shift-actions"><Button type="button" disabled={processingId !== null || item.status !== 'PENDING' || shift.status !== 'OPEN'} onClick={() => act(item.id, () => api.acceptApplication(item.id), 'Application accepted.')}>Accept</Button><Button type="button" variant="secondary" disabled={processingId !== null || item.status !== 'PENDING'} onClick={() => act(item.id, () => api.rejectApplication(item.id), 'Application rejected.')}>Reject</Button>{item.status === 'ACCEPTED' && shift.status !== 'COMPLETED' && <><Button type="button" variant="secondary" disabled={processingId !== null} onClick={() => act(item.id, () => api.markAttendance(item.id, 'PRESENT'), 'Attendance marked present.')}>Present</Button><Button type="button" variant="secondary" disabled={processingId !== null} onClick={() => act(item.id, () => api.markAttendance(item.id, 'ABSENT'), 'Attendance marked absent.')}>Absent</Button></>}</div>
          </article>)}</div>
        </DataState>
      </section><section className="panel detail-action"><h2>Shift completion</h2><p>{completionReason}</p><Button type="button" disabled={processingId !== null || !canComplete} onClick={() => act('complete', () => api.completeShift(shiftId), 'Shift completed.')}>Complete shift</Button></section></>}
    </DataState>
  </div>
}
