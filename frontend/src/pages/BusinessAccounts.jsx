import { useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'

export function BusinessAccounts({ businesses, activeBusinessId, onSelect, onAdd }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    const businessName = name.trim()
    if (!businessName) { setError('Enter a business name.'); return }
    setBusy(true)
    setError('')
    try { onAdd(await api.createBusiness(businessName)) }
    catch (caught) { setError(caught.message) }
    finally { setBusy(false) }
  }

  return <div className="screen narrow-screen">
    <header className="screen-heading"><div><span className="intro-eyebrow">Business</span><h1>Your businesses</h1><p>One login can manage separate businesses. Choose which business you are working on.</p></div></header>
    <section className="panel"><h2>Business profiles</h2><div className="business-list">{businesses.map((business) => <div className="business-row" key={business.id}><div><strong>{business.business_name}</strong><span>Business ID {business.id}</span></div>{business.id === activeBusinessId ? <span className="chip">Active</span> : <Button type="button" variant="secondary" onClick={() => onSelect(business.id)}>Switch</Button>}</div>)}</div></section>
    <section className="panel"><h2>Add another business</h2><p>Shifts, applicants, imports, and reports stay with the selected business.</p><form className="inline-form" onSubmit={submit}><Field id="new-business-name" label="Business name" maxLength={150} value={name} onChange={(event) => setName(event.target.value)} required /><Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add business'}</Button></form>{error && <StatusMessage type="error">{error}</StatusMessage>}</section>
  </div>
}
