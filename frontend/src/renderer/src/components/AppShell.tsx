import { useEffect, useState, JSX } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { useUser } from './UserContext'

const PAGE_KEY = 'last_page_'

interface AppShellProps {
  onLogout: () => void
}

export function AppShell({ onLogout }: AppShellProps): JSX.Element {
  const [ready, setReady] = useState(false)
  const { userId } = useUser()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const key = `${PAGE_KEY}${userId || 'guest'}`

  useEffect(() => {
    const restore = async (): Promise<void> => {
      const stored = await window.api.getStoreValue(key)
      const target = typeof stored === 'string' && stored.startsWith('/') ? stored : '/dashboard'
      navigate(target, { replace: true })
      setReady(true)
    }
    restore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    if (ready && pathname) {
      window.api.setStoreValue(key, pathname)
    }
  }, [ready, pathname, key])

  return (
    <>
      <Header onLogout={onLogout} />
      <main className="flex-1 flex flex-col items-center overflow-hidden min-h-0 w-full pt-[2vh] max-[1350px]:overflow-y-auto">
        <Outlet />
      </main>
    </>
  )
}
