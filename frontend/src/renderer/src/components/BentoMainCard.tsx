import { useState, JSX } from 'react'
import { DailyView } from './DailyView'
import { CalendarWidget } from './CalendarWidget'
import { Card } from './layout/Card'

export function BentoMainCard(): JSX.Element {
  const [mainView, setMainView] = useState<'daily' | 'calendar'>('daily')

  return (
    <Card className="relative overflow-hidden px-[3vw] py-[2vh] flex-1 min-h-0 max-[1350px]:flex-none max-[1350px]:h-auto max-[1350px]:min-h-[40vh] max-[1350px]:max-h-[50vh]">
      <button
        className="border-0 rounded-lg flex items-center justify-center cursor-pointer bg-card shadow-[3px_3px_6px_var(--shadow-dark),-2px_-2px_6px_var(--shadow-light)] transition-all duration-200 hover:-translate-y-px hover:bg-rose active:scale-95 active:shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] absolute top-5 right-5 size-12.5 text-[1.5em] z-10"
        onClick={() => setMainView(mainView === 'daily' ? 'calendar' : 'daily')}
        title={mainView === 'daily' ? 'Calendrier' : 'Liste'}
      >
        {mainView === 'daily' ? '📆' : '📋'}
      </button>
      {mainView === 'daily' ? <DailyView /> : <CalendarWidget />}
    </Card>
  )
}
