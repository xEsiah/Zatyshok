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
    <div className="flex-1 w-full min-h-0 max-[1350px]:flex-none max-[1350px]:h-[max(26vh,350px)] bg-[var(--card-bg)] rounded-[var(--radius-bento)] shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-[var(--card-border)] transition-all duration-300 p-[20px_25px] flex flex-col justify-between min-h-[26vh] has-[.mood-list-container]:justify-start">
      <h3 className="sidebar-title relative">
        {isHistoryView ? t.mood.historyTitle : t.mood.feelingTitle}
        <button
          className="[-webkit-app-region:no-drag] absolute top-[2px] right-[3%] bg-transparent border border-[var(--color-lilas-doux)] text-[var(--color-lilas-doux)] rounded-[8px] text-[0.7rem] hover:scale-[1.1] transition-transform"
          onClick={() => setIsHistoryView(!isHistoryView)}
        >
          {isHistoryView ? t.mood.back : t.mood.history}
        </button>
      </h3>

      {isHistoryView ? (
        <div className="mood-list-container mt-[15px] flex-1 min-h-0 overflow-y-auto p-[10px] bg-[var(--bg-color)] rounded-[16px] shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:rounded-[10px] [&::-webkit-scrollbar-thumb]:bg-[var(--color-lilas-doux)]">
          {moods.length === 0 ? (
            <p className="opacity-[0.6] text-[0.9rem]">{t.mood.noHistory}</p>
          ) : (
            <>
              {moods.map((m) => (
                <div
                  key={m.id}
                  className="flex gap-[10px] items-center mb-[10px] border-b border-[var(--color-rose-poudre)] pb-[5px]"
                >
                  <small className="min-w-[80px] inline-block">
                    {new Date(m.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </small>
                  <span className="mx-[10px] text-[1.1rem]">{getMoodEmoji(m.mood)}</span>
                  <span className="italic opacity-[0.7] text-[0.8rem] text-[var(--color-profond)] whitespace-normal">
                    {m.note}
                  </span>
                </div>
              ))}
              {hasMore && (
                <button
                  className="border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5 w-full mt-[10px]"
                  onClick={loadMore}
                >
                  {t.mood.seeMore}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-[6px] mb-[10px] p-[10px] bg-[var(--bg-color)] rounded-[16px] shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <div className="flex gap-[10px] items-center">
              <span className="font-bold text-[var(--color-lilas-doux)]">{t.mood.yesterday}</span>
              <span className="text-[1.1rem]">
                {yesterdayEntry ? getMoodEmoji(yesterdayEntry.mood) : '-'}
              </span>
              <span className="italic opacity-[0.7] text-[0.8rem] whitespace-nowrap overflow-hidden text-ellipsis text-[var(--color-profond)] pr-[0.5vw]">
                {yesterdayEntry?.note || ''}
              </span>
            </div>
            <div className="flex gap-[10px] items-center">
              <span className="font-bold text-[var(--color-lilas-doux)]">{t.mood.today}</span>
              <span className="text-[1.1rem]">
                {todayEntry ? getMoodEmoji(todayEntry.mood) : '-'}
              </span>
              <span className="italic opacity-[0.7] text-[0.8rem] whitespace-nowrap overflow-hidden text-ellipsis text-[var(--color-profond)] pr-[0.5vw]">
                {todayEntry?.note || ''}
              </span>
            </div>
          </div>

          <div className="flex gap-[5px] my-[10px] justify-center">
            {(['great', 'ok', 'meh', 'bad'] as MoodType[]).map((m) => (
              <button
                key={m}
                onClick={(): void => setSelectedMood(m)}
                className={`text-[1.4rem] flex-1 py-[10px] rounded-[50px] ${
                  selectedMood === m
                    ? 'bg-[var(--color-lilas-vif)] shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-[0.96] hover:brightness-[1.15] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                    : 'bg-[var(--card-bg)] shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-[var(--card-border)] hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-[2px]'
                }`}
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
            className="w-full bg-[var(--field-bg)] border-0 px-[15px] py-[10px] rounded-xl text-[var(--color-profond)] shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-none box-border mb-[10px]"
          />
          <button
            className="bg-[var(--color-lilas-vif)] text-white border-0 px-[25px] py-[12px] rounded-[15px] font-bold cursor-pointer transition-all duration-200 enabled:hover:brightness-[1.15] enabled:hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleMoodSubmit}
            disabled={!selectedMood}
          >
            {todayEntry ? t.mood.btnUpdate : t.mood.btnSubmit}
          </button>
        </>
      )}
    </div>
  )
}
