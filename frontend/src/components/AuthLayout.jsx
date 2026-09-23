export function AuthLayout({ eyebrow, title, description, children }) {
  return (
    <div className="auth-grid">
      <section className="intro" aria-label="About KAANTHA">
        <div className="intro-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className="intro-decoration" aria-hidden="true"><span /> Flexible shifts. Clear connections.</div>
      </section>
      {children}
    </div>
  )
}
