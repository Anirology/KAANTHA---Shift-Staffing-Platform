// Choose the current hash route, restore the user session, and render the matching application screen.
import { useEffect, useState } from 'react'
import { api, clearToken, getBusinessId, getToken, saveBusinessId, saveToken } from './services/api'
import { Navigation } from './components/Navigation'
import { PageLayout } from './components/PageLayout'
import { ShiftCreateModal } from './components/ShiftCreateModal'
import { PageGuide } from './components/PageGuide'
import { StatusMessage } from './components/StatusMessage'
import { Login } from './pages/Login'
import { WorkerRegistration } from './pages/WorkerRegistration'
import { BusinessRegistration } from './pages/BusinessRegistration'
import { BrowseShifts } from './pages/BrowseShifts'
import { ManageShifts } from './pages/ManageShifts'
import { ShiftForm } from './pages/ShiftForm'
import { ShiftDetails } from './pages/ShiftDetails'
import { Applicants } from './pages/Applicants'
import { MyApplications } from './pages/MyApplications'
import { WorkerProfile } from './pages/WorkerProfile'
import { ImportShifts } from './pages/ImportShifts'
import { Reports } from './pages/Reports'
import { BusinessAccounts } from './pages/BusinessAccounts'
import { Landing } from './pages/Landing'
import './App.css'

function currentPath() {
  return window.location.hash.slice(1) || '/'
}

function routeFor(path) {
  // Resolve dynamic shift URLs before the fallback so detail actions receive their IDs.
  if (['/', '/login', '/register/worker', '/register/business'].includes(path)) return { path, role: null }
  if (path === '/worker/ratings') return { path: '/worker/profile', role: 'WORKER' }
  if (['/worker', '/worker/applications', '/worker/profile'].includes(path)) return { path, role: 'WORKER' }
  if (['/business', '/business/accounts', '/business/shifts/new', '/business/shifts/import', '/business/reports'].includes(path)) return { path, role: 'BUSINESS' }
  let match = path.match(/^\/(worker|business)\/shifts\/(\d+)$/)
  if (match) return { path: 'details', role: match[1].toUpperCase(), id: Number(match[2]) }
  match = path.match(/^\/business\/shifts\/(\d+)\/(edit|applicants)$/)
  if (match) return { path: match[2], role: 'BUSINESS', id: Number(match[1]) }
  return { path: '/', role: null }
}

function guideFor(route) {
  const guides = {
    '/worker': ['Browse shifts', 'Use the filters to narrow the list, then open a shift to check its requirements before applying.'],
    '/worker/applications': ['My applications', 'PENDING means the business is reviewing it. ACCEPTED shifts are confirmed work.'],
    '/worker/profile': ['Profile and ratings', 'Keep your skills and availability current, and review feedback from completed work.'],
    '/business': ['Manage shifts', 'Review staffing at a glance. Applicants is the fastest route to accepting workers and recording attendance.'],
    '/business/accounts': ['Businesses', 'Create and switch business profiles here. Every shift and report stays with the selected business.'],
    '/business/shifts/import': ['CSV import', 'Upload a shift CSV using the required columns, then review the result summary for any rejected rows.'],
    '/business/reports': ['Reports', 'Choose a report and optional date range, then download the same filtered information.'],
    details: ['Shift details', 'Check the full shift information here before applying or making business changes.'],
    edit: ['Edit shift', 'You can update active shifts, but accepted staffing and completed work remain protected.'],
    applicants: ['Applicants', 'Accepting runs skill, overlap and capacity checks. Rate a worker once you have marked them present.'],
  }
  return guides[route.path]
}

