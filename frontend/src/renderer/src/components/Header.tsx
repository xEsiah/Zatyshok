import { useEffect, useState, JSX } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { NotificationCenter } from './NotificationCenter'
import { ProfileManager } from './ProfileManager'
import { useUser } from './UserContext'

interface HeaderProps {
  onLogout: () => void
}

export function Header({ onLogout }: HeaderProps): JSX.Element {
  const [greeting, setGreeting] = useState('')
  const { t } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!t || !Array.isArray(t.greetings) || t.greetings.length === 0) return undefined
    const timeout = setTimeout(() => {
      setGreeting(t.greetings[Math.floor(Math.random() * t.greetings.length)])
    }, 0)
    return () => clearTimeout(timeout)
  }, [t])

  return (
    <>
      <div className="h-[4vh] w-full [-webkit-app-region:drag] flex items-center text-[0.8rem] text-lilas-doux">
        <h1 className="m-0 pl-[1%] text-[2rem] font-quicksand font-bold">
          {t.login?.title || 'Zatyshok'}
        </h1>
        <button
          onClick={onLogout}
          className="[-webkit-app-region:no-drag] bg-transparent border border-lilas-doux text-lilas-doux rounded-lg text-[0.7rem] px-3 py-1 ml-3.75 mr-auto transition-all duration-200 hover:bg-lilas hover:text-white hover:border-lilas"
          title="Disconnect"
        >
          {t.app?.logout || 'Logout'}
        </button>
        <div className="ml-auto flex gap-3 pr-[1%] items-center [-webkit-app-region:no-drag]">
          <button
            onClick={() => window.api.minimizeWindow()}
            title="Reduce"
            className="border-0 rounded-lg flex items-center justify-center text-[0.9rem] text-lilas cursor-pointer bg-card shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-px hover:bg-shadow-d active:scale-95 active:shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] size-8"
          >
            &minus;
          </button>
          <button
            onClick={() => window.api.closeWindow()}
            title="Quit"
            className="border-0 rounded-lg flex items-center justify-center text-[0.9rem] text-lilas cursor-pointer bg-card shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-px hover:bg-shadow-d active:scale-95 active:shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] size-8"
          >
            &times;
          </button>
        </div>
      </div>

      <header className="text-left w-[90%] text-[1.4rem] flex flex-col justify-around items-start min-h-[15%]">
        <h2 className="m-0">{greeting}</h2>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2.5">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `border-0 rounded-[25px] text-white text-base px-6 py-2 cursor-pointer [-webkit-app-region:no-drag] text-left self-start no-underline inline-flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-lilas shadow-[inset_2px_2px_8px_rgba(0,0,0,0.2)] scale-105 font-bold border border-white/20'
                    : 'bg-rose hover:brightness-115 hover:-translate-y-0.5'
                }`
              }
            >
              {t.app.btnDashboard}
            </NavLink>
            <NavLink
              to="/write"
              className={({ isActive }) =>
                `border-0 rounded-[25px] text-white text-base px-6 py-2 cursor-pointer [-webkit-app-region:no-drag] text-left self-start no-underline inline-flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-lilas shadow-[inset_2px_2px_8px_rgba(0,0,0,0.2)] scale-105 font-bold border border-white/20'
                    : 'bg-rose hover:brightness-115 hover:-translate-y-0.5'
                }`
              }
            >
              {t.app.btnWrite}
            </NavLink>
            <NavLink
              to="/budget"
              className={({ isActive }) =>
                `border-0 rounded-[25px] text-white text-base px-6 py-2 cursor-pointer [-webkit-app-region:no-drag] text-left self-start no-underline inline-flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-lilas shadow-[inset_2px_2px_8px_rgba(0,0,0,0.2)] scale-105 font-bold border border-white/20'
                    : 'bg-rose hover:brightness-115 hover:-translate-y-0.5'
                }`
              }
            >
              {t.app.btnBudget}
            </NavLink>
          </div>
          <div className="flex items-center gap-2.5">
            <NotificationCenter />
            <ProfileManager onOpen={() => navigate('/profile')} />
          </div>
        </div>
      </header>
    </>
  )
}
