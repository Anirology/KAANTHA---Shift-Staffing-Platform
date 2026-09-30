// Render a consistent status, success, or error message.
export function StatusMessage({ type, children }) {
  // Use live-region semantics so assistive technology announces status and error updates.
  return <div className={`status status-${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>
}
