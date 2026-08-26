/* eslint-disable @typescript-eslint/no-unused-vars */
import { useUser, Role } from './UserContext'
import { useRef, JSX, useState, useEffect, useCallback } from 'react'
import { API_URL } from '../services/apiClient'
import { api } from '../services'
import { useModal } from './ModalContext'
import '../assets/ProfileView.css'

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

  const fileInputRef = useRef<HTMLInputElement>(null)

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
    <div className="profile-container">
      <div className="soft-ui profile-grid">
        <div className="profile-header-title">
          <h2>{t.profile.title}</h2>
        </div>

        <div className="profile-hero">
          <div
            title="Edit profile picture"
            className="profile-avatar-wrapper"
            onClick={() => fileInputRef.current?.click()}
          >
            <img src={currentImg} alt="Profile" className="profile-main-img" />
            <div className="edit-overlay-modern">
              <span>🖊️</span>
            </div>
          </div>

          <div className="profile-info" style={{ flex: 1 }}>
            {!isEditing ? (
              <>
                <div className="info-row">
                  <h1>{profileData?.username || t.app.loading}</h1>
                  <button
                    title="Edit username, password & email"
                    className="edit-info-btn"
                    onClick={() => setIsEditing(true)}
                  >
                    🖊️
                  </button>
                </div>
                <p>{profileData?.email}</p>
              </>
            ) : (
              <div className="edit-info-form">
                <input
                  className="soft-input-mini"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  disabled={isSaving}
                  placeholder={t.login.usernamePlaceholder}
                />
                <input
                  className="soft-input-mini"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  disabled={isSaving}
                  placeholder="Email"
                />
                <div className="edit-confirm-actions">
                  <button className="soft-btn-mini save" onClick={saveInfo} disabled={isSaving}>
                    {isSaving ? '...' : '✔️'}
                  </button>
                  <button
                    className="soft-btn-mini cancel"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    ✖️
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="profile-theme-selector">
            <label>Theme</label>
            <div className="profile-custom-select">
              <div
                className="soft-input-mini profile-select-btn"
                onClick={() => {
                  if (userRole !== 'her') setIsThemeOpen(!isThemeOpen)
                }}
                style={{
                  cursor: userRole === 'her' ? 'not-allowed' : 'pointer',
                  opacity: userRole === 'her' ? 0.7 : 1
                }}
              >
                {themeOptions.find((o) => o.value === userRole)?.label || 'Default'}
              </div>
              {isThemeOpen && userRole !== 'her' && (
                <div className="profile-select-menu soft-ui">
                  {availableThemes.map((theme) => (
                    <div
                      key={theme.value}
                      className="profile-select-option"
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

        <div className="stats-container">
          {[
            { label: t.profile.statsMoods, value: profileData?.stats.moods },
            { label: t.profile.statsGoals, value: profileData?.stats.goals },
            { label: t.profile.statsEvents, value: profileData?.stats.events },
            { label: t.profile.statsNotes, value: profileData?.stats.notes }
          ].map((stat, idx) => (
            <div key={idx} className="stat-card">
              <span className="stat-value">{stat.value ?? 0}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="soft-ui password-change-section">
          <h3>{t.profile.changePasswordTitle}</h3>
          <div className="password-inputs-row">
            <input
              type="password"
              className="soft-input-mini"
              placeholder={t.profile.oldPassword}
              value={passForm.old}
              onChange={(e) => setPassForm({ ...passForm, old: e.target.value })}
            />
            <input
              type="password"
              className="soft-input-mini"
              placeholder={t.login.passwordPlaceholder}
              value={passForm.newP}
              onChange={(e) => setPassForm({ ...passForm, newP: e.target.value })}
            />
            <input
              type="password"
              className="soft-input-mini"
              placeholder="Confirm"
              value={passForm.confirm}
              onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
            />
            <button className="soft-btn active" onClick={handleUpdatePassword}>
              OK
            </button>
          </div>
        </div>

        <div className="profile-actions">
          <button onClick={onBack} className="soft-btn-primary">
            {t.profile.btnBack}
          </button>
        </div>

        <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*" />
      </div>
    </div>
  )
}
