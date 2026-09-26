import { useState } from 'react'

export function Navigation({ account, activeBusinessId, onSelectBusiness, activePath, onNavigate, onLogout }) {
  const [open, setOpen] = useState(false)
  const links = account?.role === 'WORKER'
    ? [{ path: '/worker', label: 'Browse shifts' }, { path: '/worker/applications', label: 'My applications' }, { path: '/worker/profile', label: 'My profile' }]
    : account?.role === 'BUSINESS'
      ? [{ path: '/business', label: 'Manage shifts' }, { path: '/business/shifts/new', label: 'Create shift' }, { path: '/business/shifts/import', label: 'CSV import' }, { path: '/business/reports', label: 'Reports' }, { path: '/business/accounts', label: 'Businesses' }]
      : [{ path: '/', label: 'Home' }, { path: '/login', label: 'Log in' }, { path: '/register/worker', label: 'Join as worker' }, { path: '/register/business', label: 'For businesses' }]
  const home = account?.role === 'WORKER' ? '/worker' : account?.role === 'BUSINESS' ? '/business' : '/'

  return (
    <header className="site-header">
      <nav className="nav-inner" aria-label="Main navigation">
        <a className="brand" href={`#${home}`} onClick={() => onNavigate(home)}><img src="/shiftly-logo.png" alt="" />Shiftly</a>
        <button className="nav-toggle" type="button" aria-expanded={open} aria-controls="main-links" onClick={() => setOpen((value) => !value)}><span aria-hidden="true">☰</span><span className="sr-only">Menu</span></button>
        {account?.role === 'BUSINESS' && <label className="business-switcher">Business
          <select aria-label="Active business" value={activeBusinessId || ''} onChange={(event) => onSelectBusiness(Number(event.target.value))}>
            {account.businesses.map((business) => <option key={business.id} value={business.id}>{business.business_name}</option>)}
          </select>
        </label>}
        <div className={`nav-links ${open ? 'nav-links-open' : ''}`} id="main-links">
          {links.map(({ path, label }) => <a className="nav-link" href={`#${path}`} aria-current={activePath === path ? 'page' : undefined} onClick={() => { setOpen(false); onNavigate(path) }} key={path}>{label}</a>)}
          {account && <button className="nav-link nav-button" type="button" onClick={onLogout}>Log out</button>}
        </div>
      </nav>
    </header>
  )
}
