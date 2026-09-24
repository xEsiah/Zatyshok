import { useState, useRef, useEffect, JSX } from 'react'
import { api } from '../services'
import { useModal } from './ModalContext'
import { useUser } from './UserContext'
import { AudioPlayer } from './AudioPlayer'

const formatRecordTime = (sec: number): string =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

export function WriteView({ onBack }: { onBack: () => void }): JSX.Element {
  const [text, setText] = useState<string>('')
  const [category, setCategory] = useState<'goal' | 'event' | 'note'>('goal')
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('en-CA'))
  const [time, setTime] = useState<string>('')
  const [hasDate, setHasDate] = useState<boolean>(true)
  const [isRecurring, setIsRecurring] = useState<boolean>(false)
  const [recurrenceRule, setRecurrenceRule] = useState<string>('daily')

  const [recording, setRecording] = useState<Blob | null>(null)
  const [recordingUrl, setRecordingUrl] = useState<string>('')
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [micBusy, setMicBusy] = useState<boolean>(false)
  const [recordingTime, setRecordingTime] = useState<number>(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const micModeRef = useRef<'ask' | 'allow' | 'deny'>('ask')
  const chunksRef = useRef<Blob[]>([])
  const recordingStartRef = useRef<number>(0)
  const todayStr = new Date().toLocaleDateString('en-CA')

  const { showModal } = useModal()
  const { t } = useUser()

  useEffect((): void => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    let active = true
    window.api.getStoreValue('micPermission').then((value) => {
      micModeRef.current = value === 'allow' ? 'allow' : value === 'deny' ? 'deny' : 'ask'
      if (!active || micModeRef.current !== 'allow') return
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((track) => track.stop())
            return
          }
          streamRef.current = stream
        })
        .catch(() => {})
    })
    return () => {
      active = false
      mediaRecorderRef.current?.stop()
      mediaRecorderRef.current = null
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isRecording) return
    const interval = window.setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - recordingStartRef.current) / 1000))
    }, 250)
    return () => window.clearInterval(interval)
  }, [isRecording])

  useEffect(() => {
    return () => {
      if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    }
  }, [recordingUrl])

  const clearRecording = (): void => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    setRecording(null)
    setRecordingUrl('')
    setRecordingTime(0)
  }

  const toggleRecording = async (): Promise<void> => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      return
    }

    let stream = streamRef.current
    if (!stream) {
      if (micBusy) return
      setMicBusy(true)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream
      } catch {
        setMicBusy(false)
        showModal({
          title: t.write.audioErrorTitle,
          message: t.write.audioErrorMsg,
          type: 'alert'
        })
        return
      }
      setMicBusy(false)
    }

    const recorder = new MediaRecorder(stream)
    mediaRecorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      setRecording(blob)
      setRecordingUrl(URL.createObjectURL(blob))
      setRecordingTime(0)
      setIsRecording(false)
      if (micModeRef.current === 'ask') {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }

    recorder.start()
    recordingStartRef.current = Date.now()
    setIsRecording(true)
  }

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

    let entryType: 'text' | 'audio' = 'text'
    let mediaUrl: string | null = null

    if (recording) {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('audio', recording, 'recording.webm')
      try {
        const uploadResult = await api.uploadAudio(formData)
        mediaUrl = uploadResult.mediaUrl
        entryType = 'audio'
      } catch {
        setIsUploading(false)
        showModal({
          title: t.write.audioErrorTitle,
          message: t.write.audioErrorMsg,
          type: 'alert'
        })
        return
      }
    }

    try {
      await api.postCalendar({
        text: finalText,
        category,
        date: hasDate ? date : todayStr,
        moment: momentValue,
        entry_type: entryType,
        media_url: mediaUrl,
        is_recurring: isRecurring ? 1 : 0,
        recurrence_rule: isRecurring ? recurrenceRule : null
      })
      showModal({
        title: t.write.savedTitle,
        message: t.write.savedMsg,
        type: 'alert',
        onConfirm: () => {
          setText('')
          clearRecording()
          setIsUploading(false)
          onBack()
        }
      })
    } catch {
      setIsUploading(false)
      showModal({ title: t.write.errorTitle, message: t.write.errorMsg, type: 'alert' })
    }
  }

  return (
    <div className="flex items-start justify-center box-border h-full min-h-full w-full">
      <div className="bg-[var(--card-bg)] rounded-[var(--radius-bento)] shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-[var(--card-border)] transition-all duration-300 w-full h-full flex flex-col gap-[2.5vw] p-[4vh_5vw] box-border">
        <div className="grid grid-cols-3 gap-[15px]">
          <button
            className={`border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 ${
              category === 'goal'
                ? 'bg-[var(--color-lilas-vif)] text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-[0.96] hover:brightness-[1.15] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                : 'hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
            }`}
            onClick={() => {
              setCategory('goal')
              setHasDate(true)
            }}
          >
            {t.write.tabGoal}
          </button>
          <button
            className={`border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 ${
              category === 'event'
                ? 'bg-[var(--color-lilas-vif)] text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-[0.96] hover:brightness-[1.15] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                : 'hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
            }`}
            onClick={() => {
              setCategory('event')
              setHasDate(true)
            }}
          >
            {t.write.tabEvent}
          </button>
          <button
            className={`border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 ${
              category === 'note'
                ? 'bg-[var(--color-lilas-vif)] text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-[0.96] hover:brightness-[1.15] hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]'
                : 'hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
            }`}
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
          <div className="flex gap-[20px] w-full items-start">
            <div className="flex-[2] flex flex-col gap-[8px]">
              <label className="text-[0.9rem] font-semibold text-[var(--color-lilas-doux)] pl-[5px]">
                {t.write.lblDate}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[var(--field-bg)] border-0 px-[15px] py-[12px] rounded-xl text-[var(--color-profond)] shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-none box-border"
              />
            </div>
            <div className="flex-1 flex flex-col gap-[8px]">
              <label className="text-[0.9rem] font-semibold text-[var(--color-lilas-doux)] pl-[5px]">
                {t.write.lblTime}
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[var(--field-bg)] border-0 px-[15px] py-[12px] rounded-xl text-[var(--color-profond)] shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-none box-border"
              />
            </div>

            <div className="flex-[1.5] flex flex-col items-start gap-[8px]">
              <label className="flex flex-row items-center justify-center gap-[6px] cursor-pointer text-[0.9rem] font-semibold text-[var(--color-lilas-doux)] pl-[5px]">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="m-0 w-[14px] h-[14px] accent-[var(--color-profond)]"
                />
                {t.daily.recurring}
              </label>
              <select
                className="w-full bg-[var(--field-bg)] border-0 px-[15px] py-[12px] rounded-xl text-[var(--color-profond)] shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-none box-border"
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
          className="bg-[var(--field-bg)] border-0 px-[15px] py-[12px] rounded-xl text-[var(--color-profond)] shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-none box-border resize-none min-h-[120px] flex-1 w-full resize-none p-[25px] text-[1.1rem] leading-[1.6] box-border"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.write.placeholder}
        />

        <div className="flex items-center justify-center gap-[12px]">
          {recordingUrl ? (
            <div className="flex w-full items-center gap-[10px]">
              <div className="flex-1 min-w-0 min-h-0">
                <AudioPlayer src={recordingUrl} compact />
              </div>
              <button
                className="border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5 shrink-0 text-[0.85rem] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={clearRecording}
              >
                {t.write.audioRemove}
              </button>
            </div>
          ) : (
            <button
              className={`border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 flex items-center gap-[8px] text-[0.95rem] ease-[ease] disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording
                  ? 'text-white! bg-[var(--color-rose-poudre)]! animate-[recorderPulse_1.2s_ease-in-out_infinite]'
                  : 'hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5'
              }`}
              onClick={toggleRecording}
              disabled={isUploading}
            >
              {isRecording
                ? `${t.write.audioStop} ${formatRecordTime(recordingTime)}`
                : t.write.audioRecord}
            </button>
          )}
          {isUploading && (
            <span className="text-[0.85rem] opacity-80 text-[var(--color-lilas-doux)]">
              {t.write.audioUploading}
            </span>
          )}
        </div>

        <div className="flex justify-end gap-[15px] mt-auto">
          <button
            onClick={onBack}
            className="border-0 rounded-xl px-[18px] py-[10px] font-semibold text-[var(--color-lilas-doux)] cursor-pointer bg-[var(--card-bg)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 hover:bg-[var(--color-rose-poudre)] hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5 min-w-[140px] px-[20px] py-[12px] text-[1rem]"
          >
            {t.write.btnCancel}
          </button>
          <button
            onClick={handleSend}
            className="bg-[var(--color-lilas-vif)] text-white border-0 px-[25px] py-[12px] rounded-[15px] font-bold cursor-pointer transition-all duration-200 enabled:hover:brightness-[1.15] enabled:hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] px-[20px] py-[12px] text-[1rem]"
            disabled={isUploading}
          >
            {t.write.btnSave}
          </button>
        </div>
      </div>
    </div>
  )
}
