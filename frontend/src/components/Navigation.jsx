export function Navigation({ account, activePath, onNavigate, onLogout }) {
  const home = account?.role === 'WORKER' ? '/worker' : '/business'
  const links = account
    ? [{ path: home, label: account.role === 'WORKER' ? 'Worker home' : 'Business home' }]
    : [
        { path: '/login', label: 'Log in' },
        { path: '/register/worker', label: 'Join as worker' },
        { path: '/register/business', label: 'Register business' },
      ]

  return (
    <header className="site-header">
      <nav className="nav-inner" aria-label="Main navigation">
        <a className="brand" href={account ? `#${home}` : '#/login'} onClick={() => onNavigate(account ? home : '/login')}>KAANTHA</a>
        <div className="nav-links">
          {links.map(({ path, label }) => (
            <a className="nav-link" href={`#${path}`} aria-current={activePath === path ? 'page' : undefined} onClick={() => onNavigate(path)} key={path}>{label}</a>
          ))}
          {account && <button className="nav-link nav-button" type="button" onClick={onLogout}>Log out</button>}
        </div>
      </nav>
    </header>
  )
}
