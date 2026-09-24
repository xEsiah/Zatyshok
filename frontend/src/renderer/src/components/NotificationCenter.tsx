import { JSX, useEffect, useState } from 'react'
import { useUser } from './UserContext'
import { PATCH_NOTES, isVersionNewer } from '../data/patchNotes'

const LAST_SEEN_KEY = 'last_seen_version'

export function NotificationCenter(): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [seenVersion, setSeenVersion] = useState<string>('')
  const { t } = useUser()

  useEffect(() => {
    window.api.getStoreValue(LAST_SEEN_KEY).then((value) => {
      setSeenVersion(typeof value === 'string' ? value : '')
    })
  }, [])

  const latestVersion = PATCH_NOTES[0]?.version ?? ''
  const hasUnread = PATCH_NOTES.some(
    (note) => !seenVersion || isVersionNewer(note.version, seenVersion)
  )

  const isNewNote = (version: string): boolean =>
    !seenVersion || (latestVersion !== '' && isVersionNewer(version, seenVersion))

  const handleOpen = (): void => {
    if (latestVersion) window.api.setStoreValue(LAST_SEEN_KEY, latestVersion)
    setIsOpen(true)
  }

  const handleClose = (): void => {
    setSeenVersion(latestVersion)
    setIsOpen(false)
  }

  return (
    <div className="relative flex items-center">
      <button
        className="relative cursor-pointer rounded-[10px] border-none bg-transparent p-[6px_10px] text-[1.3rem] transition-transform duration-200 ease-out hover:translate-y-[-1px]"
        onClick={handleOpen}
        title={t.notif.title}
      >
        🔔
        {hasUnread && (
          <span className="absolute right-[6px] top-[4px] h-[9px] w-[9px] rounded-full border-2 border-[var(--bg-color)] bg-[#e53935]" />
        )}
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-[990] flex items-start justify-end bg-[rgba(70,47,95,0.35)] p-[75px_24px_24px_24px] backdrop-blur-[3px]"
          onClick={handleClose}
        >
          <div
            className="bg-[var(--card-bg)] rounded-[var(--radius-bento)] shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-[var(--card-border)] transition-all duration-300 box-border flex max-h-[75vh] w-[380px] flex-col p-5 animate-[notifSlide_0.25s_ease-out] [-webkit-app-region:no-drag]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-[14px] flex items-center justify-between">
              <h3 className="m-0 text-[var(--color-lilas-vif)]">{t.notif.title}</h3>
              <button
                className="flex h-[35px] w-[35px] cursor-pointer items-center justify-center rounded-[8px] border-none bg-transparent shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] hover:translate-y-[-1px] hover:text-[var(--color-profond)] hover:shadow-[6px_6px_12px_var(--shadow-dark)]"
                onClick={handleClose}
              >
                ✖
              </button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto">
              {PATCH_NOTES.length === 0 && (
                <p className="py-5 text-center opacity-70">{t.notif.empty}</p>
              )}
              {PATCH_NOTES.map((note) => (
                <div
                  key={note.version}
                  className={`rounded-[14px] border bg-[var(--card-bg)] p-[14px] ${
                    isNewNote(note.version)
                      ? 'border-[var(--color-lilas-vif)]'
                      : 'border-[var(--color-lilas-doux)]'
                  }`}
                >
                  <div className="mb-[6px] flex items-center gap-2">
                    <span className="font-bold text-[var(--color-lilas-vif)]">v{note.version}</span>
                    <span className="text-[0.8rem] opacity-70">{note.date}</span>
                    {isNewNote(note.version) && (
                      <span className="rounded-[10px] bg-[var(--color-lilas-vif)] px-2 py-[2px] text-[0.65rem] font-bold tracking-[0.5px] text-white">
                        {t.notif.new}
                      </span>
                    )}
                  </div>
                  <h4 className="m-[4px_0_8px] text-[var(--color-profond)]">{note.title}</h4>
                  <ul className="m-0 pl-[18px] leading-[1.5] text-[var(--color-profond)]">
                    {note.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
