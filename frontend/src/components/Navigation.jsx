// Render public navigation or the authenticated Shiftly workspace sidebar.
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRightFromBracket, faBriefcase, faBuilding, faChartColumn, faFileCirclePlus, faFileLines, faMagnifyingGlass, faStar, faUser } from '@fortawesome/free-solid-svg-icons'
import { photoUrl } from '../services/api'

const workerLinks = [
  { path: '/worker', label: 'Browse shifts', icon: faMagnifyingGlass },
  { path: '/worker/applications', label: 'My applications', icon: faFileLines },
  { path: '/worker/profile', label: 'My profile', icon: faUser },
  { path: '/worker/ratings', label: 'Ratings', icon: faStar },
]
const businessLinks = [
  { path: '/business', label: 'Manage shifts', icon: faBriefcase },
  { path: '/business/shifts/new', label: 'Create shift', icon: faFileCirclePlus },
  { path: '/business/shifts/import', label: 'Import shifts', icon: faFileLines },
  { path: '/business/reports', label: 'Reports', icon: faChartColumn },
  { path: '/business/accounts', label: 'Businesses', icon: faBuilding },
]

export function Navigation({ account, activeBusinessId, onSelectBusiness, activePath, onNavigate, onLogout }) {
  const isPublic = !account
  if (isPublic) return (
    <header className="site-header public-site-header">
      <nav className="nav-inner" aria-label="Main navigation">
        <a className="brand" href="#/" onClick={() => onNavigate('/')}><img src="/shiftly-logo.png" alt="" />Shiftly</a>
        <a className="nav-link" href="#/register/worker" onClick={() => onNavigate('/register/worker')}>Join as worker</a>
        <a className="nav-link" href="#/register/business" onClick={() => onNavigate('/register/business')}>For businesses</a>
        <a className="nav-link nav-login" href="#/login" onClick={() => onNavigate('/login')}>Log in</a>
      </nav>
    </header>
  )

  const worker = account.role === 'WORKER'
  const links = worker ? workerLinks : businessLinks
  const activeBusiness = account.businesses?.find((business) => business.id === activeBusinessId)
  const displayName = worker ? account.worker_name : activeBusiness?.business_name
  const photo = photoUrl(worker ? account.worker_photo_url : activeBusiness?.photo_url)

  return (
    <aside className="app-sidebar" aria-label="Shiftly workspace navigation">
      <a className="sidebar-brand" href={`#${worker ? '/worker' : '/business'}`} onClick={() => onNavigate(worker ? '/worker' : '/business')}><img src="/shiftly-logo.png" alt="" /> <span>Shiftly</span></a>
      {!worker && account.businesses?.length > 1 && <label className="sidebar-workspace"><span>WORKSPACE</span><select aria-label="Active business" value={activeBusinessId || ''} onChange={(event) => onSelectBusiness(Number(event.target.value))}>{account.businesses.map((business) => <option key={business.id} value={business.id}>{business.business_name}</option>)}</select></label>}
      <nav className="sidebar-nav" aria-label="Workspace pages">
        {links.map(({ path, label, icon }) => <a className="sidebar-link" href={`#${path}`} aria-current={activePath === path ? 'page' : undefined} onClick={() => onNavigate(path)} key={path}><FontAwesomeIcon icon={icon} aria-hidden="true" /><span>{label}</span></a>)}
      </nav>
      <div className="sidebar-account">
        <button className="sidebar-profile" type="button" onClick={() => onNavigate(worker ? '/worker/profile' : '/business/accounts')}>
          <span className="avatar sidebar-avatar">{photo ? <img src={photo} alt="" /> : <span>{(displayName || account.email || '?').trim().slice(0, 1).toUpperCase()}</span>}</span>
          <span className="sidebar-profile-copy"><strong>{displayName || account.email}</strong><small>{worker ? 'Worker account' : 'Business account'}</small></span>
        </button>
        <button className="sidebar-logout" type="button" onClick={onLogout}><FontAwesomeIcon icon={faArrowRightFromBracket} aria-hidden="true" /><span>Log out</span></button>
      </div>
    </aside>
  )
}
