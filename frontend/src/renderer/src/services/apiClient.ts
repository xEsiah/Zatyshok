import pkg from '../../../../package.json'

export const API_URL = import.meta.env.VITE_API_URL
const TOKEN = import.meta.env.VITE_API_TOKEN
const APP_VERSION = pkg.version

export const getHeaders = async (isJson = false): Promise<Record<string, string>> => {
  const userToken = await window.api.getStoreValue('user_token')
  const headers: Record<string, string> = {
    'X-App-Token': TOKEN,
    'X-App-Version': APP_VERSION,
    Authorization: userToken ? `Bearer ${userToken}` : ''
  }
  if (isJson) headers['Content-Type'] = 'application/json'
  return headers
}

export const checkAuthError = (res: Response): void => {
  if (res.status === 401 || res.status === 403) {
    window.api.deleteStoreValue('user_token')
    window.api.deleteStoreValue('username')
    window.location.reload()
  }
}
