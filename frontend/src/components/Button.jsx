// Render a consistently styled, reusable action button.
export function Button({ children, variant = 'primary', ...props }) {
  // Apply shared button styling while passing each page's native button properties through.
  return <button className={`button button-${variant}`} {...props}>{children}</button>
}
