// Provide the shared layout for sign-in and registration screens.
export function AuthLayout({ eyebrow, title, description, children }) {
  // Keep registration and sign-in pages visually consistent while each form stays page-specific.
  return (
    <div className="auth-grid">
      <section className="intro" aria-label="About Shiftly">
        <div className="intro-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="intro-decoration" aria-hidden="true"><span /> Flexible shifts. Clear connections.</div>
      </section>
      {children}
    </div>
  )
}
