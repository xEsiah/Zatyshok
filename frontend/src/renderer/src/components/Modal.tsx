import '../assets/Modal.css'
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
    <div className="modal-overlay">
      <div className="soft-ui modal-content">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          {type === 'confirm' && onCancel && (
            <button className="soft-btn" onClick={onCancel}>
              Noppp !
            </button>
          )}
          <button className="soft-btn active" onClick={onConfirm}>
            {type === 'confirm' ? 'Yep, next !' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