export default function App() {
  const [path, setPath] = useState(currentPath)
  const [account, setAccount] = useState(null)
  const [activeBusinessId, setActiveBusinessId] = useState(getBusinessId())
  const [checking, setChecking] = useState(Boolean(getToken()))
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    const onHashChange = () => setPath(currentPath())
    const onExpired = () => {
      setAccount(null)
      setActiveBusinessId(null)
      setSessionError('Your session has expired. Please log in again.')
      window.location.hash = '/login'
    }
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('shiftly:session-expired', onExpired)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('shiftly:session-expired', onExpired)
    }
  }, [])

  useEffect(() => {
    if (!getToken()) return
    // Ignore late session-check responses if the app unmounts before the request finishes.
    let active = true
    api.me()
      .then((user) => {
        if (!active) return
        if (!['WORKER', 'BUSINESS'].includes(user.role)) throw new Error('This account has an unsupported role.')
        setAccount(user)
        if (user.role === 'BUSINESS') {
          const chosen = user.businesses.find((business) => business.id === getBusinessId())?.id || user.businesses[0]?.id
          if (chosen) { saveBusinessId(chosen); setActiveBusinessId(chosen) }
        }
      })
      .catch((error) => {
        if (!active) return
        // A 401 clears the stored token and dispatches the expiry event in the API layer.
        // Do not replace that clean logout state with a second stale-token error.
        setSessionError(getToken() ? error.message : '')
      })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const refreshAccount = () => api.me().then((user) => setAccount(user)).catch(() => {})
    window.addEventListener('shiftly:account-updated', refreshAccount)
    return () => window.removeEventListener('shiftly:account-updated', refreshAccount)
  }, [])

  function navigate(destination) {
    window.location.hash = destination
    setPath(destination)
    setSessionError('')
  }

  function onLogin(result, user) {
    saveToken(result.access_token)
    setAccount(user)
    if (user.role === 'BUSINESS' && user.businesses.length) {
      saveBusinessId(user.businesses[0].id)
      setActiveBusinessId(user.businesses[0].id)
    }
    navigate(user.role === 'WORKER' ? '/worker' : '/business')
  }

  function selectBusiness(id) {
    if (!account?.businesses.some((business) => business.id === id)) return
    saveBusinessId(id)
    setActiveBusinessId(id)
    navigate('/business')
  }

  function addBusiness(business) {
    setAccount((current) => ({ ...current, businesses: [...current.businesses, business] }))
    saveBusinessId(business.id)
    setActiveBusinessId(business.id)
    navigate('/business')
  }

  function logout() {
    clearToken()
    setAccount(null)
    setActiveBusinessId(null)
    navigate('/login')
  }

  const route = routeFor(path)
  const createShiftModal = route.path === '/business/shifts/new' && account?.role === 'BUSINESS'
  const guide = account && !createShiftModal ? guideFor(route) : null
  let content
  if (checking) {
    content = <p role="status">Checking your session…</p>
  } else if (route.role && account?.role !== route.role) {
    content = <div className="auth-card"><h1>Account access</h1><p>{account ? 'This page belongs to a different account type.' : 'Please sign in to access this page.'}</p><a href={account ? `#/${account.role.toLowerCase()}` : '#/login'}>{account ? 'Go to your home' : 'Go to login'}</a></div>
  } else if (route.path === '/worker') {
    content = <BrowseShifts onNavigate={navigate} />
  } else if (route.path === '/worker/applications') {
    content = <MyApplications onNavigate={navigate} />
  } else if (route.path === '/worker/profile') {
    content = <WorkerProfile />
  } else if (route.path === '/business' || createShiftModal) {
    content = <ManageShifts key={activeBusinessId} businessName={account.businesses.find((business) => business.id === activeBusinessId)?.business_name} onNavigate={navigate} />
  } else if (route.path === '/business/accounts') {
    content = <BusinessAccounts businesses={account.businesses} activeBusinessId={activeBusinessId} onSelect={selectBusiness} onAdd={addBusiness} />
  } else if (route.path === '/business/shifts/import') {
    content = <ImportShifts key={activeBusinessId} />
  } else if (route.path === '/business/reports') {
    content = <Reports key={activeBusinessId} />
  } else if (route.path === 'edit') {
    content = <ShiftForm key={`${activeBusinessId}-${route.id || 'new'}`} shiftId={route.id} onNavigate={navigate} />
  } else if (route.path === 'details') {
    content = <ShiftDetails key={`${route.role}-${activeBusinessId}-${route.id}`} shiftId={route.id} accountRole={route.role} onNavigate={navigate} />
  } else if (route.path === 'applicants') {
    content = <Applicants key={`${activeBusinessId}-${route.id}`} shiftId={route.id} onNavigate={navigate} />
  } else if (route.path === '/') {
    content = <Landing onNavigate={navigate} />
  } else if (route.path === '/register/worker') {
    content = <WorkerRegistration onNavigate={navigate} />
  } else if (route.path === '/register/business') {
    content = <BusinessRegistration onNavigate={navigate} />
  } else {
    content = <Login onLogin={onLogin} onNavigate={navigate} />
  }

  return (
      <PageLayout dashboard={Boolean(account && route.role)} navigation={<Navigation account={account} activeBusinessId={activeBusinessId} onSelectBusiness={selectBusiness} activePath={path} onNavigate={navigate} onLogout={logout} />}>
      {sessionError && <StatusMessage type="error">{sessionError}</StatusMessage>}
      {content}
      {createShiftModal && <ShiftCreateModal onClose={() => navigate('/business')}><ShiftForm onNavigate={navigate} isModal onClose={() => navigate('/business')} /></ShiftCreateModal>}
      {guide && <PageGuide key={route.path} guideKey={route.path} title={guide[0]}>{guide[1]}</PageGuide>}
    </PageLayout>
  )
}
