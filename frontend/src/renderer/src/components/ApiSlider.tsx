import { useState, useEffect, JSX, useCallback } from 'react'
import { api, SpotifyTrack } from '../services'
import { useUser } from './UserContext'
import { Card } from './layout/Card'

export function ApiSlider(): JSX.Element {
  const [apiIndex, setApiIndex] = useState(0)
  const [weatherToday, setWeatherToday] = useState<string>('--°C')
  const [weatherTomorrow, setWeatherTomorrow] = useState<string>('--°C')
  const [weatherIcon, setWeatherIcon] = useState<string>('⛅')
  const [spotifyData, setSpotifyData] = useState<SpotifyTrack>({
    isPlaying: false,
    title: 'Not playing',
    artist: 'Spotify'
  })

  const { t } = useUser()

  const fetchSpotify = useCallback(async (): Promise<void> => {
    const data = await api.getSpotify()
    setSpotifyData(data)
  }, [])

  useEffect(() => {
    const fetchWeather = async (): Promise<void> => {
      const data = await api.getWeather()
      if (data && data.current) {
        setWeatherToday(`${Math.round(data.current.temp_c)}°`)
        setWeatherIcon(data.current.is_day ? '☀️' : '🌙')
        if (data.forecast && data.forecast.forecastday[1]) {
          const tmrw = data.forecast.forecastday[1].day
          setWeatherTomorrow(`${Math.round(tmrw.mintemp_c)}° / ${Math.round(tmrw.maxtemp_c)}°`)
        }
      }
    }
    fetchWeather()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSpotify()
    const interval = setInterval(fetchSpotify, 10000)
    return () => clearInterval(interval)
  }, [fetchSpotify])

  const handleSpotifyAction = async (action: 'play' | 'pause' | 'next' | 'prev'): Promise<void> => {
    try {
      if (action === 'next') await api.spotifyNext()
      if (action === 'prev') await api.spotifyPrevious()
      if (action === 'play') await api.spotifyPlay()
      if (action === 'pause') await api.spotifyPause()
      setTimeout(fetchSpotify, 500)
    } catch (err) {
      console.error('Spotify control error', err)
    }
  }

  const handleConnectSpotify = async (): Promise<void> => {
    const url = await api.getSpotifyLoginUrl()
    window.open(url, '_blank')
  }

  const apiWidgets = [
    {
      id: 'weather',
      icon: <span className="relative z-2 text-[1.8rem]">🌍</span>,
      label: t.bento.weather,
      value: (
        <div className="flex justify-center items-center gap-5">
          <div className="text-center">
            <div className="text-[1.2rem] mb-1.25">{weatherIcon}</div>
            <div className="text-[1rem] opacity-80">{t.bento.now}</div>
            <div className="font-bold">{weatherToday}</div>
          </div>
          <div className="w-px h-10 bg-lilas-doux opacity-30"></div>
          <div className="text-center">
            <div className="text-[1.2rem] mb-1.25">📅</div>
            <div className="text-[1rem] opacity-80">{t.bento.tmrw}</div>
            <div className="font-bold">{weatherTomorrow}</div>
          </div>
        </div>
      )
    },
    {
      id: 'spotify',
      icon: (
        <div className="size-18.75 rounded-[15px] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)] overflow-hidden flex items-center justify-center bg-card">
          {spotifyData.albumImageUrl ? (
            <img
              src={spotifyData.albumImageUrl}
              className="w-full h-full object-cover"
              alt="album"
            />
          ) : (
            <span className="relative z-2 text-[1.8rem]">
              {spotifyData.isPlaying ? '🎧' : '🎵'}
            </span>
          )}
        </div>
      ),
      value: (
        <div className="flex flex-col items-center">
          <div className="flex flex-col gap-0.5 w-full overflow-hidden text-center">
            <div className="font-bold text-[1.2rem] text-lilas">
              {spotifyData.artist || t.bento.spotify}
            </div>
            <div className="w-full overflow-hidden whitespace-nowrap">
              <div className="inline-block text-[0.85rem] opacity-80 font-medium animate-[scrollText_10s_linear_infinite]">
                {spotifyData.title || t.bento.notPlaying}
              </div>
            </div>
          </div>

          {spotifyData.message?.includes('Aucun compte') ? (
            <button
              className="w-full text-[0.8rem] rounded-[20px] bg-lilas-doux border-0 text-white"
              onClick={handleConnectSpotify}
            >
              {t.bento.connect}
            </button>
          ) : (
            <div className="mb-1.25 flex gap-3.75 justify-center items-center">
              <button
                onClick={() => handleSpotifyAction('prev')}
                className="bg-none border-none text-[1.4rem] p-1.25 text-profond hover:scale-120 transition-transform duration-100"
              >
                ⏮️
              </button>
              <button
                onClick={() => handleSpotifyAction(spotifyData.isPlaying ? 'pause' : 'play')}
                className="bg-none border-none text-[1.4rem] p-1.25 text-profond hover:scale-120 transition-transform duration-100"
              >
                {spotifyData.isPlaying ? '⏸️' : '▶️'}
              </button>
              <button
                onClick={() => handleSpotifyAction('next')}
                className="bg-none border-none text-[1.1rem] p-1.25 text-profond hover:scale-120 transition-transform duration-100"
              >
                ⏭️
              </button>
            </div>
          )}
        </div>
      )
    }
  ]

  return (
    <Card className="relative flex flex-col justify-center items-center text-center w-full flex-1 min-h-0 max-[1350px]:flex-none max-[1350px]:min-h-[25vh]">
      <button
        className="absolute top-1/2 -translate-y-1/2 size-7.5 rounded-full border-none bg-card text-lilas shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] z-10 flex items-center justify-center text-[1.2rem] transition-all duration-200 pb-0.5 hover:bg-rose hover:text-white hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] left-2.5"
        onClick={() => setApiIndex((prev) => (prev - 1 + apiWidgets.length) % apiWidgets.length)}
      >
        ‹
      </button>
      <div className="flex-1 flex flex-col justify-center items-center w-full gap-2">
        <div>{apiWidgets[apiIndex].icon}</div>
        <div>
          <div>{apiWidgets[apiIndex].value}</div>
          <small className="text-lilas-doux text-[0.8rem]">{apiWidgets[apiIndex].label}</small>
        </div>
      </div>
      <button
        className="absolute top-1/2 -translate-y-1/2 size-7.5 rounded-full border-none bg-card text-lilas shadow-[2px_2px_5px_var(--shadow-dark),-2px_-2px_5px_var(--shadow-light)] z-10 flex items-center justify-center text-[1.2rem] transition-all duration-200 pb-0.5 hover:bg-rose hover:text-white hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1)] right-2.5"
        onClick={() => setApiIndex((prev) => (prev + 1) % apiWidgets.length)}
      >
        ›
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {apiWidgets.map((_, i) => (
          <div
            key={i}
            className={`size-1.5 rounded-full bg-shadow-d transition-all duration-300 ${
              i === apiIndex ? 'bg-lilas' : ''
            }`}
          />
        ))}
      </div>
    </Card>
  )
}
