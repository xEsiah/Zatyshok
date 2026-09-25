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
  const [resetStep, setResetStep] = useState(1)
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
    <div className="w-full h-screen flex justify-center items-center bg-bg">
      <div className="bg-card rounded-card shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-(--card-border) transition-all duration-300 w-[90vw] max-w-130 aspect-square p-[5vh_5vw] flex flex-col justify-evenly text-center font-quicksand">
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="m-0 text-[2rem] text-profund">{t.login.title}</h1>
          <p className="text-lilas-doux font-medium mb-7.5">
            {isRegister ? t.login.requestAccess : t.login.welcomeHome}
          </p>
          {isForgot && <h2 className="text-[1.2rem] text-lilas mb-5">{t.login.resetTitle}</h2>}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full flex-1 justify-center">
          {!isForgot && (
            <div className="text-left w-full">
              <small>{isRegister ? t.login.username : 'Nom d\u00b4utilisateur ou Email'}</small>
              <input
                className="w-full bg-(--field-bg) border-0 px-3.75 py-3 rounded-xl text-profund shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegister ? t.login.usernamePlaceholder : 'Pseudo ou email...'}
                required
              />
            </div>
          )}

          {(isRegister || isForgot) && (
            <div className="text-left w-full">
              <small>Email</small>
              <input
                className="w-full bg-(--field-bg) border-0 px-3.75 py-3 rounded-xl text-profund shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>
          )}

          {isForgot && resetStep === 2 && (
            <div className="text-left w-full">
              <small>{t.login.resetCode}</small>
              <input
                className="w-full bg-(--field-bg) border-0 px-3.75 py-3 rounded-xl text-profund shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border"
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="ABC-123"
                required
              />
            </div>
          )}

          {(!isForgot || resetStep === 2) && (
            <div className="text-left w-full">
              <small>{isForgot ? t.login.newPassword : t.login.password}</small>
              <input
                className="w-full bg-(--field-bg) border-0 px-3.75 py-3 rounded-xl text-profund shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.login.passwordPlaceholder}
                required
              />
            </div>
          )}

          {(isRegister || (isForgot && resetStep === 2)) && (
            <div className="text-left w-full">
              <small>{isForgot ? t.login.confirmNewPassword : 'Confirmer le mot de passe'}</small>
              <input
                className="w-full bg-(--field-bg) border-0 px-3.75 py-3 rounded-xl text-profund shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="border-0 rounded-xl px-5 py-3.5 font-semibold cursor-pointer bg-lilas text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-96 hover:brightness-115 hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)] w-full mt-2.5 text-[1rem]"
            disabled={loading}
          >
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

        <div className="flex flex-col items-center gap-2.5 mt-2.5">
          {!isRegister && !isForgot && (
            <p
              onClick={() => setIsForgot(true)}
              className="cursor-pointer text-[0.85rem] opacity-70"
            >
              {t.login.forgotPassword}
            </p>
          )}

          <p
            onClick={() => {
              setIsRegister(!isRegister)
              setIsForgot(false)
              setResetStep(1)
            }}
            className="cursor-pointer text-[0.95rem] text-lilas-doux"
          >
            {isRegister ? t.login.toggleToLogin : t.login.toggleToRegister}
          </p>
        </div>
      </div>
    </div>
  )
}
