// Render a labeled form field with consistent accessible markup.
export function Field({ id, label, hint, ...props }) {
  // Matching label and input IDs keep controls usable with mouse, keyboard, and assistive technology.
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      {hint && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
    </div>
  )
}
