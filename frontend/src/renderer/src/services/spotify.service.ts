import { API_URL, getHeaders } from './apiClient'
import { SpotifyTrack } from './types'

export const getSpotify = async (): Promise<SpotifyTrack> => {
  try {
    const headers = await getHeaders()
    const res = await fetch(`${API_URL}/spotify/current`, { headers })
    if (!res.ok) return { isPlaying: false, message: 'Spotify error' }
    return res.json()
  } catch {
    return { isPlaying: false, message: 'Spotify unavailable' }
  }
}

export const getSpotifyLoginUrl = async (): Promise<string> => {
  const username = await window.api.getStoreValue('username')
  return `${API_URL}/spotify/login/${username}`
}

export const spotifyNext = async (): Promise<void> => {
  const headers = await getHeaders()
  await fetch(`${API_URL}/spotify/next`, { method: 'PUT', headers })
}

export const spotifyPrevious = async (): Promise<void> => {
  const headers = await getHeaders()
  await fetch(`${API_URL}/spotify/previous`, { method: 'PUT', headers })
}

export const spotifyPlay = async (): Promise<void> => {
  const headers = await getHeaders()
  await fetch(`${API_URL}/spotify/play`, { method: 'PUT', headers })
}

export const spotifyPause = async (): Promise<void> => {
  const headers = await getHeaders()
  await fetch(`${API_URL}/spotify/pause`, { method: 'PUT', headers })
}
