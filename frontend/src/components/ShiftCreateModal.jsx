// Host the shift creation screen in an accessible viewport-filling dialog.
import { useEffect, useRef } from 'react'

export function ShiftCreateModal({ children, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return <div className="shift-modal-backdrop"><section className="shift-modal" role="dialog" aria-modal="true" aria-labelledby="shift-modal-title" tabIndex={-1} ref={dialog}>
    <button className="shift-modal-close" type="button" aria-label="Close create shift dialog" onClick={onClose}>×</button>
    {children}
  </section></div>
}
