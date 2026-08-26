import { API_URL, getHeaders } from './apiClient'
import { AuthResponse } from './types'

export const login = async (identity: string, password: string): Promise<AuthResponse> => {
  const headers = await getHeaders(true)
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username: identity, password })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Login failed')
  return data
}

export const register = async (
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const headers = await getHeaders(true)
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, email, password })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Registration failed')
  return data
}

export interface ResetPasswordPayload {
  email: string
  token: string
  newPassword: string
}

export const forgotPassword = async (
  email: string
): Promise<{ message?: string; error?: string }> => {
  const headers = await getHeaders(true)
  const res = await fetch(`${API_URL}/forgot-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email })
  })
  return res.json()
}

export const resetPassword = async (
  payload: ResetPasswordPayload
): Promise<{ message?: string; error?: string }> => {
  const headers = await getHeaders(true)
  const res = await fetch(`${API_URL}/reset-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })
  return res.json()
}
