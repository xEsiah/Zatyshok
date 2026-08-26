import { API_URL, getHeaders, checkAuthError } from './apiClient'

export interface UserProfileResponse {
  username: string
  email: string
  profilePicture: string | null
  stats: {
    moods: number
    goals: number
    events: number
    notes: number
  }
}

export const getMe = async (): Promise<UserProfileResponse> => {
  const headers = await getHeaders(false)
  const response = await fetch(`${API_URL}/user/me`, {
    method: 'GET',
    headers
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to fetch profile')
  }
  return response.json()
}

export const uploadAvatar = async (formData: FormData): Promise<{ imageUrl: string }> => {
  const headers = await getHeaders(false)
  const response = await fetch(`${API_URL}/user/upload-profile`, {
    method: 'POST',
    headers,
    body: formData
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Upload failed')
  }
  return response.json()
}

export const updateUserRole = async (role: string): Promise<void> => {
  const baseHeaders = await getHeaders(true)
  const res = await fetch(`${API_URL}/user/role`, {
    method: 'PUT',
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ role })
  })
  checkAuthError(res)
}

export const updateUserInfo = async (
  username: string,
  email: string
): Promise<{ message: string }> => {
  const baseHeaders = await getHeaders(false)

  const headers = {
    ...baseHeaders,
    'Content-Type': 'application/json'
  }

  const response = await fetch(`${API_URL}/user/update-info`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ username, email })
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Erreur serveur (HTML)' }))
    throw new Error(data.error || `Update failed with status ${response.status}`)
  }

  return response.json()
}

export const updatePassword = async (
  oldPassword: string,
  newPassword: string
): Promise<{ message: string }> => {
  const headers = await getHeaders(true)

  const response = await fetch(`${API_URL}/user/update-password`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ oldPassword, newPassword })
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to update password')
  }

  return response.json()
}
