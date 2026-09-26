import { Button } from '../components/Button'

export function Landing({ onNavigate }) {
  return (
    <div className="landing">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div>
          <span className="intro-eyebrow">Temporary work, made clear</span>
          <h1 id="landing-title">The right people.<br />The right shift.</h1>
          <p>Shiftly helps businesses fill temporary shifts and gives workers a simple way to find suitable work.</p>
          <div className="landing-actions">
            <Button type="button" onClick={() => onNavigate('/register/worker')}>Find shifts</Button>
            <Button type="button" variant="secondary" onClick={() => onNavigate('/register/business')}>Post a shift</Button>
          </div>
          <p className="landing-signin">Already have an account? <a href="#/login" onClick={() => onNavigate('/login')}>Log in</a></p>
        </div>
        <div className="landing-mark" aria-hidden="true">
          <img src="/shiftly-logo.png" alt="" />
        </div>
      </section>

      <section className="landing-steps" aria-labelledby="how-title">
        <div className="landing-section-heading">
          <span className="intro-eyebrow">How it works</span>
          <h2 id="how-title">Simple from start to shift.</h2>
        </div>
        <ol>
          <li><span>01</span><strong>Create</strong><p>Businesses publish a shift with the skill, time and payment.</p></li>
          <li><span>02</span><strong>Apply</strong><p>Workers browse open work and send an application.</p></li>
          <li><span>03</span><strong>Confirm</strong><p>Shiftly checks skill, schedule and capacity before acceptance.</p></li>
        </ol>
      </section>

      <section className="landing-audiences" aria-label="Choose how to use Shiftly">
        <article><span>For workers</span><h2>Work that fits.</h2><p>Keep your skills and availability together, then track every application.</p><a href="#/register/worker" onClick={() => onNavigate('/register/worker')}>Create worker account →</a></article>
        <article><span>For businesses</span><h2>Staff with confidence.</h2><p>Publish shifts, review applicants and manage attendance from one place.</p><a href="#/register/business" onClick={() => onNavigate('/register/business')}>Create business account →</a></article>
      </section>
    </div>
  )
}
