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
    <div
      className={`flex-1 w-full max-[1350px]:flex-none max-[1350px]:h-[max(26vh,350px)] bg-card rounded-card shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-(--card-border) transition-all duration-300 px-5 py-6.25 flex flex-col ${isHistoryView ? 'min-h-0' : 'justify-between'} max-[1350px]:h-[max(26vh,350px)] ${isHistoryView ? '' : 'has-[.mood-list-container]:justify-start'}`}
    >
      <h3 className="sidebar-title relative">
        {isHistoryView ? t.mood.historyTitle : t.mood.feelingTitle}
        <button
          className="[-webkit-app-region:no-drag] absolute top-0.5 right-[3%] bg-transparent border border-lilas-doux text-lilas-doux rounded-lg text-[0.7rem] px-3 py-1 hover:scale-110 transition-transform"
          onClick={() => setIsHistoryView(!isHistoryView)}
        >
          {isHistoryView ? t.mood.back : t.mood.history}
        </button>
      </h3>

      {isHistoryView ? (
        <div className="mood-list-container mt-3.75 flex-1 min-h-0 overflow-y-auto p-2.5 bg-bg rounded-2xl shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-[10px] [&::-webkit-scrollbar-thumb]:bg-lilas-doux flex flex-col gap-2.5">
          {moods.length === 0 ? (
            <p className="opacity-60 text-[0.9rem]">{t.mood.noHistory}</p>
          ) : (
            <>
              {moods.map((m) => (
                <div
                  key={m.id}
                  className="flex gap-2.5 items-center mb-2.5 border-b border-rose pb-1.25"
                >
                  <small className="min-w-20 inline-block">
                    {new Date(m.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </small>
                  <span className="mx-2.5 text-[1.1rem]">{getMoodEmoji(m.mood)}</span>
                  <span className="italic opacity-70 text-[0.8rem] text-profond whitespace-normal">
                    {m.note}
                  </span>
                </div>
              ))}
              {hasMore && (
                <button
                  className="border-0 rounded-xl px-4.5 py-2.5 font-semibold text-lilas-doux cursor-pointer bg-card shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 hover:bg-rose hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5 w-full mt-2.5"
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
          <div className="flex flex-col gap-1.5 mt-2.5 p-2.5 bg-bg rounded-2xl shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)]">
            <div className="flex gap-2.5 items-center">
              <span className="font-bold text-lilas-doux">{t.mood.yesterday}</span>
              <span className="text-[1.1rem]">
                {yesterdayEntry ? getMoodEmoji(yesterdayEntry.mood) : '-'}
              </span>
              <span className="italic opacity-70 text-[0.8rem] whitespace-nowrap overflow-hidden text-ellipsis text-profond pr-[0.5vw]">
                {yesterdayEntry?.note || ''}
              </span>
            </div>
            <div className="flex gap-2.5 items-center">
              <span className="font-bold text-lilas-doux">{t.mood.today}</span>
              <span className="text-[1.1rem]">
                {todayEntry ? getMoodEmoji(todayEntry.mood) : '-'}
              </span>
              <span className="italic opacity-70 text-[0.8rem] whitespace-nowrap overflow-hidden text-ellipsis text-profond pr-[0.5vw]">
                {todayEntry?.note || ''}
              </span>
            </div>
          </div>

          <div className="flex gap-1.25 my-2.5 justify-center">
            {(['great', 'ok', 'meh', 'bad'] as MoodType[]).map((m) => (
              <button
                key={m}
                onClick={(): void => setSelectedMood(m)}
                className={`text-[1.4rem] flex-1 py-2.5 rounded-[50px] ${
                  selectedMood === m
                    ? 'bg-lilas shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-96 hover:brightness-115 hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                    : 'bg-card shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-(--card-border) hover:bg-rose hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
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
            className="w-full bg-(--field-bg) border-0 px-3.75 py-2.5 rounded-xl text-profond shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border mb-2.5"
          />
          <button
            className="bg-lilas text-white border-0 px-6.25 py-3 rounded-[15px] font-bold cursor-pointer transition-all duration-200 enabled:hover:brightness-115 enabled:hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
