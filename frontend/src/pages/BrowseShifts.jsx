import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { DataState } from '../components/DataState'
import { Field } from '../components/Field'
import { ShiftCard } from '../components/ShiftCard'
import { StatusMessage } from '../components/StatusMessage'

export function BrowseShifts({ onNavigate }) {
  const [filters, setFilters] = useState({ role: '', skill_id: '', date: '', min_payment: '' })
  const [query, setQuery] = useState({ status: 'OPEN' })
  const [shifts, setShifts] = useState([])
  const [skills, setSkills] = useState([])
  const [profile, setProfile] = useState(null)
  const [selectedSkill, setSelectedSkill] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)

  const load = useCallback(async () => {
    try {
      const [shiftList, skillList, worker] = await Promise.all([api.shifts(query), api.skills(), api.workerProfile()])
      setShifts(shiftList)
      setSkills(skillList)
      setProfile(worker)
    } catch (caught) { setError(caught.message) }
    finally { setLoading(false) }
  }, [query])

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  function retry() { setLoading(true); setError(''); load() }

  async function addSkill() {
    if (!selectedSkill) return
    setAddingSkill(true)
    setActionError('')
    setFeedback('')
    try {
      await api.addWorkerSkill(Number(selectedSkill))
      const worker = await api.workerProfile()
      setProfile(worker)
      setSelectedSkill('')
      setFeedback('Skill added to your worker profile.')
    } catch (caught) { setActionError(caught.message) }
    finally { setAddingSkill(false) }
  }

  return (
    <div className="screen">
      <header className="screen-heading"><div><span className="intro-eyebrow">Worker</span><h1>Browse shifts</h1><p>Find open shifts that fit your schedule and skills.</p></div></header>
      <form className="filter-panel" onSubmit={(event) => { event.preventDefault(); setLoading(true); setError(''); setQuery({ status: 'OPEN', ...filters }) }}>
        <Field id="filter-role" label="Job role" placeholder="e.g. Cashier" value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })} />
        <div className="field"><label htmlFor="filter-skill">Required skill</label><select id="filter-skill" value={filters.skill_id} onChange={(event) => setFilters({ ...filters, skill_id: event.target.value })}><option value="">Any skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></div>
        <Field id="filter-date" label="Date" type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} />
        <Field id="filter-payment" label="Minimum payment (LKR)" type="number" min="0" step="0.01" value={filters.min_payment} onChange={(event) => setFilters({ ...filters, min_payment: event.target.value })} />
        <Button type="submit">Find shifts</Button>
      </form>
      <DataState loading={loading} error={error} onRetry={retry} empty={shifts.length === 0} emptyMessage="No open shifts match these filters.">
        <div className="card-list">{shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} actions={<Button type="button" onClick={() => onNavigate(`/worker/shifts/${shift.id}`)}>View details</Button>} />)}</div>
      </DataState>
      {!loading && !error && <section className="panel skill-panel" aria-labelledby="skill-heading">
        <div><h2 id="skill-heading">My skills</h2><p>Businesses confirm skills before accepting an application.</p><p>{profile?.skills?.length ? profile.skills.map((skill) => skill.name).join(', ') : 'No skills added yet.'}</p></div>
        <div className="skill-controls"><label className="field" htmlFor="add-skill">Add a skill<select id="add-skill" value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}><option value="">Select a skill</option>{skills.filter((skill) => !profile?.skills?.some((owned) => owned.id === skill.id)).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label><Button type="button" disabled={!selectedSkill || addingSkill} onClick={addSkill}>{addingSkill ? 'Adding…' : 'Add skill'}</Button></div>
        {actionError && <StatusMessage type="error">{actionError}</StatusMessage>}{feedback && <StatusMessage type="success">{feedback}</StatusMessage>}
      </section>}
    </div>
  )
}
