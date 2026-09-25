import { JSX, useEffect, useState, useCallback } from 'react'
import { api, CalendarEntry } from '../services'
import { useModal } from './ModalContext'
import { useUser } from './UserContext'
import { AudioPlayer } from './AudioPlayer'
import { Dropdown } from './ui/Dropdown'

export function DailyView(): JSX.Element {
  const [planning, setPlanning] = useState<CalendarEntry[]>([])
  const [thoughts, setThoughts] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  const [time] = useState<string>('')
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [editText, setEditText] = useState('')
  const [editCategory, setEditCategory] = useState<'goal' | 'event' | 'note'>('goal')
  const [editDate, setEditDate] = useState('')
  const [editIsRecurring, setEditIsRecurring] = useState(false)
  const [editRecurrenceRule, setEditRecurrenceRule] = useState('daily')

  const { showModal } = useModal()
  const { t } = useUser()

  const todayStr = new Date().toLocaleDateString('en-CA')
  const currentYear = new Date().getFullYear()
  const prettyDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  const normalizeDate = (dateString?: string | null): string => {
    if (!dateString) return ''
    return dateString.split('T')[0]
  }

  const loadData = useCallback(() => {
    api.getCalendar().then((data) => {
      let planningData = data
        .filter((e) => {
          if (e.category === 'note') return false
          if (!e.date) return false
          return normalizeDate(e.date) >= todayStr
        })
        .sort((a, b) => normalizeDate(a.date).localeCompare(normalizeDate(b.date)))

      planningData = planningData.filter((entry, index, self) => {
        if (!entry.is_recurring) return true

        const baseId = String(entry.id).split('-')[0]

        return (
          index ===
          self.findIndex((e) => {
            const eBaseId = String(e.id).split('-')[0]
            return eBaseId === baseId
          })
        )
      })

      const thoughtsData = data
        .filter((e) => e.category === 'note')
        .sort((a, b) => (b.id || 0) - (a.id || 0))

      setPlanning(planningData)
      setThoughts(thoughtsData)
      setLoading(false)
    })
  }, [todayStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteEntry = (id?: number): void => {
    if (!id) return
    showModal({
      title: t.daily.modalDeleteTitle,
      message: t.daily.modalDeleteMsg,
      type: 'confirm',
      onConfirm: async () => {
        try {
          await api.deleteCalendar(id)
          loadData()
        } catch {
          console.error(t.daily.modalDeleteError)
        }
      }
    })
  }

  const handleStartEdit = (entry: CalendarEntry): void => {
    if (!entry.id) return
    setEditingId(entry.id)
    setEditText(entry.text)
    setEditCategory(entry.category)
    setEditDate(normalizeDate(entry.date))
    setEditIsRecurring(Boolean(entry.is_recurring))
    setEditRecurrenceRule(entry.recurrence_rule || 'daily')
  }

  let momentValue: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning'
  const hourToCheck = time ? parseInt(time.split(':')[0], 10) : new Date().getHours()

  if (hourToCheck >= 12 && hourToCheck < 18) {
    momentValue = 'afternoon'
  } else if (hourToCheck >= 18 && hourToCheck < 22) {
    momentValue = 'evening'
  } else if (hourToCheck >= 22 || hourToCheck < 5) {
    momentValue = 'night'
  }

  const handleSaveEdit = async (): Promise<void> => {
    if (editingId === null) return
    const realId = Number(typeof editingId === 'string' ? editingId.split('-')[0] : editingId)

    try {
      await api.updateCalendar(realId, {
        text: editText,
        date: editDate,
        category: editCategory,
        moment: momentValue,
        is_recurring: editIsRecurring,
        recurrence_rule: editIsRecurring ? editRecurrenceRule : null
      })
      setEditingId(null)
      loadData()
    } catch {
      console.error('Erreur lors de la mise à jour')
    }
  }

  return (
    <div className="flex h-full min-h-full flex-col">
      <div className="flex-1 min-h-0 flex flex-col">
        <h2 className="m-0">{t.daily.upcoming}</h2>
        <small>
          {t.daily.todayIs} {prettyDate}
        </small>

        {loading ? (
          <p>{t.daily.loading}</p>
        ) : planning.length === 0 ? (
          <p className="mt-5 text-center italic opacity-60">{t.daily.nothingPlanned}</p>
        ) : (
          <div className="flex flex-col gap-2 mt-2.5 min-h-0 flex-1 overflow-y-auto px-2.5 pb-6.25 pt-0">
            <small>
              {t.daily.plannerTitle} ({planning.length})
            </small>
            {planning.map((entry) => {
              const entryDate = normalizeDate(entry.date)
              return (
                <div
                  key={entry.id}
                  className="group bg-card border border-(--card-border) rounded-2xl transition-transform duration-300 flex items-center gap-3 shrink-0 min-h-22.5 p-3.75 box-border shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] hover:scale-101"
                >
                  <span className="text-[1.2rem]">
                    {entry.category === 'goal' ? t.daily.iconGoal : t.daily.iconEvent}
                  </span>
                  <div className="flex-1">
                    {editingId === entry.id ? (
                      <div className="flex flex-row items-center justify-around gap-3 font-bold text-[1.3rem] w-full">
                        <input
                          className="h-[4vh] px-2 py-1 border-0 rounded-md bg-(--field-bg) text-profond shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-hidden text-[0.85rem] box-border w-[25%]"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
                        <input
                          type="date"
                          className="h-[4vh] px-2 py-1 border-0 rounded-md bg-(--field-bg) text-profond shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-hidden text-[0.85rem] box-border w-[25%]"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                        <Dropdown
                          size="compact"
                          options={[
                            { value: 'goal', label: `${t.daily.iconGoal} Goal` },
                            { value: 'event', label: `${t.daily.iconEvent} Event` },
                            { value: 'note', label: '📌 Note' }
                          ]}
                          value={editCategory}
                          onChange={(v) => setEditCategory(v as 'goal' | 'event' | 'note')}
                        />
                        <div className="flex w-[20%] flex-col items-start gap-1.5 mt-0">
                          <label className="flex flex-row items-center gap-1.5 text-[0.75rem] cursor-pointer text-left whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={editIsRecurring}
                              onChange={(e) => setEditIsRecurring(e.target.checked)}
                            />
                            {t.daily.recurring}
                          </label>
                          <Dropdown
                            size="compact"
                            options={[
                              { value: 'daily', label: t.daily.daily },
                              { value: 'weekly', label: t.daily.weekly },
                              { value: 'monthly', label: t.daily.monthly },
                              { value: 'yearly', label: t.daily.yearly }
                            ]}
                            value={editRecurrenceRule}
                            onChange={setEditRecurrenceRule}
                            disabled={!editIsRecurring}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="font-semibold [word-break:break-word] leading-[1.3] block w-full">
                          {entry.text}
                        </span>
                        {entry.entry_type === 'audio' && entry.media_url && (
                          <AudioPlayer src={entry.media_url} compact />
                        )}
                        {entryDate !== todayStr && (
                          <small className="block text-[0.8rem] opacity-80 m-0">
                            {t.daily.for}:{' '}
                            {new Date(entry.date!).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              ...(new Date(entry.date!).getFullYear() !== currentYear && {
                                year: 'numeric'
                              })
                            })}
                          </small>
                        )}
                      </>
                    )}
                  </div>
                  {editingId === entry.id ? (
                    <div className="invisible group-hover:visible flex flex-col gap-2.5">
                      <button
                        className="not-italic text-profond text-[1rem] transition-transform duration-200 bg-none border-none p-0 hover:scale-130"
                        onClick={handleSaveEdit}
                      >
                        ✔️
                      </button>
                      <button
                        className="not-italic text-profond text-[1rem] transition-transform duration-200 bg-none border-none p-0 hover:scale-130"
                        onClick={() => setEditingId(null)}
                      >
                        ✖️
                      </button>
                    </div>
                  ) : (
                    <div className="invisible group-hover:visible flex flex-col gap-2.5">
                      <button
                        className="not-italic text-profond text-[1rem] transition-transform duration-200 bg-none border-none p-0 hover:scale-130"
                        onClick={() => handleStartEdit(entry)}
                      >
                        🖊️
                      </button>
                      <button
                        className="not-italic text-profond text-[1rem] transition-transform duration-200 bg-none border-none p-0 hover:scale-130"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteEntry(entry.id)
                        }}
                        title={t.daily.deleteItem}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {thoughts.length > 0 && (
          <div className="flex-none mt-3.75 mb-3.75 border-t-2 border-dashed border-t-white/50 max-h-45 w-full">
            <small>
              {t.daily.notesTitle} ({thoughts.length})
            </small>
            <div className="w-full overflow-x-auto scroll-smooth pt-10! -mt-7.5! [&::-webkit-scrollbar]:h-1">
              <div className="flex flex-nowrap gap-1.25 w-full items-start pb-2.5 overflow-visible! h-auto! after:content-[''] after:flex-[0_0_1px] after:h-px">
                {thoughts.map((note) => {
                  const isEditing = editingId === note.id
                  const len = note.text.length
                  const dynamicFontCls =
                    len > 90
                      ? 'text-[0.75rem]'
                      : len > 75
                        ? 'text-[0.80rem]'
                        : len > 60
                          ? 'text-[0.85rem]'
                          : len > 45
                            ? 'text-[0.90rem]'
                            : len > 30
                              ? 'text-[0.95rem]'
                              : len > 15
                                ? 'text-[1.05rem]'
                                : 'text-[1.2rem]'
                  return (
                    <div
                      key={note.id}
                      className="group relative flex flex-col w-35 min-w-35 h-30 p-2.5 ml-1.25 rounded-[2px_2px_15px_2px] shadow-[3px_3px_6px_rgba(0,0,0,0.2)] italic odd:rotate-[-0.5deg] odd:bg-(--postit-bg-odd) odd:text-(--postit-text-odd) even:rotate-[1.5deg] even:bg-(--postit-bg-even) even:text-(--postit-text-even) transition-transform duration-200 hover:scale-105 hover:z-10 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-3.75 after:bg-linear-to-b after:from-transparent after:to-black/36 after:pointer-events-none after:rounded-[2px_2px_15px_2px]"
                    >
                      <div className="absolute -translate-x-1/2 text-[1.5rem] group-odd:top-[-15%] group-odd:left-[60%] group-even:top-[-17%] group-even:left-[20%]">
                        📍
                      </div>

                      {isEditing ? (
                        <div className="flex flex-col gap-2.5 w-full h-full">
                          <input
                            className="w-full h-[4vh] px-2 py-1 border-0 rounded-md bg-(--field-bg) text-profund shadow-[inset_2px_2px_4px_var(--shadow-dark),inset_-2px_-2px_4px_var(--shadow-light)] outline-hidden text-[0.85rem] box-border"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />
                          <Dropdown
                            size="compact"
                            className="w-full"
                            options={[
                              { value: 'goal', label: `${t.daily.iconGoal} Goal` },
                              { value: 'event', label: `${t.daily.iconEvent} Event` },
                              { value: 'note', label: '📌 Note' }
                            ]}
                            value={editCategory}
                            onChange={(v) => setEditCategory(v as 'goal' | 'event' | 'note')}
                          />
                          <div>
                            <button
                              className="w-1/2 not-italic font-bold text-profond text-shadow-[0_0_1px_#00000078] text-[1rem] transition-transform duration-200 bg-none border-none p-0 hover:scale-130"
                              onClick={handleSaveEdit}
                            >
                              ✔️
                            </button>
                            <button
                              className="w-1/2 not-italic font-bold text-profond text-shadow-[0_0_1px_#00000078] text-[1rem] transition-transform duration-200 bg-none border-none p-0 hover:scale-130"
                              onClick={() => setEditingId(null)}
                            >
                              ✖️
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            className="invisible group-hover:visible absolute bottom-0.5 bg-none border-none font-bold text-[1rem] p-0 left-px not-italic text-shadow-[0_0_1px_#00000078] transition-transform duration-200 hover:scale-130"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteEntry(note.id)
                            }}
                            title={t.daily.deleteNote}
                          >
                            🗑️
                          </button>
                          <div
                            className={`flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-around text-center break-keep leading-[1.2] p-0.75 scroll-smooth [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-[10px] group-odd:[&::-webkit-scrollbar-thumb]:bg-lilas-doux group-even:[&::-webkit-scrollbar-thumb]:bg-rose ${dynamicFontCls}`}
                          >
                            <span>{note.text}</span>
                            {note.entry_type === 'audio' && note.media_url && (
                              <AudioPlayer src={note.media_url} compact />
                            )}
                            <button
                              onClick={() => handleStartEdit(note)}
                              title="Modifier"
                              className="invisible group-hover:visible absolute bottom-0.5 bg-none border-none font-bold text-[1rem] p-0 right-px not-italic text-shadow-[0_0_1px_#00000078] transition-transform duration-200 hover:scale-130"
                            >
                              🖊️
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
