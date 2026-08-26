import '../assets/Login.css'
import { JSX, useState } from 'react'
import { api } from '../services'
import { useModal } from './ModalContext'
import { Role, useUser } from './UserContext'

interface LoginProps {
  onLoginSuccess: () => void
}

export function Login({ onLoginSuccess }: LoginProps): JSX.Element {
  const [isRegister, setIsRegister] = useState(false)
  const [isForgot, setIsForgot] = useState(false)
  const [resetStep, setResetStep] = useState(1) // 1: email, 2: code+pass
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const { showModal } = useModal()
  const { t, setProfilePicture, setUserId, setUserRole } = useUser()

  const isPasswordValid = (pass: string): boolean =>
    pass.length >= 16 && /[A-Z]/.test(pass) && /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isForgot) {
        if (resetStep === 1) {
          const res = await api.forgotPassword(email)
          if (res.error) throw new Error(res.error)
          showModal({ title: t.login.savedTitle, message: res.message || '', type: 'alert' })
          setResetStep(2)
        } else {
          if (password !== confirmPassword) throw new Error(t.login.badPassordConfirmation)
          if (!isPasswordValid(password)) throw new Error(t.profile.errorPasswordStrength)
          const res = await api.resetPassword({ email, token: resetToken, newPassword: password })
          if (res.error) throw new Error(res.error)
          showModal({ title: t.login.savedTitle, message: res.message || '', type: 'alert' })
          setIsForgot(false)
          setResetStep(1)
        }
        return
      }

      if (isRegister) {
        if (password !== confirmPassword) {
          showModal({
            title: t.login.modalOops,
            message: t.login.badPassordConfirmation,
            type: 'alert'
          })
          setLoading(false)
          return
        }
        if (!isPasswordValid(password)) throw new Error(t.profile.errorPasswordStrength)
        const res = await api.register(username, email, password)
        if (res.error) {
          let msg = res.error
          if (res.error.includes('Username')) msg = t.login.errorUsernameTaken
          else if (res.error.includes('Email')) msg = t.login.errorEmailTaken

          showModal({ title: t.login.modalOops, message: msg, type: 'alert' })
        } else {
          showModal({
            title: t.login.modalWaitTitle,
            message: res.message || t.login.modalWaitMsg,
            type: 'alert'
          })
          setIsRegister(false)
          setPassword('')
        }
      } else {
        const data = await api.login(username, password)

        if (data.token && data.userId) {
          window.api.setStoreValue('user_token', data.token)
          window.api.setStoreValue('username', data.username || '')
          window.api.setStoreValue('user_id', String(data.userId))
          window.api.setStoreValue('user_role', data.role || 'default')

          window.api.setStoreValue('profile_picture', data.profilePicture || '')

          setUserId(String(data.userId))
          setProfilePicture(data.profilePicture || null)
          setUserRole((data.role as Role) || 'default')

          onLoginSuccess()
        } else {
          throw new Error(t.login.modalErrorInvalidData)
        }
      }
    } catch (err: unknown) {
      let errorMsg = err instanceof Error ? err.message : t.login.modalErrorUnexpected

      if (errorMsg.includes('Invalid credentials')) errorMsg = t.login.errorInvalidCredentials
      if (errorMsg.includes('pending approval')) errorMsg = t.login.errorPending

      showModal({
        title: t.login.modalErrorTitle,
        message: errorMsg,
        type: 'alert'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="soft-ui login-card">
        <div className="login-header">
          <h1>{t.login.title}</h1>
          <p>{isRegister ? t.login.requestAccess : t.login.welcomeHome}</p>
        </div>
        {isForgot && (
          <div className="login-header">
            <h2 style={{ fontSize: '1.2rem', color: 'var(--color-lilas-vif)' }}>
              {t.login.resetTitle}
            </h2>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {!isForgot && (
            <div className="input-group">
              <small>{isRegister ? t.login.username : 'Nom d’utilisateur ou Email'}</small>
              <input
                className="soft-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegister ? t.login.usernamePlaceholder : 'Pseudo ou email...'}
                required
              />
            </div>
          )}

          {(isRegister || isForgot) && (
            <div className="input-group">
              <small>Email</small>
              <input
                className="soft-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>
          )}

          {isForgot && resetStep === 2 && (
            <div className="input-group">
              <small>{t.login.resetCode}</small>
              <input
                className="soft-input"
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="ABC-123"
                required
              />
            </div>
          )}

          {(!isForgot || resetStep === 2) && (
            <div className="input-group">
              <small>{isForgot ? t.login.newPassword : t.login.password}</small>
              <input
                className="soft-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.login.passwordPlaceholder}
                required
              />
            </div>
          )}

          {(isRegister || (isForgot && resetStep === 2)) && (
            <div className="input-group">
              <small>{isForgot ? t.login.confirmNewPassword : 'Confirmer le mot de passe'}</small>
              <input
                className="soft-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          )}

          <button type="submit" className="soft-btn active login-submit" disabled={loading}>
            {loading
              ? t.login.processing
              : isForgot
                ? resetStep === 1
                  ? t.login.sendCode
                  : t.login.resetBtn
                : isRegister
                  ? t.login.join
                  : t.login.unlock}
          </button>
        </form>

        {!isRegister && !isForgot && (
          <p
            className="toggle-mode"
            onClick={() => setIsForgot(true)}
            style={{ cursor: 'pointer', marginTop: '15px', fontSize: '0.8rem', opacity: 0.7 }}
          >
            {t.login.forgotPassword}
          </p>
        )}

        <p
          className="toggle-mode"
          onClick={() => {
            setIsRegister(!isRegister)
            setIsForgot(false)
            setResetStep(1)
          }}
          style={{
            cursor: 'pointer',
            marginTop: '20px',
            fontSize: '0.9rem',
            color: 'var(--color-lilas-doux)'
          }}
        >
          {isRegister ? t.login.toggleToLogin : t.login.toggleToRegister}
        </p>
      </div>
    </div>
  )
}
