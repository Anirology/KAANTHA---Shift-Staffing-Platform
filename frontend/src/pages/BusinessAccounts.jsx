// Switch between business profiles and create additional business workspaces.
import { useState } from 'react'
import { api } from '../services/api'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'
import { ProfilePhotoPicker } from '../components/ProfilePhotoPicker'
import { photoUrl } from '../services/api'

export function BusinessAccounts({ businesses, activeBusinessId, onSelect, onAdd }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [photoBusyId, setPhotoBusyId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    const businessName = name.trim()
    if (!businessName) { setError('Enter a business name.'); return }
    setBusy(true)
    setError('')
    try { onAdd(await api.createBusiness(businessName)); setName('') }
    catch (caught) { setError(caught.message) }
    finally { setBusy(false) }
  }

  async function updatePhoto(id, work) {
    setPhotoBusyId(id); setError(''); setActionMessage('')
    try { const result = await work(); if (result) setActionMessage('Business photo updated.'); else setActionMessage('Business photo removed.'); window.dispatchEvent(new Event('shiftly:account-updated')) }
    catch (caught) { setError(caught.message) }
    finally { setPhotoBusyId(null) }
  }

  const activeBusiness = businesses.find((business) => business.id === activeBusinessId)

  return <div className="screen business-accounts-screen">
    <header className="business-accounts-hero"><div><span className="intro-eyebrow">Business workspace</span><h1>Choose your business</h1><p>Use one secure login to manage separate teams, shifts and reports.</p></div><div className="active-business-summary"><span>Currently managing</span><strong>{activeBusiness?.business_name || 'Select a business'}</strong><small>{businesses.length} {businesses.length === 1 ? 'business profile' : 'business profiles'}</small></div></header>
    {actionMessage && <StatusMessage type="success">{actionMessage}</StatusMessage>}
    {error && <StatusMessage type="error">{error}</StatusMessage>}
    <section className="business-profile-panel" aria-labelledby="profiles-title"><div className="section-heading-row"><div><span className="intro-eyebrow">Your workspaces</span><h2 id="profiles-title">Business profiles</h2></div><p>Switching changes the shifts, applicants, imports and reports you see.</p></div><div className="business-profile-grid">{businesses.map((business) => { const active = business.id === activeBusinessId; return <article className={`business-profile-card ${active ? 'business-profile-card-active' : ''}`} key={business.id}><div className="business-avatar" aria-hidden="true">{business.photo_url ? <img src={photoUrl(business.photo_url)} alt="" /> : business.business_name.trim().slice(0, 2).toUpperCase()}</div><div className="business-profile-copy"><strong>{business.business_name}</strong><span>Workspace #{business.id}</span></div><ProfilePhotoPicker name={business.business_name} photoUrl={business.photo_url} busy={photoBusyId === business.id} onUpload={(file) => updatePhoto(business.id, () => api.uploadBusinessPhoto(business.id, file))} onRemove={() => updatePhoto(business.id, () => api.removeBusinessPhoto(business.id).then(() => null))} />{active ? <span className="active-workspace-badge"><i /> Active workspace</span> : <Button type="button" variant="secondary" onClick={() => onSelect(business.id)}>Switch workspace</Button>}</article> })}</div></section>
    <section className="add-business-panel"><div><span className="intro-eyebrow">Grow with Shiftly</span><h2>Add another business</h2><p>Create a separate workspace. Its shifts, applicants and reports will stay private from your other businesses.</p></div><form className="add-business-form" onSubmit={submit}><Field id="new-business-name" label="Business name" placeholder="e.g. Cicada Events" maxLength={150} value={name} onChange={(event) => setName(event.target.value)} required /><Button type="submit" disabled={busy || !name.trim()}>{busy ? 'Creating workspace…' : 'Add business'}</Button></form></section>
  </div>
}
