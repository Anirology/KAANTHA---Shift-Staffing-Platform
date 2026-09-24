import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'

const blank = { date: '', start_time: '', end_time: '' }
const time = (value) => value?.slice(0, 5) || ''

export function WorkerProfile() {
  const [profile, setProfile] = useState(null)
  const [catalogue, setCatalogue] = useState([])
  const [name, setName] = useState('')
  const [skillId, setSkillId] = useState('')
  const [availability, setAvailability] = useState(blank)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    try {
      const [worker, skills] = await Promise.all([api.workerProfile(), api.skills()])
      setProfile(worker); setCatalogue(skills); setName(worker.name); setError(''); return true
    } catch (caught) { setError(caught.message); return false }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  async function action(work, success) {
    setBusy(true); setActionError(''); setMessage('')
    try { await work(); if (!await load()) { setActionError('Change saved, but the profile could not be refreshed. Try again.'); return false }; setMessage(success); return true }
    catch (caught) { setActionError(caught.message); return false }
    finally { setBusy(false) }
  }
  function saveAvailability(event) {
    event.preventDefault()
    if (availability.start_time >= availability.end_time) { setActionError('End time must be after start time.'); return }
    const fields = { ...availability, start_time: `${availability.start_time}:00`, end_time: `${availability.end_time}:00` }
    action(() => editingId ? api.updateAvailability(editingId, fields) : api.addAvailability(fields), 'Availability saved.')
      .then((saved) => { if (saved) { setAvailability(blank); setEditingId(null) } })
  }

  return <div className="screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">Worker</span><h1>My profile</h1><p>Keep your name, skills and dated availability up to date.</p></div></header>
    <DataState loading={loading} error={error} onRetry={() => { setLoading(true); load() }} empty={!profile} emptyMessage="Profile unavailable.">
      <>
        {actionError && <StatusMessage type="error">{actionError}</StatusMessage>}{message && <StatusMessage type="success">{message}</StatusMessage>}
        <section className="panel"><h2>Profile</h2><form className="inline-form" onSubmit={(event) => { event.preventDefault(); action(() => api.updateWorkerProfile({ name: name.trim() }), 'Profile saved.') }}><Field id="worker-name" label="Name" required value={name} onChange={(event) => setName(event.target.value)} /><Button type="submit" disabled={busy || !name.trim()}>Save name</Button></form></section>
        <section className="panel"><h2>Skills</h2><p>Choose skills from the shared catalogue.</p><div className="tag-list">{profile?.skills?.length ? profile.skills.map((skill) => <span className="skill-tag" key={skill.id}>{skill.name} <button type="button" disabled={busy} aria-label={`Remove ${skill.name}`} onClick={() => action(() => api.removeWorkerSkill(skill.id), 'Skill removed.')}>×</button></span>) : <p>No skills added yet.</p>}</div><div className="inline-form"><label className="field" htmlFor="profile-skill">Add a skill<select id="profile-skill" value={skillId} onChange={(event) => setSkillId(event.target.value)}><option value="">Select a skill</option>{catalogue.filter((skill) => !profile.skills.some((owned) => owned.id === skill.id)).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label><Button type="button" disabled={busy || !skillId} onClick={() => action(() => api.addWorkerSkill(Number(skillId)), 'Skill added.').then((saved) => { if (saved) setSkillId('') })}>Add skill</Button></div></section>
        <section className="panel"><h2>Dated availability</h2><p>Availability helps you plan; acceptance also checks confirmed overlaps.</p><div className="card-list availability-list">{profile?.availability?.length ? profile.availability.map((entry) => <div className="availability-row" key={entry.id}><span>{entry.date} · {time(entry.start_time)}–{time(entry.end_time)}</span><div className="shift-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => { setEditingId(entry.id); setAvailability({ date: entry.date, start_time: time(entry.start_time), end_time: time(entry.end_time) }); setActionError('') }}>Edit</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => action(() => api.removeAvailability(entry.id), 'Availability removed.')}>Remove</Button></div></div>) : <p>No availability added yet.</p>}</div><form className="availability-form" onSubmit={saveAvailability}><Field id="available-date" label="Date" type="date" required value={availability.date} onChange={(event) => setAvailability({ ...availability, date: event.target.value })} /><Field id="available-start" label="Start time" type="time" required value={availability.start_time} onChange={(event) => setAvailability({ ...availability, start_time: event.target.value })} /><Field id="available-end" label="End time" type="time" required value={availability.end_time} onChange={(event) => setAvailability({ ...availability, end_time: event.target.value })} /><Button type="submit" disabled={busy}>{editingId ? 'Save changes' : 'Add availability'}</Button>{editingId && <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setAvailability(blank) }}>Cancel edit</Button>}</form></section>
      </>
    </DataState>
  </div>
}
