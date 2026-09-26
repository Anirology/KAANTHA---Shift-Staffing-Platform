import { useState } from 'react'

export function PageGuide({ guideKey, title, children }) {
  const storageKey = `shiftly_guide_${guideKey}`
  const [open, setOpen] = useState(() => window.localStorage.getItem(storageKey) !== 'closed')

  function close() {
    window.localStorage.setItem(storageKey, 'closed')
    setOpen(false)
  }

  function reopen() {
    window.localStorage.removeItem(storageKey)
    setOpen(true)
  }

  if (!open) {
    return <button className="guide-reopen" type="button" aria-label={`Open help for ${title}`} onClick={reopen}>?</button>
  }

  return (
    <aside className="page-guide" aria-label={`${title} help`}>
      <button className="guide-close" type="button" aria-label="Close help" onClick={close}>×</button>
      <span>Quick tip</span>
      <strong>{title}</strong>
      <p>{children}</p>
    </aside>
  )
}
