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

  const dayBase =
    'flex flex-col items-center justify-center relative rounded-[15px] min-h-15 z-1 transition-all duration-200 ease-in-out'

  const calendarDays: JSX.Element[] = []
  for (let i = 0; i < offset; i++) {
    calendarDays.push(<div key={`empty-${i}`} className={dayBase}></div>)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayEntries = entries.filter((e) => normalizeDateStr(e.date) === dateStr)
    const goals = dayEntries.filter((e) => e.category === 'goal')
    const events = dayEntries.filter((e) => e.category === 'event')
    const displayEntries = [...goals, ...events]

    const today = isToday(d)
    const hasEntries = displayEntries.length > 0
    const dayToday = today ? 'bg-rose text-white shadow-[4px_4px_10px_var(--shadow-dark)]' : ''
    const dayHover = hasEntries
      ? today
        ? 'group hover:bg-rose hover:scale-180 hover:z-100 hover:shadow-[0_10px_30px_var(--shadow-dark)] hover:border hover:border-shadow-l hover:rounded-xl hover:cursor-all-scroll hover:origin-center'
        : 'group hover:bg-card hover:scale-180 hover:z-100 hover:shadow-[0_10px_30px_var(--shadow-dark)] hover:border hover:border-lilas-doux hover:rounded-xl hover:cursor-all-scroll hover:origin-center'
      : ''
    const goalDot = today ? 'bg-white' : 'bg-rose'
    const eventDot = today ? 'bg-profond' : 'bg-lilas'
    const detailColor = today ? 'text-white' : 'text-profond'

    calendarDays.push(
      <div key={d} className={`${dayBase} ${dayToday} ${dayHover}`}>
        <div className="group-hover:hidden">
          <span className={`text-[1.1rem] ${today ? 'font-extrabold' : 'font-medium'}`}>{d}</span>
          <div className="flex gap-1 mt-1 absolute bottom-2.5">
            {goals.length > 0 && <span className={`w-1.25 h-1.25 rounded-full ${goalDot}`}></span>}
            {events.length > 0 && (
              <span className={`w-1.25 h-1.25 rounded-full ${eventDot}`}></span>
            )}
          </div>
        </div>

        {hasEntries && (
          <div className="absolute inset-0 hidden flex-col items-start p-1 gap-0.5 overflow-y-auto overflow-x-hidden bg-inherit rounded-xl group-hover:flex scrollbar-none [&::-webkit-scrollbar]:hidden animate-[detailFade_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            {displayEntries.map((e, idx) => (
              <div
                key={idx}
                className={`block text-[0.65rem] font-semibold w-full pointer-events-none mb-0.5 ${detailColor}`}
                title={e.text}
              >
                <span className="mr-0.75">
                  {e.category === 'goal' ? t.daily.iconGoal : t.daily.iconEvent}
                </span>
                <span className="leading-[1.1] whitespace-normal overflow-hidden text-ellipsis">
                  {e.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full p-[1vh] pb-[3.5vh]! box-border overflow-visible!">
      <div className="flex justify-between items-center mb-6.25 mt-3.75 w-[80%]">
        <h2 className="m-0 capitalize text-[1.8rem] text-profond font-bold">
          {monthName} {year}
        </h2>
        <div className="flex gap-2.5">
          <button
            onClick={prevMonth}
            className="border-0 rounded-lg flex items-center justify-center text-[0.9rem] text-lilas cursor-pointer bg-card shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-px hover:bg-shadow-d active:scale-95 active:shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] size-11.25 pb-1.25"
          >
            ‹
          </button>
          <button
            onClick={nextMonth}
            className="border-0 rounded-lg flex items-center justify-center text-[0.9rem] text-lilas cursor-pointer bg-card shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-px hover:bg-shadow-d active:scale-95 active:shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] size-11.25 pb-1.25"
          >
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center mb-3.75 border-b border-shadow-d pb-2.5">
        {(userRole === 'artFR'
          ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        ).map((d) => (
          <div key={d} className="text-[0.75rem] font-bold opacity-40 uppercase tracking-[1px]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(75px,1fr)] flex-1 gap-2 overflow-visible">
        {calendarDays}
      </div>
    </div>
  )
}
