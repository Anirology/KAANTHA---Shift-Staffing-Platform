import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { DataState } from '../components/DataState'

export function MyRatings() {
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { setRatings(await api.myRatings()); setError('') }
    catch (caught) { setError(caught.message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer) }, [load])
  const average = ratings.length ? (ratings.reduce((sum, rating) => sum + rating.score, 0) / ratings.length).toFixed(1) : null
  return <div className="screen"><header className="screen-heading"><div><span className="intro-eyebrow">Worker</span><h1>My ratings</h1><p>Feedback from businesses after your completed shifts.</p></div>{average && <div className="rating-average"><strong>{average}</strong><span>Average · {ratings.length} {ratings.length === 1 ? 'rating' : 'ratings'}</span></div>}</header><DataState loading={loading} error={error} onRetry={() => { setLoading(true); load() }} empty={ratings.length === 0} emptyMessage="You have no ratings yet. Ratings appear after completed shifts."><div className="card-list">{ratings.map((rating) => <article className="panel rating-card" key={rating.id}><div><span className="rating-stars" aria-label={`${rating.score} out of 5 stars`}>{'★'.repeat(rating.score)}{'☆'.repeat(5 - rating.score)}</span><h2>{rating.shift_role}</h2><p>{rating.business_name} · Shift #{rating.shift_id}</p></div><p>{rating.review || 'No written review.'}</p></article>)}</div></DataState></div>
}
