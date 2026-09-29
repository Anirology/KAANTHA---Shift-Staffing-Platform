// Create or edit a shift with validated schedule, staffing, payment, and skill fields.
import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { decimalString, toApiTime } from '../utils/format'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'

const initial = { role: '', description: '', date: '', duration_days: '1', start_time: '', end_time: '', required_workers: '1', payment: '', required_skill_id: '' }

export function ShiftForm({ shiftId, onNavigate, isModal = false }) {
  const editing = Boolean(shiftId)
  const [fields, setFields] = useState(initial)
  const [skills, setSkills] = useState([])
  const [shift, setShift] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [skillList, current] = await Promise.all([api.skills(), editing ? api.shift(shiftId) : Promise.resolve(null)])
      setSkills(skillList)
      setShift(current)
      setFields(current ? {
        role: current.role, description: current.description || '', date: current.date, duration_days: String(current.duration_days || 1), start_time: current.start_time.slice(0, 5), end_time: current.end_time.slice(0, 5),
        required_workers: String(current.required_workers), payment: current.payment, required_skill_id: String(current.required_skill_id),
      } : initial)
    } catch (caught) { setError(caught.message) }
    finally { setLoading(false) }
  }, [editing, shiftId])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  function retry() { setLoading(true); setError(''); load() }

  function change(name, value) { setFields((current) => ({ ...current, [name]: value })) }

  async function submit(event) {
    event.preventDefault()
    setFormError('')
    setSaved(null)
    // Every input is controlled by React, so submit the same state the user sees.
    // This prevents a field from being silently omitted if an HTML name is missed.
    const values = fields
    if (!values.role?.trim()) { setFormError('Enter a job role.'); return }
    if (!values.date || !values.start_time || !values.end_time) { setFormError('Choose a date, start time and end time.'); return }
    if (values.start_time >= values.end_time) { setFormError('End time must be after start time on the same date.'); return }
    if (!/^\d+(\.\d{1,2})?$/.test(values.payment || '')) { setFormError('Enter a valid LKR amount with at most two decimal places.'); return }
    if (!values.required_skill_id) { setFormError('Choose a required skill.'); return }
    const payload = {
      role: values.role.trim(), description: values.description?.trim() || null, date: values.date, start_time: toApiTime(values.start_time), end_time: toApiTime(values.end_time),
      duration_days: Number(values.duration_days), required_workers: Number(values.required_workers), payment: decimalString(values.payment), required_skill_id: Number(values.required_skill_id),
    }
    setBusy(true)
    try {
      const result = editing ? await api.updateShift(shiftId, payload) : await api.createShift(payload)
      setSaved(result)
      setShift(result)
      if (!editing) window.dispatchEvent(new Event('shiftly:shifts-changed'))
    } catch (caught) { setFormError(caught.message) }
    finally { setBusy(false) }
  }

  return <div className="screen narrow-screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">Business</span><h1 id={isModal ? 'shift-modal-title' : undefined}>{editing ? 'Edit shift' : 'Create shift'}</h1><p>Use the job role and skill workers need for this shift.</p></div></header>
    <DataState loading={loading} error={error} onRetry={retry} empty={skills.length === 0} emptyMessage="No skills are available in the catalogue. A shift needs a required skill before it can be saved.">
      {editing && ['CANCELLED', 'COMPLETED'].includes(shift?.status) ? <StatusMessage type="error">This shift can no longer be edited.</StatusMessage> : <section className="panel">
        {saved && <StatusMessage type="success">Shift {editing ? 'updated' : 'created'} successfully. <button type="button" className="text-button" onClick={() => onNavigate(`/business/shifts/${saved.id}`)}>View shift</button></StatusMessage>}
        {(!saved || editing) && <form className="form shift-form" onSubmit={submit}>
          <Field id="shift-role" name="role" label="Job role" placeholder="e.g. Cashier" value={fields.role} onChange={(event) => change('role', event.target.value)} required />
          <label className="field shift-description-field" htmlFor="shift-description">Shift details <textarea id="shift-description" name="description" rows="5" maxLength="1000" placeholder="Describe the work, responsibilities, dress code or anything the worker should know." value={fields.description} onChange={(event) => change('description', event.target.value)} /><span className="field-hint">Optional · {fields.description.length}/1000 characters</span></label>
          <Field id="shift-date" name="date" label="Start date" type="date" value={fields.date} onChange={(event) => change('date', event.target.value)} required />
          <div className="field"><label htmlFor="shift-duration">Duration</label><select id="shift-duration" name="duration_days" value={fields.duration_days} onChange={(event) => change('duration_days', event.target.value)}>{Array.from({ length: 10 }, (_, index) => index + 1).map((days) => <option key={days} value={days}>{days} {days === 1 ? 'day' : 'consecutive days'}</option>)}</select><span className="field-hint">The accepted worker commits to the same hours on every selected day.</span></div>
          <Field id="shift-start" name="start_time" label="Start time" type="time" value={fields.start_time} onChange={(event) => change('start_time', event.target.value)} required />
          <Field id="shift-end" name="end_time" label="End time" type="time" value={fields.end_time} onChange={(event) => change('end_time', event.target.value)} required />
          <Field id="shift-workers" name="required_workers" label="Required workers" type="number" min="1" step="1" value={fields.required_workers} onChange={(event) => change('required_workers', event.target.value)} required />
          <Field id="shift-payment" name="payment" label="Payment per day (LKR)" type="number" min="0" step="0.01" value={fields.payment} onChange={(event) => change('payment', event.target.value)} hint={fields.payment ? `Total per worker: LKR ${(Number(fields.payment) * Number(fields.duration_days || 1)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''} required />
          <div className="field"><label htmlFor="shift-skill">Required skill</label><select id="shift-skill" name="required_skill_id" value={fields.required_skill_id} onChange={(event) => change('required_skill_id', event.target.value)} required><option value="">Select a skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></div>
          {formError && <StatusMessage type="error">{formError}</StatusMessage>}
          <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create shift'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => onNavigate('/business')}>Back to shifts</Button></div>
        </form>}
      </section>}
    </DataState>
  </div>
}
