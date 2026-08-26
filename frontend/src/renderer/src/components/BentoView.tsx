import '../assets/BentoView.css'
import { useState, useEffect, JSX, useCallback } from 'react'
import { DailyView } from './DailyView'
import { CalendarWidget } from './CalendarWidget'
import { MoodWidget } from './MoodWidget'
import { api, SpotifyTrack } from '../services'
import { useUser } from './UserContext'

export function BentoView(): JSX.Element {
  const [mainView, setMainView] = useState<'daily' | 'calendar'>('daily')
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
      icon: <span className="api-icon-text">🌍</span>,
      label: t.bento.weather,
      value: (
        <div
          style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{weatherIcon}</div>
            <div style={{ fontSize: '1rem', opacity: 0.8 }}>{t.bento.now}</div>
            <div style={{ fontWeight: 'bold' }}>{weatherToday}</div>
          </div>
          <div
            style={{
              width: '1px',
              height: '40px',
              backgroundColor: 'var(--color-lilas-doux)',
              opacity: 0.3
            }}
          ></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>📅</div>
            <div style={{ fontSize: '1rem', opacity: 0.8 }}>{t.bento.tmrw}</div>
            <div style={{ fontWeight: 'bold' }}>{weatherTomorrow}</div>
          </div>
        </div>
      )
    },
    {
      id: 'spotify',
      icon: (
        <div className="spotify-widget-visual">
          {spotifyData.albumImageUrl ? (
            <img src={spotifyData.albumImageUrl} className="album-cover" alt="album" />
          ) : (
            <span className="api-icon-text">{spotifyData.isPlaying ? '🎧' : '🎵'}</span>
          )}
        </div>
      ),
      value: (
        <div className="spotify-display">
          <div className="spotify-text-details">
            <div className="spotify-artist">{spotifyData.artist || t.bento.spotify}</div>
            <div className="track-info-scroll-container">
              <div className="track-info-scroll">{spotifyData.title || t.bento.notPlaying}</div>
            </div>
          </div>

          {spotifyData.message?.includes('Aucun compte') ? (
            <button className="soft-btn-mini" onClick={handleConnectSpotify}>
              {t.bento.connect}
            </button>
          ) : (
            <div className="spotify-controls">
              <button onClick={() => handleSpotifyAction('prev')} className="ctrl-btn">
                ⏮️
              </button>
              <button
                onClick={() => handleSpotifyAction(spotifyData.isPlaying ? 'pause' : 'play')}
                className="ctrl-btn main-play"
              >
                {spotifyData.isPlaying ? '⏸️' : '▶️'}
              </button>
              <button onClick={() => handleSpotifyAction('next')} className="ctrl-btn">
                ⏭️
              </button>
            </div>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="bento-grid">
      <div className="soft-ui main-card" style={{ position: 'relative', overflow: 'visible' }}>
        <button
          className="layout-btn switch-view-daily"
          onClick={() => setMainView(mainView === 'daily' ? 'calendar' : 'daily')}
          title={mainView === 'daily' ? 'Calendrier' : 'Liste'}
        >
          {mainView === 'daily' ? '📆' : '📋'}
        </button>

        {mainView === 'daily' ? <DailyView /> : <CalendarWidget />}
      </div>
      <div className="sidebar">
        <MoodWidget />
        <div className="soft-ui widget-card api-slider-container">
          <button
            className="api-nav-side-btn left"
            onClick={() =>
              setApiIndex((prev) => (prev - 1 + apiWidgets.length) % apiWidgets.length)
            }
          >
            ‹
          </button>
          <div className="api-content-box">
            <div className="api-visual-area">{apiWidgets[apiIndex].icon}</div>
            <div className="api-text-area">
              <div className="api-value-container">{apiWidgets[apiIndex].value}</div>
              <small className="api-label">{apiWidgets[apiIndex].label}</small>
            </div>
          </div>
          <button
            className="api-nav-side-btn right"
            onClick={() => setApiIndex((prev) => (prev + 1) % apiWidgets.length)}
          >
            ›
          </button>
          <div className="api-dots-absolute">
            {apiWidgets.map((_, i) => (
              <div key={i} className={`api-dot ${i === apiIndex ? 'active' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
