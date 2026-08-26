export interface CalendarEntry {
  id?: number
  user_id?: number
  text: string
  date?: string | null
  moment: 'morning' | 'afternoon' | 'evening' | 'night'
  category: 'note' | 'goal' | 'event'
  entry_type?: 'text' | 'audio'
  media_url?: string | null
  is_recurring?: boolean | number
  recurrence_rule?: string | null
  created_at?: string
}

export interface MoodEntry {
  id?: number
  mood: 'great' | 'ok' | 'meh' | 'bad'
  note: string
  date: string
}

export interface SpotifyTrack {
  isPlaying: boolean
  title?: string
  artist?: string
  albumImageUrl?: string
  message?: string
}

export interface WeatherData {
  current?: { temp_c: number; is_day: number }
  forecast?: {
    forecastday: Array<{
      day: { maxtemp_c: number; mintemp_c: number }
    }>
  }
  error?: string
}

export interface AuthResponse {
  message?: string
  error?: string
  token?: string
  username?: string
  userId?: number
  profilePicture?: string | null
  role?: string
}

export interface BudgetCategory {
  id: number
  name: string
  type: 'expense' | 'income'
}

export interface Expense {
  id?: number
  amount: number
  description: string
  category_id: number | null
  date: string
  type: 'expense' | 'income'
}
