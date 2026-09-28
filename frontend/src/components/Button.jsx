// Render a consistently styled, reusable action button.
export function Button({ children, variant = 'primary', ...props }) {
  return <button className={`button button-${variant}`} {...props}>{children}</button>
}
