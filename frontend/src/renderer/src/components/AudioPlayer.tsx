import { JSX, useEffect, useRef, useState } from 'react'
import { API_URL } from '../services/apiClient'

interface AudioPlayerProps {
  src: string
  compact?: boolean
}

const SPEEDS = [1, 1.5, 2]

const formatTime = (sec: number): string => {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function AudioPlayer({ src, compact = false }: AudioPlayerProps): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  const mediaSrc = src.startsWith('blob:') || src.startsWith('http') ? src : `${API_URL}/${src}`

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  const togglePlay = (): void => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      void audio.play()
    }
  }

  const cycleRate = (): void => {
    const idx = SPEEDS.indexOf(rate)
    setRate(SPEEDS[(idx + 1) % SPEEDS.length])
  }

  return (
    <div
      className={`flex w-full items-center rounded-xl bg-bg text-profond shadow-[inset_2px_2px_5px_var(--shadow-dark),inset_-2px_-2px_5px_var(--shadow-light)] ${
        compact ? 'mt-1 gap-1.5 px-2 py-1.25' : 'mt-1.5 gap-2 p-[8px_10px]'
      }`}
    >
      <audio
        ref={audioRef}
        src={mediaSrc}
        preload="metadata"
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        className="shrink-0 border-none bg-none text-[0.9rem] leading-none rounded-lg cursor-pointer text-profond transition-transform duration-200 hover:scale-115"
        onClick={togglePlay}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <input
        className="flex-1 min-w-0 h-1 cursor-pointer accent-lilas"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={current}
        onChange={(e) => {
          const val = parseFloat(e.target.value)
          setCurrent(val)
          if (audioRef.current) audioRef.current.currentTime = val
        }}
      />
      <span
        className={`shrink-0 text-[0.7rem] opacity-80 whitespace-nowrap text-profond ${compact ? 'hidden' : ''}`}
      >
        {formatTime(current)} / {formatTime(duration)}
      </span>
      <button
        className="shrink-0 border-none bg-card text-[0.7rem] font-bold px-1.5 py-0.5 rounded-lg cursor-pointer text-profond shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)] transition-transform duration-200 hover:scale-115"
        onClick={cycleRate}
      >
        {rate}x
      </button>
    </div>
  )
}
