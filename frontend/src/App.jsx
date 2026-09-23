import { useEffect, useState } from 'react'
import { api, clearToken, getToken, saveToken } from './services/api'
import { Navigation } from './components/Navigation'
import { PageLayout } from './components/PageLayout'
import { StatusMessage } from './components/StatusMessage'
import { Login } from './pages/Login'
import { WorkerRegistration } from './pages/WorkerRegistration'
import { BusinessRegistration } from './pages/BusinessRegistration'
import { AccountHome } from './pages/AccountHome'
import './App.css'

const routes = ['/login', '/register/worker', '/register/business', '/worker', '/business']

function currentPath() {
  const path = window.location.hash.slice(1)
  return routes.includes(path) ? path : '/login'
}

export default function App() {
  const [path, setPath] = useState(currentPath)
  const [account, setAccount] = useState(null)
  const [checking, setChecking] = useState(Boolean(getToken()))
  const [sessionError, setSessionError] = useState('')

  useEffect(() => {
    const onHashChange = () => setPath(currentPath())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
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
      .catch((error) => {
        if (!active) return
        setSessionError(error.message)
        if (!getToken()) window.location.hash = '/login'
      })
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
    setSessionError('')
    navigate(user.role === 'WORKER' ? '/worker' : '/business')
  }

  function logout() {
    clearToken()
    setAccount(null)
    navigate('/login')
  }

  const homePath = account?.role === 'WORKER' ? '/worker' : '/business'
  const protectedPath = path === '/worker' || path === '/business'
  const authorized = account && path === homePath

  let content
  if (checking) {
    content = <div className="auth-card"><p role="status">Checking your session…</p></div>
  } else if (protectedPath && !authorized) {
    content = account
      ? <AccountHome account={account} onContinue={() => navigate(homePath)} wrongRole />
      : <div className="auth-card"><h1>Sign in required</h1><p>Please sign in to access your account.</p><a href="#/login">Go to login</a></div>
  } else if (authorized) {
    content = <AccountHome account={account} />
  } else if (path === '/register/worker') {
    content = <WorkerRegistration onNavigate={navigate} />
  } else if (path === '/register/business') {
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
