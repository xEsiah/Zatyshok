import '../assets/DailyView.css'
import { JSX, useEffect, useState, useCallback } from 'react'
import { api, CalendarEntry } from '../services'
import { useModal } from './ModalContext'
import { useUser } from './UserContext'

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
    <div className="daily-layout">
      <div className="planner-scroll-area">
        <h2 className="main-title">{t.daily.upcoming}</h2>
        <small>
          {t.daily.todayIs} {prettyDate}
        </small>

        {loading ? (
          <p>{t.daily.loading}</p>
        ) : planning.length === 0 ? (
          <p className="empty-state">{t.daily.nothingPlanned}</p>
        ) : (
          <div className="planner-list">
            <small>
              {t.daily.plannerTitle} ({planning.length})
            </small>
            {planning.map((entry) => {
              const entryDate = normalizeDate(entry.date)
              return (
                <div key={entry.id} className="soft-ui planner-item">
                  <span className="planner-icon">
                    {entry.category === 'goal' ? t.daily.iconGoal : t.daily.iconEvent}
                  </span>
                  <div className="planner-item-content">
                    {editingId === entry.id ? (
                      <div className="edit-inline-form">
                        <input
                          className="planner-edit-input"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
                        <input
                          type="date"
                          className="planner-edit-input"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                        <select
                          className="planner-edit-select"
                          value={editCategory}
                          onChange={(e) =>
                            setEditCategory(e.target.value as 'goal' | 'event' | 'note')
                          }
                        >
                          <option value="goal">{t.daily.iconGoal} Goal</option>
                          <option value="event">{t.daily.iconEvent} Event</option>
                          <option value="note">📌 Note</option>
                        </select>
                        <div className="planner-recurrence-wrapper">
                          <label className="planner-recurrence-label">
                            <input
                              type="checkbox"
                              checked={editIsRecurring}
                              onChange={(e) => setEditIsRecurring(e.target.checked)}
                            />
                            {t.daily.recurring}
                          </label>
                          <select
                            className="planner-edit-select"
                            value={editRecurrenceRule}
                            onChange={(e) => setEditRecurrenceRule(e.target.value)}
                            disabled={!editIsRecurring}
                          >
                            <option value="daily">{t.daily.daily}</option>
                            <option value="weekly">{t.daily.weekly}</option>
                            <option value="monthly">{t.daily.monthly}</option>
                            <option value="yearly">{t.daily.yearly}</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="planner-text">{entry.text}</span>
                        {entryDate !== todayStr && (
                          <small className="planner-date-small">
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
                    <div className="planner-actions">
                      <button onClick={handleSaveEdit}>✔️</button>
                      <button onClick={() => setEditingId(null)}>✖️</button>
                    </div>
                  ) : (
                    <div className="planner-actions">
                      <button onClick={() => handleStartEdit(entry)}>🖊️</button>
                      <button
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
      </div>

      {thoughts.length > 0 && (
        <div className="post-it-area">
          <small>
            {t.daily.notesTitle} ({thoughts.length})
          </small>
          <div className="post-it-scroll-container">
            <div className="post-it-grid">
              {thoughts.map((note) => {
                const isEditing = editingId === note.id
                const len = note.text.length
                const dynamicFontSize =
                  len > 90
                    ? '0.75rem'
                    : len > 75
                      ? '0.80rem'
                      : len > 60
                        ? '0.85rem'
                        : len > 45
                          ? '0.90rem'
                          : len > 30
                            ? '0.95rem'
                            : len > 15
                              ? '1.05rem'
                              : '1.2rem'
                return (
                  <div key={note.id} className="post-it">
                    <div className="post-it-pin">📍</div>

                    {isEditing ? (
                      <div className="edit-post-it-content">
                        <input
                          className="soft-input-mini"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                        />
                        <select
                          value={editCategory}
                          onChange={(e) =>
                            setEditCategory(e.target.value as 'goal' | 'event' | 'note')
                          }
                        >
                          <option value="goal">{t.daily.iconGoal} Goal</option>
                          <option value="event">{t.daily.iconEvent} Event</option>
                          <option value="note">📌 Note</option>
                        </select>
                        <div>
                          <button onClick={handleSaveEdit}>✔️</button>
                          <button onClick={() => setEditingId(null)}>✖️</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          className="post-it-close"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteEntry(note.id)
                          }}
                          title={t.daily.deleteNote}
                        >
                          🗑️
                        </button>
                        <div className="post-it-content" style={{ fontSize: dynamicFontSize }}>
                          <span>{note.text}</span>
                          <button
                            onClick={() => handleStartEdit(note)}
                            title="Modifier"
                            className="post-it-edit"
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
  )
}
