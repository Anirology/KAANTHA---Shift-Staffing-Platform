import { useState } from 'react'
import { api } from '../services/api'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'

export function WorkerRegistration({ onNavigate }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!name.trim()) { setError('Enter your name.'); return }
    if (password.length < 8) { setError('Password must be at least eight characters.'); return }
    setBusy(true)
    try {
      await api.registerWorker({ name: name.trim(), email: email.trim(), password })
      setCreated(true)
      setPassword('')
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout eyebrow="For workers" title="Find your next opportunity." description="Create a worker account to get ready for temporary shifts with Shiftly.">
      <section className="auth-card" aria-labelledby="worker-title">
        <h2 id="worker-title">Worker registration</h2>
        <p>Tell us how to reach you.</p>
        {created ? (
          <><StatusMessage type="success">Your worker account was created. Sign in to continue.</StatusMessage><Button type="button" onClick={() => onNavigate('/login')}>Go to login</Button></>
        ) : (
          <form className="form" onSubmit={submit}>
            <Field id="worker-name" label="Full name" autoComplete="name" placeholder="Your full name" value={name} onChange={(event) => setName(event.target.value)} required />
            <Field id="worker-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Field id="worker-password" label="Password" type="password" autoComplete="new-password" minLength={8} hint="Use at least eight characters." value={password} onChange={(event) => setPassword(event.target.value)} required />
            {error && <StatusMessage type="error">{error}</StatusMessage>}
            <Button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create worker account'}</Button>
          </form>
        )}
        <div className="form-footer"><a href="#/login" onClick={() => onNavigate('/login')}>Already have an account? Log in</a><a href="#/register/business" onClick={() => onNavigate('/register/business')}>Register a business instead</a></div>
      </section>
    </AuthLayout>
  )
}
