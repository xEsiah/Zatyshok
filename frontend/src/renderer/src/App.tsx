import { JSX, useState, useEffect, useCallback } from 'react'
import { BentoView } from './components/BentoView'
import { WriteView } from './components/WriteView'
import { Login } from './components/Login'
import { ModalProvider } from './components/ModalContext'
import { UserProvider, useUser, Role } from './components/UserContext'
import { ProfileManager } from './components/ProfileManager'
import { ProfileView } from './components/ProfileView'
import { Budgetizer } from './components/Budgetizer'

function AppContent(): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [currentView, setCurrentView] = useState<'bento' | 'write' | 'profile' | 'budget'>('bento')

  const [greeting, setGreeting] = useState<string>('')
  const { setUserRole, setUserId, setProfilePicture, setCurrentUsername, t } = useUser()

  const loadSession = useCallback(async (): Promise<void> => {
    try {
      const token = await window.api.getStoreValue('user_token')
      const storedUserId = await window.api.getStoreValue('user_id')
      const storedRole = await window.api.getStoreValue('user_role')

      if (storedRole) {
        setUserRole(storedRole as Role)
        document.documentElement.setAttribute('data-theme', storedRole as string)
      }

      if (token && storedUserId) {
        const userId = Number(storedUserId)

        setUserId(String(userId))
        setCurrentUsername((await window.api.getStoreValue('username')) as string)

        const storedPdp = await window.api.getStoreValue('profile_picture')
        setProfilePicture(typeof storedPdp === 'string' ? storedPdp : null)

        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Erreur session:', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }, [setUserRole, setUserId, setProfilePicture, setCurrentUsername])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    if (isAuthenticated && t && Array.isArray(t.greetings) && t.greetings.length > 0) {
      const randomMsg = t.greetings[Math.floor(Math.random() * t.greetings.length)]
      setGreeting(randomMsg)
    }
  }, [t, isAuthenticated])

  const handleLogout = (): void => {
    window.api.deleteStoreValue('user_token')
    window.api.deleteStoreValue('username')
    window.api.deleteStoreValue('user_id')
    window.api.deleteStoreValue('profile_picture')

    setIsAuthenticated(false)
    setUserId(null)
    setProfilePicture(null)
    setCurrentUsername(null)
  }

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="soft-ui login-card" style={{ textAlign: 'center' }}>
          <h2>{t?.app?.loading || 'Chargement...'}</h2>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !t) {
    return <Login onLoginSuccess={loadSession} />
  }

  return (
    <>
      <div className="title-bar">
        <h1>{t.login?.title || 'Zatyshok'}</h1>
        <button onClick={handleLogout} className="logout-button no-drag" title="Disconnect">
          {t.app?.logout || 'Logout'}
        </button>
        <div className="layout-controls no-drag">
          <button onClick={() => window.api.minimizeWindow()} title="Reduce" className="layout-btn">
            &minus;
          </button>
          <button onClick={() => window.api.closeWindow()} title="Quit" className="layout-btn">
            &times;
          </button>
        </div>
      </div>

      <header className="header-area">
        <h2>{greeting}</h2>
        <div className="navigation-bar">
          <div className="nav-left" style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setCurrentView('bento')}
              className={`nav-button ${currentView === 'bento' ? 'active' : ''}`}
            >
              {t.app.btnDashboard}
            </button>
            <button
              onClick={() => setCurrentView('write')}
              className={`nav-button ${currentView === 'write' ? 'active' : ''}`}
            >
              {t.app.btnWrite}
            </button>
            <button
              onClick={() => setCurrentView('budget')}
              className={`nav-button ${currentView === 'budget' ? 'active' : ''}`}
            >
              {t.app.btnBudget}
            </button>
          </div>
          <div className="nav-right">
            <ProfileManager onOpen={() => setCurrentView('profile')} />
          </div>
        </div>
      </header>

      <main className="view-wrapper">
        {currentView === 'profile' && <ProfileView onBack={() => setCurrentView('bento')} />}
        {currentView === 'write' && <WriteView onBack={() => setCurrentView('bento')} />}
        {currentView === 'budget' && <Budgetizer />}
        {currentView === 'bento' && <BentoView />}
      </main>
    </>
  )
}

export default function App(): JSX.Element {
  return (
    <UserProvider>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </UserProvider>
  )
}
