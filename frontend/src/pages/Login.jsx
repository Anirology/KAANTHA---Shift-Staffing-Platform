import { useState } from 'react'
import { api, clearToken } from '../services/api'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { StatusMessage } from '../components/StatusMessage'

export function Login({ onLogin, onNavigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least eight characters.')
      return
    }
    setBusy(true)
    try {
      const result = await api.login({ email: email.trim(), password })
      if (!result?.access_token || result.token_type?.toLowerCase() !== 'bearer' || !['WORKER', 'BUSINESS'].includes(result.role)) {
        throw new Error('The server returned an invalid sign-in response.')
      }
      const user = await api.me(result.access_token)
      if (user?.role !== result.role) throw new Error('The server returned inconsistent account details.')
      onLogin(result, user)
    } catch (caught) {
      clearToken()
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout eyebrow="Welcome to Shiftly" title="A better way to connect for shifts." description="Sign in to your worker or business account to continue.">
      <section className="auth-card" aria-labelledby="login-title">
        <h2 id="login-title">Welcome back</h2>
        <p>Enter your details to sign in.</p>
        <form className="form" onSubmit={submit}>
          <Field id="login-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Field id="login-password" label="Password" type="password" autoComplete="current-password" placeholder="Enter your password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <StatusMessage type="error">{error}</StatusMessage>}
          <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</Button>
        </form>
        <div className="form-footer">
          <span>New to Shiftly?</span>
          <a href="#/register/worker" onClick={() => onNavigate('/register/worker')}>Register as a worker</a>
          <a href="#/register/business" onClick={() => onNavigate('/register/business')}>Register a business</a>
        </div>
      </section>
    </AuthLayout>
  )
}
