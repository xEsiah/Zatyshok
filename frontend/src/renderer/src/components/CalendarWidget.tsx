/* eslint-disable prettier/prettier */
import '../assets/CalendarWidget.css'
import { useState, useEffect, JSX, useCallback } from 'react'
import { api, CalendarEntry } from '../services'
import { useUser } from './UserContext'

export function CalendarWidget(): JSX.Element {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const { userRole, t } = useUser()

  const loadEntries = useCallback(async () => {
    try {
      const data = await api.getCalendar()
      setEntries(data)
    } catch (err) {
      console.error('Failed to load calendar entries', err)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEntries()
  }, [loadEntries])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const locale = userRole === 'artFR' ? 'fr-FR' : 'en-GB'
  const monthName = currentDate.toLocaleString(locale, { month: 'long' })

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const offset = (firstDay + 6) % 7

  const prevMonth = (): void => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = (): void => setCurrentDate(new Date(year, month + 1, 1))

  const normalizeDateStr = (date: string | null | undefined): string => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-CA')
  }

  const isToday = (d: number): boolean => {
    const today = new Date()
    return today.getDate() === d && today.getMonth() === month && today.getFullYear() === year
  }

  const calendarDays: JSX.Element[] = []
  for (let i = 0; i < offset; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayEntries = entries.filter((e) => normalizeDateStr(e.date) === dateStr)
    const goals = dayEntries.filter((e) => e.category === 'goal')
    const events = dayEntries.filter((e) => e.category === 'event')
    const displayEntries = [...goals, ...events]

    calendarDays.push(
      <div
        key={d}
        className={`calendar-day ${isToday(d) ? 'is-today' : ''} ${displayEntries.length > 0 ? 'has-entries' : ''}`}
      >
        <div className="day-content-wrapper">
          <span className="day-num">{d}</span>
          <div className="pastilles">
            {goals.length > 0 && <span className="dot goal"></span>}
            {events.length > 0 && <span className="dot event"></span>}
          </div>
        </div>

        {displayEntries.length > 0 && (
          <div className="calendar-day-details">
            {displayEntries.map((e, idx) => (
              <div key={idx} className="day-detail-item" title={e.text}>
                <span className="detail-emoji">
                  {e.category === 'goal' ? t.daily.iconGoal : t.daily.iconEvent}
                </span>
                <span className="detail-text">{e.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="calendar-container">
      <div className="calendar-widget-header">
        <h2 className="calendar-month-title">
          {monthName} {year}
        </h2>
        <div className="calendar-controls">
          <button onClick={prevMonth} className="layout-btn">
            ‹
          </button>
          <button onClick={nextMonth} className="layout-btn">
            ›
          </button>
        </div>
      </div>
      <div className="calendar-weekdays">
        {(userRole === 'artFR'
          ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        ).map((d) => (
          <div key={d} className="weekday-label">
            {d}
          </div>
        ))}
      </div>
      <div className="calendar-days-grid">{calendarDays}</div>
    </div>
  )
}
