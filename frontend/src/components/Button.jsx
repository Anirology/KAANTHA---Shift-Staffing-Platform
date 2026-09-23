export function Button({ children, variant = 'primary', ...props }) {
  return <button className={`button ${variant === 'secondary' ? 'button-secondary' : ''}`} {...props}>{children}</button>
}
