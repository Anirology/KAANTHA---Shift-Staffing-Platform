import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { ShiftCard } from '../components/ShiftCard'
import { StatusMessage } from '../components/StatusMessage'

export function ShiftDetails({ shiftId, accountRole, onNavigate }) {
  const [shift, setShift] = useState(null)
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [record, applications] = await Promise.all([api.shift(shiftId), accountRole === 'WORKER' ? api.myApplications() : Promise.resolve([])])
      setShift(record)
      setApplication(applications.find((item) => item.shift_id === shiftId) || null)
    } catch (caught) { setError(caught.message) }
    finally { setLoading(false) }
  }, [shiftId, accountRole])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  function retry() { setLoading(true); setError(''); load() }

  async function apply() {
    setBusy(true)
    setActionError('')
    try { setApplication(await api.apply(shiftId)) }
    catch (caught) { setActionError(caught.message) }
    finally { setBusy(false) }
  }

  return <div className="screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">{accountRole === 'WORKER' ? 'Worker' : 'Business'}</span><h1>Shift details</h1><p>Review the current details from Shiftly.</p></div></header>
    <DataState loading={loading} error={error} onRetry={retry} empty={!shift} emptyMessage="This shift is unavailable.">
      {shift && <><ShiftCard shift={shift} actions={accountRole === 'BUSINESS' ? <><Button type="button" onClick={() => onNavigate(`/business/shifts/${shiftId}/applicants`)}>View applicants</Button><Button type="button" variant="secondary" onClick={() => onNavigate(`/business/shifts/${shiftId}/edit`)} disabled={['CANCELLED', 'COMPLETED'].includes(shift.status)}>Edit shift</Button></> : null} />
      <section className="panel shift-description-panel"><span className="intro-eyebrow">About this shift</span><h2>Shift details</h2><p>{shift.description || 'No extra details were provided for this shift.'}</p></section>
      {accountRole === 'WORKER' && <section className="panel detail-action">
        <h2>Your application</h2>
        {application ? <><p>Current status: <span className={`chip chip-${application.status?.toLowerCase()}`}>{application.status}</span></p><Button type="button" variant="secondary" onClick={() => onNavigate('/worker/applications')}>My applications</Button></> : <><p>Apply to express interest. A business must accept your application before it is confirmed.</p><Button type="button" disabled={busy || shift.status !== 'OPEN'} onClick={apply}>{busy ? 'Applying…' : shift.status === 'OPEN' ? 'Apply for shift' : 'Applications closed'}</Button></>}
        {actionError && <StatusMessage type="error">{actionError}</StatusMessage>}
      </section>}</>}
    </DataState>
  </div>
}
