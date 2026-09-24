import { Button } from './Button'
import { StatusMessage } from './StatusMessage'

export function DataState({ loading, error, empty, emptyMessage, onRetry, children }) {
  if (loading) return <p className="data-state" role="status">Loading…</p>
  if (error) return <div className="data-state"><StatusMessage type="error">{error}</StatusMessage><Button type="button" variant="secondary" onClick={onRetry}>Try again</Button></div>
  if (empty) return <p className="data-state">{emptyMessage}</p>
  return children
}
