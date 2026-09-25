import { JSX } from 'react'

interface ModalProps {
  isOpen: boolean
  title: string
  message: string
  type?: 'alert' | 'confirm'
  onConfirm: () => void
  onCancel?: () => void
}

export function Modal({
  isOpen,
  title,
  message,
  type = 'alert',
  onConfirm,
  onCancel
}: ModalProps): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center bg-black/50 backdrop-blur-xs">
      <div className="bg-card rounded-(--radius-bento) shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] border border-(--card-border) transition-all duration-300 w-87.5 animate-[modalPop_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)] p-7.5 text-center [-webkit-app-region:no-drag]">
        <h3 className="mt-0 mb-3.75 text-2xl text-lilas">{title}</h3>
        <p className="mb-6.25 leading-[1.4] text-profond">{message}</p>

        <div className="flex justify-center gap-3.75">
          {type === 'confirm' && onCancel && (
            <button
              className="border-0 rounded-xl px-4.5 py-2.5 font-semibold text-lilas-doux cursor-pointer bg-card shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] transition-all duration-200 hover:bg-rose hover:text-white hover:shadow-[6px_6px_12px_var(--shadow-dark),-6px_-6px_12px_var(--shadow-light)] hover:-translate-y-0.5"
              onClick={onCancel}
            >
              Noppp !
            </button>
          )}
          <button
            className="border-0 rounded-xl px-4.5 py-2.5 font-semibold cursor-pointer bg-lilas text-white! shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15)] scale-96 hover:brightness-115 hover:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.25)]"
            onClick={onConfirm}
          >
            {type === 'confirm' ? 'Yep, next !' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
