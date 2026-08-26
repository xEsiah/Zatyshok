import '../assets/WriteView.css'
import { useState, useRef, useEffect, JSX } from 'react'
import { api } from '../services'
import { useModal } from './ModalContext'
import { useUser } from './UserContext'

export function WriteView({ onBack }: { onBack: () => void }): JSX.Element {
  const [text, setText] = useState<string>('')
  const [category, setCategory] = useState<'goal' | 'event' | 'note'>('goal')
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('en-CA'))
  const [time, setTime] = useState<string>('')
  const [hasDate, setHasDate] = useState<boolean>(true)
  const [isRecurring, setIsRecurring] = useState<boolean>(false)
  const [recurrenceRule, setRecurrenceRule] = useState<string>('daily')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const todayStr = new Date().toLocaleDateString('en-CA')

  const { showModal } = useModal()
  const { t } = useUser()

  useEffect((): void => {
    textareaRef.current?.focus()
  }, [])

  const handleSend = async (): Promise<void> => {
    if (!text.trim()) return
    const finalText = time ? `[${time}] ${text}` : text

    let momentValue: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning'
    const hourToCheck = time ? parseInt(time.split(':')[0], 10) : new Date().getHours()

    if (hourToCheck >= 12 && hourToCheck < 18) {
      momentValue = 'afternoon'
    } else if (hourToCheck >= 18 && hourToCheck < 22) {
      momentValue = 'evening'
    } else if (hourToCheck >= 22 || hourToCheck < 5) {
      momentValue = 'night'
    }

    try {
      await api.postCalendar({
        text: finalText,
        category,
        date: hasDate ? date : todayStr,
        moment: momentValue,
        entry_type: 'text',
        is_recurring: isRecurring ? 1 : 0,
        recurrence_rule: isRecurring ? recurrenceRule : null
      })
      showModal({
        title: t.write.savedTitle,
        message: t.write.savedMsg,
        type: 'alert',
        onConfirm: () => {
          setText('')
          onBack()
        }
      })
    } catch {
      showModal({ title: t.write.errorTitle, message: t.write.errorMsg, type: 'alert' })
    }
  }

  return (
    <div className="write-container">
      <div className="soft-ui write-grid">
        <div className="category-selector">
          <button
            className={`soft-btn ${category === 'goal' ? 'active' : ''}`}
            onClick={() => {
              setCategory('goal')
              setHasDate(true)
            }}
          >
            {t.write.tabGoal}
          </button>
          <button
            className={`soft-btn ${category === 'event' ? 'active' : ''}`}
            onClick={() => {
              setCategory('event')
              setHasDate(true)
            }}
          >
            {t.write.tabEvent}
          </button>
          <button
            className={`soft-btn ${category === 'note' ? 'active' : ''}`}
            onClick={() => {
              setCategory('note')
              setHasDate(false)
              setIsRecurring(false)
            }}
          >
            {t.write.tabThought}
          </button>
        </div>

        {hasDate && (
          <div className="date-group">
            <div className="date">
              <label className="date-label">{t.write.lblDate}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="soft-input"
              />
            </div>
            <div className="hour">
              <label className="date-label">{t.write.lblTime}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="soft-input"
              />
            </div>

            <div className="recurrence-group">
              <label className="date-label">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                />
                {t.daily.recurring}
              </label>
              <select
                className="soft-input"
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                disabled={!isRecurring}
              >
                <option value="daily">{t.daily.daily}</option>
                <option value="weekly">{t.daily.weekly}</option>
                <option value="monthly">{t.daily.monthly}</option>
                <option value="yearly">{t.daily.yearly}</option>
              </select>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="soft-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.write.placeholder}
        />

        <div className="write-actions">
          <button onClick={onBack} className="soft-btn">
            {t.write.btnCancel}
          </button>
          <button onClick={handleSend} className="soft-btn-primary">
            {t.write.btnSave}
          </button>
        </div>
      </div>
    </div>
  )
}
