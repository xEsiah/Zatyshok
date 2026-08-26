import '../assets/MoodWidget.css'
import { useState, useEffect, useCallback, JSX } from 'react'
import { api, MoodEntry } from '../services'
import { useModal } from './ModalContext'
import { useUser } from './UserContext'

type MoodType = 'great' | 'ok' | 'meh' | 'bad'

const normalizeDate = (dateString?: string): string => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-CA')
}

export function MoodWidget(): JSX.Element {
  const [moods, setMoods] = useState<MoodEntry[]>([])
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [moodNote, setMoodNote] = useState<string>('')
  const [isHistoryView, setIsHistoryView] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const { showModal } = useModal()
  const { t } = useUser()

  const getMoodEmoji = (mood?: string): string => {
    if (!mood) return '?'

    if (t?.mood?.types && t.mood.types[mood as MoodType]) {
      return t.mood.types[mood as MoodType]
    }

    switch (mood) {
      case 'great':
        return '✨'
      case 'ok':
        return '🙂'
      case 'meh':
        return '☁️'
      case 'bad':
        return '🌧️'
      default:
        return '?'
    }
  }

  const todayStr = new Date().toLocaleDateString('en-CA')
  const yesterdayStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toLocaleDateString('en-CA')
  })()

  const fetchMoods = useCallback(
    (currentPage: number = 1): void => {
      api.getMoods(currentPage).then((res) => {
        if (currentPage === 1) {
          setMoods(res)
          const todayEntry = res.find((m) => normalizeDate(m.date) === todayStr)
          if (todayEntry) {
            setSelectedMood(todayEntry.mood as MoodType)
            setMoodNote(todayEntry.note || '')
          }
        } else {
          setMoods((prev) => [...prev, ...res])
        }
        setHasMore(res.length === 15)
      })
    },
    [todayStr]
  )

  useEffect((): void => {
    fetchMoods(1)
  }, [fetchMoods])

  const loadMore = (): void => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchMoods(nextPage)
  }

  const handleMoodSubmit = async (): Promise<void> => {
    if (!selectedMood) return
    try {
      await api.postMood({ mood: selectedMood, note: moodNote, date: todayStr })
      setPage(1)
      fetchMoods(1)
      showModal({ title: t.mood.savedTitle, message: t.mood.savedMsg, type: 'alert' })
    } catch {
      showModal({ title: t.mood.errorTitle, message: t.mood.errorMsg, type: 'alert' })
    }
  }

  const yesterdayEntry = moods.find((m) => normalizeDate(m.date) === yesterdayStr)
  const todayEntry = moods.find((m) => normalizeDate(m.date) === todayStr)

  return (
    <div className="soft-ui mood-widget">
      <h3 className="sidebar-title">
        {isHistoryView ? t.mood.historyTitle : t.mood.feelingTitle}
        <button className="history-button" onClick={() => setIsHistoryView(!isHistoryView)}>
          {isHistoryView ? t.mood.back : t.mood.history}
        </button>
      </h3>

      {isHistoryView ? (
        <div className="mood-list-container">
          {moods.length === 0 ? (
            <p>{t.mood.noHistory}</p>
          ) : (
            <>
              {moods.map((m) => (
                <div key={m.id} className="mood-history-row">
                  <small className="mood-date-display">
                    {new Date(m.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </small>
                  <span className="mood-emoji-display">{getMoodEmoji(m.mood)}</span>
                  <span className="mood-note-display">{m.note}</span>
                </div>
              ))}
              {hasMore && (
                <button className="soft-btn mood-load-more-btn" onClick={loadMore}>
                  {t.mood.seeMore}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mood-history">
            <div className="mood-history-row">
              <span className="mood-label">{t.mood.yesterday}</span>
              <span className="mood-emoji-display">
                {yesterdayEntry ? getMoodEmoji(yesterdayEntry.mood) : '-'}
              </span>
              <span className="mood-note-display">{yesterdayEntry?.note || ''}</span>
            </div>
            <div className="mood-history-row">
              <span className="mood-label">{t.mood.today}</span>
              <span className="mood-emoji-display">
                {todayEntry ? getMoodEmoji(todayEntry.mood) : '-'}
              </span>
              <span className="mood-note-display">{todayEntry?.note || ''}</span>
            </div>
          </div>

          <div className="mood-grid">
            {(['great', 'ok', 'meh', 'bad'] as MoodType[]).map((m) => (
              <button
                key={m}
                onClick={(): void => setSelectedMood(m)}
                className={`soft-ui mood-btn ${selectedMood === m ? 'active' : ''}`}
              >
                {getMoodEmoji(m)}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder={todayEntry ? t.mood.placeholderUpdate : t.mood.placeholderNew}
            value={moodNote}
            onChange={(e): void => setMoodNote(e.target.value)}
            className="soft-input mood-input-group"
          />
          <button className="soft-btn-primary" onClick={handleMoodSubmit} disabled={!selectedMood}>
            {todayEntry ? t.mood.btnUpdate : t.mood.btnSubmit}
          </button>
        </>
      )}
    </div>
  )
}
