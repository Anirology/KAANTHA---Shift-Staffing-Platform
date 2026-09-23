import { useState } from 'react'
import { api } from '../services/api'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'

export function BusinessRegistration({ onNavigate }) {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!businessName.trim()) { setError('Enter your business name.'); return }
    if (password.length < 8) { setError('Password must be at least eight characters.'); return }
    setBusy(true)
    try {
      await api.registerBusiness({ business_name: businessName.trim(), email: email.trim(), password })
      setCreated(true)
      setPassword('')
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout eyebrow="For businesses" title="Build your shift team." description="Create a business account to prepare for managing temporary staffing with KAANTHA.">
      <section className="auth-card" aria-labelledby="business-title">
        <h2 id="business-title">Business registration</h2>
        <p>Enter your business details to get started.</p>
        {created ? (
          <><StatusMessage type="success">Your business account was created. Sign in to continue.</StatusMessage><Button type="button" onClick={() => onNavigate('/login')}>Go to login</Button></>
        ) : (
          <form className="form" onSubmit={submit}>
            <Field id="business-name" label="Business name" autoComplete="organization" placeholder="Your business name" value={businessName} onChange={(event) => setBusinessName(event.target.value)} required />
            <Field id="business-email" label="Email" type="email" autoComplete="email" placeholder="you@business.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Field id="business-password" label="Password" type="password" autoComplete="new-password" minLength={8} hint="Use at least eight characters." value={password} onChange={(event) => setPassword(event.target.value)} required />
            {error && <StatusMessage type="error">{error}</StatusMessage>}
            <Button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create business account'}</Button>
          </form>
        )}
        <div className="form-footer"><a href="#/login" onClick={() => onNavigate('/login')}>Already have an account? Log in</a><a href="#/register/worker" onClick={() => onNavigate('/register/worker')}>Register as a worker instead</a></div>
      </section>
    </AuthLayout>
  )
}
