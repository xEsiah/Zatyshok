/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, JSX, ReactNode, useMemo, useEffect } from 'react'
import herData from '../locales/her.json'
import himData from '../locales/him.json'
import defaultData from '../locales/default.json'
import artData from '../locales/art.json'
import artDataFR from '../locales/artFR.json'
import musicData from '../locales/music.json'
import musicDataFR from '../locales/musicFR.json'

type Translation = typeof defaultData
export type Role = 'him' | 'her' | 'default' | 'art' | 'artFR' | 'music' | 'musicFR'

interface UserContextType {
  userRole: Role
  setUserRole: (role: Role) => void
  t: Translation
  profilePicture: string | null
  setProfilePicture: (url: string | null) => void
  userId: string | null
  setUserId: (id: string | null) => void
  currentUsername: string | null
  setCurrentUsername: (username: string | null) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const translations: Record<Role, Translation> = {
  him: himData as Translation,
  her: herData as Translation,
  default: defaultData as Translation,
  art: artData as Translation,
  artFR: artDataFR as Translation,
  music: musicData as Translation,
  musicFR: musicDataFR as Translation
}

export function UserProvider({ children }: { children: ReactNode }): JSX.Element {
  const [userRole, setUserRoleState] = useState<Role>('default')
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)

  useEffect(() => {
    window.api.getStoreValue('user_role').then((role) => {
      if (role) {
        setUserRoleState(role as Role)
        document.documentElement.setAttribute('data-theme', role as string)
      }
    })
  }, [])

  const setUserRole = (role: Role): void => {
    setUserRoleState(role)
    document.documentElement.setAttribute('data-theme', role)
    window.api.setStoreValue('user_role', role)
  }

  const t = useMemo(() => {
    const base = translations[userRole] || translations['default']
    if (!currentUsername) return base

    return {
      ...base,
      greetings: base.greetings.map((msg) => msg.replace('{username}', currentUsername))
    }
  }, [userRole, currentUsername])

  return (
    <UserContext.Provider
      value={{
        userRole,
        setUserRole,
        t,
        profilePicture,
        setProfilePicture,
        userId,
        setUserId,
        currentUsername,
        setCurrentUsername
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export const useUser = (): UserContextType => {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within a UserProvider')
  return context
}
