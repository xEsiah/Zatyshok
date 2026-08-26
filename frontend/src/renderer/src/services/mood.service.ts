import { API_URL, getHeaders, checkAuthError } from './apiClient'
import { MoodEntry } from './types'

export const getMoods = async (page: number = 1): Promise<MoodEntry[]> => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/moods?page=${page}`, { headers })
  checkAuthError(res)
  if (!res.ok) return []
  return res.json()
}

export const postMood = async (entry: MoodEntry): Promise<void> => {
  const headers = await getHeaders(true)
  const res = await fetch(`${API_URL}/moods`, {
    method: 'POST',
    headers,
    body: JSON.stringify(entry)
  })
  checkAuthError(res)
}
