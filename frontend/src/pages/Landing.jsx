// Render the public Shiftly landing page and its registration entry points.
import { Button } from '../components/Button'

const steps = [
  { number: '01', icon: '＋', title: 'Create', copy: 'Businesses publish a shift with the skill, time and payment.' },
  { number: '02', icon: '◎', title: 'Apply', copy: 'Workers browse open work and send an application.' },
  { number: '03', icon: '✓', title: 'Confirm', copy: 'Shiftly checks skill, schedule and capacity before acceptance.' },
]

export function Landing({ onNavigate }) {
  return (
    <div className="landing">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="intro-eyebrow landing-eyebrow">Temporary work, made clear</span>
          <h1 id="landing-title">The right<br />people<span>.</span><br />The right shift<span>.</span></h1>
          <p>Shiftly helps businesses fill temporary shifts and gives workers a simple way to find suitable work.</p>
          <div className="landing-actions">
            <Button type="button" onClick={() => onNavigate('/register/worker')}>Find shifts <span aria-hidden="true">→</span></Button>
            <Button type="button" variant="secondary" onClick={() => onNavigate('/register/business')}>Post a shift</Button>
          </div>
          <p className="landing-signin">Already have an account? <a href="#/login" onClick={() => onNavigate('/login')}>Log in</a></p>
          <div className="landing-trust" aria-label="Shiftly community">
            <div className="landing-avatars" aria-hidden="true">
              <img src="/landing-business-worker.png" alt="" />
              <img src="/landing-worker.png" alt="" />
              <img src="/landing-business-worker.png" alt="" />
            </div>
            <strong>2,000+</strong>
            <span>Workers and businesses<br />already using Shiftly</span>
          </div>
        </div>

        <div className="landing-hero-art" aria-label="A temporary worker using Shiftly">
          <div className="landing-art-blob" aria-hidden="true" />
          <img className="landing-hero-person" src="/landing-business-worker.png" alt="Temporary worker holding a tablet" />
          <img className="landing-float landing-float-shift" src="/landing-shift-card.png" alt="New Barista shift posted today" />
          <img className="landing-float landing-float-applicants" src="/landing-applicants.png" alt="Twelve people applied for a shift" />
          <img className="landing-float landing-float-confirmed" src="/landing-confirmed.png" alt="Shift confirmed" />
        </div>
      </section>

      <section className="landing-steps" id="how-it-works" aria-labelledby="how-title">
        <div className="landing-section-heading">
          <span className="intro-eyebrow">How it works</span>
          <h2 id="how-title">Simple from<br />start to shift<span>.</span></h2>
        </div>
        <ol>
          {steps.map((step) => (
            <li key={step.number}>
              <div className="landing-step-icon" aria-hidden="true">{step.icon}</div>
              <div><span>{step.number}</span><strong>{step.title}</strong></div>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-audiences" aria-label="Choose how to use Shiftly">
        <article className="landing-audience-card landing-worker-card">
          <div className="landing-audience-copy">
            <span>For workers</span>
            <h2>Work that fits<br />your life<span>.</span></h2>
            <p>Find flexible shifts, build experience and keep track of your applications — all in one place.</p>
            <a className="landing-card-action" href="#/register/worker" onClick={() => onNavigate('/register/worker')}>Create worker account <span aria-hidden="true">→</span></a>
          </div>
          <img className="landing-worker-person" src="/landing-worker.png" alt="Worker finding shifts on a phone" />
          <img className="landing-worker-jobs" src="/landing-job-cards.png" alt="Kitchen, retail and event shift examples" />
        </article>

        <article className="landing-audience-card landing-business-card">
          <div className="landing-audience-copy">
            <span>For businesses</span>
            <h2>Staff with<br />confidence<span>.</span></h2>
            <p>Publish shifts, review applicants, manage attendance and keep everything organized.</p>
            <a className="landing-card-action" href="#/register/business" onClick={() => onNavigate('/register/business')}>Create business account <span aria-hidden="true">→</span></a>
          </div>
          <img className="landing-dashboard-image" src="/landing-dashboard.png" alt="Shiftly business shift management dashboard" />
        </article>
      </section>
    </div>
  )
}
