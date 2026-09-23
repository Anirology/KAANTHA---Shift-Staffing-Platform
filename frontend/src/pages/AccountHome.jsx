import { Button } from '../components/Button'

export function AccountHome({ account, onContinue, wrongRole = false }) {
  const roleLabel = account.role === 'WORKER' ? 'worker' : 'business'
  return (
    <section className="home">
      <div className="intro-eyebrow">{roleLabel} account</div>
      <h1>{wrongRole ? 'This page is for another account type.' : `Welcome to KAANTHA`}</h1>
      <div className="auth-card">
        <h2>{wrongRole ? 'Continue to your account' : 'You are signed in'}</h2>
        <p>{wrongRole ? `Your ${roleLabel} account has its own home page.` : `Your ${roleLabel} account is ready. Shift tools will appear here as the next stage is built.`}</p>
        {wrongRole && <Button type="button" onClick={onContinue}>Go to {roleLabel} home</Button>}
      </div>
    </section>
  )
}
