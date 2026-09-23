import { useEffect, useState } from 'react'
import { api, clearToken, getToken, saveToken } from './services/api'
import { Navigation } from './components/Navigation'
import { PageLayout } from './components/PageLayout'
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
import './App.css'

function currentPath() {
  return window.location.hash.slice(1) || '/login'
}

function routeFor(path) {
  if (['/login', '/register/worker', '/register/business'].includes(path)) return { path, role: null }
  if (path === '/worker' || path === '/worker/applications') return { path, role: 'WORKER' }
  if (path === '/business' || path === '/business/shifts/new') return { path, role: 'BUSINESS' }
  let match = path.match(/^\/(worker|business)\/shifts\/(\d+)$/)
  if (match) return { path: 'details', role: match[1].toUpperCase(), id: Number(match[2]) }
  match = path.match(/^\/business\/shifts\/(\d+)\/(edit|applicants)$/)
  if (match) return { path: match[2], role: 'BUSINESS', id: Number(match[1]) }
  return { path: '/login', role: null }
}

export default function App() {
  const [path, setPath] = useState(currentPath)
  const [account, setAccount] = useState(null)
  const [checking, setChecking] = useState(Boolean(getToken()))
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    const onHashChange = () => setPath(currentPath())
    const onExpired = () => {
      setAccount(null)
      setSessionError('Your session has expired. Please log in again.')
      window.location.hash = '/login'
    }
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('kaantha:session-expired', onExpired)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('kaantha:session-expired', onExpired)
    }
  }, [])

  useEffect(() => {
    if (!getToken()) return
    let active = true
    api.me()
      .then((user) => {
        if (!active) return
        if (!['WORKER', 'BUSINESS'].includes(user.role)) throw new Error('This account has an unsupported role.')
        setAccount(user)
      })
      .catch((error) => { if (active) setSessionError(error.message) })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  function navigate(destination) {
    window.location.hash = destination
    setPath(destination)
    setSessionError('')
  }

  function onLogin(result, user) {
    saveToken(result.access_token)
    setAccount(user)
    navigate(user.role === 'WORKER' ? '/worker' : '/business')
  }

  function logout() {
    clearToken()
    setAccount(null)
    navigate('/login')
  }

  const route = routeFor(path)
  let content
  if (checking) {
    content = <p role="status">Checking your session…</p>
  } else if (route.role && account?.role !== route.role) {
    content = <div className="auth-card"><h1>Account access</h1><p>{account ? 'This page belongs to a different account type.' : 'Please sign in to access this page.'}</p><a href={account ? `#/${account.role.toLowerCase()}` : '#/login'}>{account ? 'Go to your home' : 'Go to login'}</a></div>
  } else if (route.path === '/worker') {
    content = <BrowseShifts onNavigate={navigate} />
  } else if (route.path === '/worker/applications') {
    content = <MyApplications onNavigate={navigate} />
  } else if (route.path === '/business') {
    content = <ManageShifts onNavigate={navigate} />
  } else if (route.path === '/business/shifts/new' || route.path === 'edit') {
    content = <ShiftForm key={route.id || 'new'} shiftId={route.id} onNavigate={navigate} />
  } else if (route.path === 'details') {
    content = <ShiftDetails key={`${route.role}-${route.id}`} shiftId={route.id} accountRole={route.role} onNavigate={navigate} />
  } else if (route.path === 'applicants') {
    content = <Applicants key={route.id} shiftId={route.id} onNavigate={navigate} />
  } else if (route.path === '/register/worker') {
    content = <WorkerRegistration onNavigate={navigate} />
  } else if (route.path === '/register/business') {
    content = <BusinessRegistration onNavigate={navigate} />
  } else {
    content = <Login onLogin={onLogin} onNavigate={navigate} />
  }

  return (
    <PageLayout navigation={<Navigation account={account} activePath={path} onNavigate={navigate} onLogout={logout} />}>
      {sessionError && <StatusMessage type="error">{sessionError}</StatusMessage>}
      {content}
    </PageLayout>
  )
}
