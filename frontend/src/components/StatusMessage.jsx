export function StatusMessage({ type, children }) {
  return <div className={`status status-${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>
}
