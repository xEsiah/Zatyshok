import { API_URL, getHeaders } from './apiClient'
import { WeatherData } from './types'

export const getWeather = async (): Promise<WeatherData> => {
  try {
    const headers = await getHeaders()
    const res = await fetch(`${API_URL}/weather`, { headers })
    if (!res.ok) return { error: 'Weather unavailable' }
    return res.json()
  } catch {
    return { error: 'Weather unavailable' }
  }
}
