import { API_URL, getHeaders, checkAuthError } from './apiClient'
import { CalendarEntry } from './types'

export const getCalendar = async (): Promise<CalendarEntry[]> => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/calendar`, { headers })
  checkAuthError(res)
  if (!res.ok) return []
  return res.json()
}

export const postCalendar = async (entry: Omit<CalendarEntry, 'id'>): Promise<void> => {
  const headers = await getHeaders(true)
  const res = await fetch(`${API_URL}/calendar`, {
    method: 'POST',
    headers,
    body: JSON.stringify(entry)
  })
  checkAuthError(res)
}

export const updateCalendar = async (id: number, entry: Partial<CalendarEntry>): Promise<void> => {
  const headers = await getHeaders(true)
  const res = await fetch(`${API_URL}/calendar/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(entry)
  })
  checkAuthError(res)
}

export const deleteCalendar = async (id: number): Promise<void> => {
  const headers = await getHeaders()
  const res = await fetch(`${API_URL}/calendar/${id}`, { method: 'DELETE', headers })
  checkAuthError(res)
}
