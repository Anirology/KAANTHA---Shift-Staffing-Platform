// Show an applicant's work profile and rating history to the owning business.
import { useEffect, useRef } from 'react'
import { Button } from './Button'
import { DataState } from './DataState'

function formatTime(value) {
  return value ? value.slice(0, 5) : ''
}

export function ApplicantProfileModal({ profile, loading, error, onRetry, onClose }) {
  // Present loading, failure, and profile states within the same accessible modal shell.
  const dialog = useRef(null)
  useEffect(() => {
    // Lock page scrolling and support Escape while this overlay is open.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return <div className="shift-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="shift-modal applicant-profile-modal" role="dialog" aria-modal="true" aria-labelledby="applicant-profile-title" tabIndex={-1} ref={dialog}>
      <button className="shift-modal-close" type="button" aria-label="Close applicant profile" onClick={onClose}>×</button>
      <div className="applicant-profile-content">
        <DataState loading={loading} error={error} onRetry={onRetry} empty={!profile} emptyMessage="This applicant profile is unavailable.">
          {profile && <>
            <header className="applicant-profile-header">
              <span className="avatar applicant-profile-avatar" aria-hidden="true">{profile.name.trim().slice(0, 1).toUpperCase()}</span>
              <div><span className="intro-eyebrow">Applicant profile</span><h2 id="applicant-profile-title">{profile.name}</h2><p>Review skills, availability and previous business feedback before deciding.</p></div>
              <div className="applicant-rating-summary" aria-label={`${profile.average_rating ?? 'No'} average rating from ${profile.rating_count} ratings`}>
                <strong>{profile.average_rating == null ? 'New' : profile.average_rating.toFixed(1)}</strong>
                <span>{profile.average_rating == null ? 'No ratings yet' : `★ average · ${profile.rating_count} ${profile.rating_count === 1 ? 'rating' : 'ratings'}`}</span>
              </div>
            </header>

            <div className="applicant-profile-grid">
              <section className="applicant-profile-panel"><h3>Skills</h3>
                {profile.skills.length ? <div className="tag-list">{profile.skills.map((skill) => <span className="skill-tag" key={skill.id}>{skill.name}</span>)}</div> : <p className="muted-copy">No skills have been added.</p>}
              </section>
              <section className="applicant-profile-panel"><h3>Availability</h3>
                {profile.availability.length ? <div className="profile-availability-list">{profile.availability.map((item) => <p key={item.id}><strong>{new Date(`${item.date}T00:00:00`).toLocaleDateString()}</strong><span>{formatTime(item.start_time)} - {formatTime(item.end_time)}</span></p>)}</div> : <p className="muted-copy">No availability has been added.</p>}
              </section>
            </div>

            <section className="applicant-profile-panel applicant-rating-history"><div className="section-heading-row"><h3>Previous ratings</h3><span className="timeline-count">{profile.rating_count}</span></div>
              {profile.ratings.length ? <div className="profile-rating-list">{profile.ratings.map((rating) => <article key={rating.id} className="applicant-rating-card">
                <div><strong>{rating.business_name}</strong><span>{rating.shift_role}</span></div><span className="rating-stars" aria-label={`${rating.score} out of 5 stars`}>{'★'.repeat(rating.score)}{'☆'.repeat(5 - rating.score)}</span>
                <p>{rating.review || 'No written review was provided.'}</p>
              </article>)}</div> : <p className="muted-copy">This worker has not received a rating yet. Use skills and availability to make your decision.</p>}
            </section>
            <div className="applicant-profile-footer"><Button type="button" variant="secondary" onClick={onClose}>Close profile</Button></div>
          </>}
        </DataState>
      </div>
    </section>
  </div>
}
