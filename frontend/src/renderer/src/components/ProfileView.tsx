/* eslint-disable @typescript-eslint/no-unused-vars */
import { useUser, Role } from './UserContext'
import { useRef, JSX, useState, useEffect, useCallback } from 'react'
import { API_URL } from '../services/apiClient'
import { api } from '../services'
import { useModal } from './ModalContext'
import { Card } from './layout/Card'

interface UserFullProfile {
  username: string
  email: string
  profilePicture: string | null
  stats: { moods: number; goals: number; events: number; notes: number }
}

const themeOptions: { value: Role; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'music', label: 'Music' },
  { value: 'musicFR', label: 'Music FR' },
  { value: 'art', label: 'Art' },
  { value: 'artFR', label: 'Art FR' },
  { value: 'him', label: 'Batcave' },
  { value: 'her', label: 'Cutie' }
]

export function ProfileView({ onBack }: { onBack: () => void }): JSX.Element {
  const { profilePicture, setProfilePicture, t, userRole, setUserRole } = useUser()
  const { showModal } = useModal()
  const [profileData, setProfileData] = useState<UserFullProfile | null>(null)

  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editForm, setEditForm] = useState({ username: '', email: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const [micPermission, setMicPermission] = useState<'ask' | 'allow' | 'deny'>('ask')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.api.getStoreValue('micPermission').then((value) => {
      const stored = typeof value === 'string' ? value : 'ask'
      if (stored === 'allow' || stored === 'deny') setMicPermission(stored)
    })
  }, [])

  const applyMicPermission = (value: 'ask' | 'allow' | 'deny'): void => {
    window.api.setStoreValue('micPermission', value)
    setMicPermission(value)
  }

  const availableThemes = themeOptions.filter((theme) => {
    if (theme.value === 'her' && userRole !== 'her') {
      return false
    }
    return true
  })
  const fetchFullProfile = useCallback(async (): Promise<void> => {
    try {
      const data = (await api.getMe()) as UserFullProfile
      setProfileData(data)
      setEditForm({ username: data.username, email: data.email })
    } catch (_err) {
      console.error('Failed to fetch profile')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFullProfile()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchFullProfile])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (e.target.files?.[0]) {
      const formData = new FormData()
      formData.append('image', e.target.files[0])
      try {
        const data = await api.uploadAvatar(formData)
        setProfilePicture(data.imageUrl)
        window.api.setStoreValue('profile_picture', data.imageUrl)
        fetchFullProfile()
      } catch (_err) {
        showModal({
          title: t.login.modalErrorTitle,
          message: t.profile.errorAvatar,
          type: 'alert'
        })
      }
    }
  }

  const saveInfo = async (): Promise<void> => {
    const cleanUsername = editForm.username.trim()
    const cleanEmail = editForm.email.trim()
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

    if (!emailRegex.test(cleanEmail)) {
      showModal({
        title: t.login.modalOops,
        message: t.profile.errorEmail,
        type: 'alert'
      })
      return
    }

    if (cleanUsername.length < 3) {
      showModal({
        title: t.login.modalOops,
        message: t.profile.errorUsername,
        type: 'alert'
      })
      return
    }

    setIsSaving(true)
    try {
      await api.updateUserInfo(cleanUsername, cleanEmail)
      setIsEditing(false)
      await fetchFullProfile()
      window.api.setStoreValue('username', cleanUsername)
    } catch (err: unknown) {
      let errorMessage = err instanceof Error ? err.message : t.profile.errorUpdate
      if (errorMessage.includes('Username already taken')) {
        errorMessage = t.login.errorUsernameTaken
      } else if (errorMessage.includes('Email already taken')) {
        errorMessage = t.login.errorEmailTaken
      }
      showModal({
        title: t.login.modalOops,
        message: errorMessage,
        type: 'alert'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const isPasswordValid = (pass: string): boolean =>
    pass.length >= 16 && /[A-Z]/.test(pass) && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass)

  const [passForm, setPassForm] = useState({ old: '', newP: '', confirm: '' })
  const handleUpdatePassword = async (): Promise<void> => {
    if (passForm.newP !== passForm.confirm) {
      showModal({
        title: t.login.modalOops,
        message: t.profile.passwordMismatch,
        type: 'alert'
      })
      return
    }

    if (passForm.old === passForm.newP) {
      showModal({
        title: t.login.modalOops,
        message: t.profile.errorPasswordSame,
        type: 'alert'
      })
      return
    }

    if (!isPasswordValid(passForm.newP)) {
      showModal({
        title: t.login.modalOops,
        message: t.profile.errorPasswordStrength,
        type: 'alert'
      })
      return
    }

    try {
      await api.updatePassword(passForm.old, passForm.newP)
      showModal({ title: t.login.savedTitle, message: t.profile.passwordSuccess, type: 'alert' })
      setPassForm({ old: '', newP: '', confirm: '' })
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : t.profile.errorUpdate
      if (msg.includes('Ancien mot de passe')) msg = t.profile.errorPasswordOld
      if (msg.includes("différent de l'ancien")) msg = t.profile.errorPasswordSame
      if (msg.includes('16 caractères')) msg = t.profile.errorPasswordStrength

      showModal({ title: t.login.modalOops, message: msg, type: 'alert' })
    }
  }

  const currentImg = profilePicture
    ? `${API_URL}/${profilePicture}`
    : `${API_URL}/uploads/profiles/default.png`

  return (
    <Card className="w-full flex-1 min-h-0 flex flex-col p-[3vh_4vw] box-border text-[var(--color-lilas-doux)]">
      <div className="flex items-center justify-between border-b border-[var(--shadow-dark)] pb-[12px]">
        <h2 className="m-0 text-[0.85rem] uppercase tracking-[2px] text-[var(--color-lilas-vif)]">
          {t.profile.title}
        </h2>
        <button
          onClick={onBack}
          className="bg-[var(--color-lilas-vif)] text-white border-0 px-[25px] py-[12px] rounded-[15px] font-bold cursor-pointer transition-all duration-200 enabled:hover:brightness-[1.15] enabled:hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.profile.btnBack}
        </button>
      </div>

      <div className="flex items-center gap-[30px] mt-[2.5vh]">
        <div
          title="Edit profile picture"
          className="relative h-[110px] w-[110px] cursor-pointer overflow-hidden rounded-full border-4 border-[var(--color-lilas-vif)] shadow-[4px_4px_12px_var(--shadow-dark)]"
          onClick={() => fileInputRef.current?.click()}
        >
          <img src={currentImg} alt="Profile" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[1.5rem] text-white opacity-0 transition-opacity duration-300 hover:opacity-100">
            <span>🖊️</span>
          </div>
        </div>

        <div className="flex-1">
          {!isEditing ? (
            <>
              <div className="flex items-center gap-[15px]">
                <h1 className="m-0 text-[2.2rem] text-[var(--color-profond)]">
                  {profileData?.username || t.app.loading}
                </h1>
                <button
                  title="Edit username, password & email"
                  className="border-none bg-transparent text-[1.2rem] text-[var(--color-lilas-doux)] opacity-60 transition-opacity duration-200 hover:opacity-100"
                  onClick={() => setIsEditing(true)}
                >
                  🖊️
                </button>
              </div>
              <p>{profileData?.email}</p>
            </>
          ) : (
            <div className="flex w-full max-w-[300px] flex-col gap-[10px]">
              <input
                className="h-[4vh] px-2 py-[4px] border-0 rounded-md bg-[var(--field-bg)] text-[var(--color-profond)] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none text-[0.85rem] box-border"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                disabled={isSaving}
                placeholder={t.login.usernamePlaceholder}
              />
              <input
                className="h-[4vh] px-2 py-[4px] border-0 rounded-md bg-[var(--field-bg)] text-[var(--color-profond)] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none text-[0.85rem] box-border"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                disabled={isSaving}
                placeholder="Email"
              />
              <div className="flex w-auto gap-[10px]">
                <button
                  className="h-[35px] w-[35px] flex items-center justify-center cursor-pointer rounded-[8px] border-none bg-[var(--color-lilas-vif)] text-white shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[1px] hover:shadow-[6px_6px_12px_var(--shadow-dark)]"
                  onClick={saveInfo}
                  disabled={isSaving}
                >
                  {isSaving ? '...' : '✔️'}
                </button>
                <button
                  className="h-[35px] w-[35px] flex items-center justify-center cursor-pointer rounded-[8px] border-none bg-[var(--color-rose-poudre)] text-white shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-[1px] hover:shadow-[6px_6px_12px_var(--shadow-dark)]"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  ✖️
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-[140px] flex-col items-end gap-[8px]">
          <label className="text-[0.8rem] font-bold">Theme</label>
          <div className="relative w-full">
            <div
              className={`h-[4vh] px-2 py-[4px] border-0 rounded-md bg-[var(--field-bg)] text-[var(--color-profond)] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none text-[0.85rem] box-border flex min-w-[130px] items-center justify-between font-semibold after:inline-block after:h-[16px] after:w-[16px] after:bg-center after:bg-no-repeat after:content-[''] after:bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22%238d7d77%22%3E%3Cpath%20d=%22M7%2010l5%205%205-5z%22/%3E%3C/svg%3E')] ${
                userRole === 'her' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              }`}
              onClick={() => {
                if (userRole !== 'her') setIsThemeOpen(!isThemeOpen)
              }}
            >
              {themeOptions.find((o) => o.value === userRole)?.label || 'Default'}
            </div>
            {isThemeOpen && userRole !== 'her' && (
              <div className="absolute right-0 top-full z-[100] mt-[5px] flex min-w-[140px] flex-col gap-1 rounded-[8px] border border-[var(--color-lilas-doux)] bg-[var(--card-bg)] p-2 shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)]">
                {availableThemes.map((theme) => (
                  <div
                    key={theme.value}
                    className="cursor-pointer rounded-[8px] p-[10px_12px] text-right text-[0.9rem] font-medium text-[var(--color-profond)] transition-all duration-200 hover:bg-[var(--color-lilas-vif)] hover:text-white"
                    onClick={() => {
                      setUserRole(theme.value)
                      setIsThemeOpen(false)
                      api.updateUserRole(theme.value).catch(console.error)
                    }}
                  >
                    {theme.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[10px] mt-[2.5vh]">
        {[
          { label: t.profile.statsMoods, value: profileData?.stats.moods },
          { label: t.profile.statsGoals, value: profileData?.stats.goals },
          { label: t.profile.statsEvents, value: profileData?.stats.events },
          { label: t.profile.statsNotes, value: profileData?.stats.notes }
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-[var(--card-bg)] rounded-[var(--radius-bento)] shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-[var(--card-border)] transition-all duration-300 p-[15px] text-center"
          >
            <span className="block text-2xl font-bold text-[var(--color-lilas-vif)]">
              {stat.value ?? 0}
            </span>
            <span className="text-[0.75rem] opacity-70">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-[2.5vw] mt-[2.5vh] flex-1 min-h-0">
        <Card className="p-[25px] flex flex-col justify-center text-center">
          <h3 className="mb-[15px] mt-0 border-b border-[var(--shadow-dark)] pb-[10px] text-[0.85rem] uppercase tracking-[1.5px] text-[var(--color-lilas-vif)] opacity-90">
            {t.profile.changePasswordTitle}
          </h3>
          <div className="flex flex-col items-stretch gap-[12px]">
            <input
              type="password"
              className="h-[4vh] px-2 py-[4px] border-0 rounded-md bg-[var(--field-bg)] text-[var(--color-profond)] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none text-[0.85rem] box-border w-full"
              placeholder={t.profile.oldPassword}
              value={passForm.old}
              onChange={(e) => setPassForm({ ...passForm, old: e.target.value })}
            />
            <input
              type="password"
              className="h-[4vh] px-2 py-[4px] border-0 rounded-md bg-[var(--field-bg)] text-[var(--color-profond)] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none text-[0.85rem] box-border w-full"
              placeholder={t.login.passwordPlaceholder}
              value={passForm.newP}
              onChange={(e) => setPassForm({ ...passForm, newP: e.target.value })}
            />
            <input
              type="password"
              className="h-[4vh] px-2 py-[4px] border-0 rounded-md bg-[var(--field-bg)] text-[var(--color-profond)] shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-none text-[0.85rem] box-border w-full"
              placeholder="Confirm"
              value={passForm.confirm}
              onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
            />
            <button
              className="border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--color-lilas-vif)] text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-[0.96] hover:brightness-[1.15] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)] w-full"
              onClick={handleUpdatePassword}
            >
              OK
            </button>
          </div>
        </Card>

        <Card className="p-[25px] flex flex-col justify-center text-center">
          <h3 className="mb-[15px] mt-0 border-b border-[var(--shadow-dark)] pb-[10px] text-[0.85rem] uppercase tracking-[1.5px] text-[var(--color-lilas-vif)] opacity-90">
            {t.profile.micPermissionTitle}
          </h3>
          <div className="flex flex-col items-stretch gap-[12px]">
            <button
              className={`border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 w-full ${
                micPermission === 'ask'
                  ? 'bg-[var(--color-lilas-vif)] text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-[0.96] hover:brightness-[1.15] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                  : 'hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
              }`}
              onClick={() => applyMicPermission('ask')}
            >
              {t.profile.micAsk}
            </button>
            <button
              className={`border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 w-full ${
                micPermission === 'allow'
                  ? 'bg-[var(--color-lilas-vif)] text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-[0.96] hover:brightness-[1.15] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                  : 'hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
              }`}
              onClick={() => applyMicPermission('allow')}
            >
              {t.profile.micAllow}
            </button>
            <button
              className={`border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 w-full ${
                micPermission === 'deny'
                  ? 'bg-[var(--color-lilas-vif)] text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-[0.96] hover:brightness-[1.15] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                  : 'hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
              }`}
              onClick={() => applyMicPermission('deny')}
            >
              {t.profile.micDeny}
            </button>
          </div>
          <p className="mt-[12px] text-[0.8rem] text-[var(--color-profond)] opacity-70">
            {t.profile.micPermissionHint}
          </p>
        </Card>
      </div>

      <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*" />
    </Card>
  )
}
