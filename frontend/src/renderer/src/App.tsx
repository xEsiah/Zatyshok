import { JSX, useState, useEffect, useCallback } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Login } from './components/Login'
import { ModalProvider } from './components/ModalContext'
import { UserProvider, useUser, Role } from './components/UserContext'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { WritePage } from './pages/WritePage'
import { BudgetPage } from './pages/BudgetPage'
import { ProfilePage } from './pages/ProfilePage'

function AppContent(): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

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
      <div className="w-full h-screen flex justify-center items-center bg-[var(--bg-color)]">
        <div className="bg-[var(--card-bg)] rounded-[var(--radius-bento)] shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-[var(--card-border)] transition-all duration-300 w-[90vw] max-w-[400px] py-[5vh] px-[5vw] text-center">
          <h2>{t?.app?.loading || 'Chargement...'}</h2>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !t) {
    return <Login onLoginSuccess={loadSession} />
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell onLogout={handleLogout} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="write" element={<WritePage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </HashRouter>
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
