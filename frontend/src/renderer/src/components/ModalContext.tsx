import { createContext, useContext, useState, JSX, ReactNode } from 'react'
import { Modal } from './Modal'

interface ModalOptions {
  title: string
  message: string
  type?: 'alert' | 'confirm'
  onConfirm?: () => void
  onCancel?: () => void
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void
  hideModal: () => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ModalOptions>({
    title: '',
    message: '',
    type: 'alert'
  })

  const showModal = (options: ModalOptions): void => {
    setConfig(options)
    setIsOpen(true)
  }

  const hideModal = (): void => {
    setIsOpen(false)
  }

  const handleConfirm = (): void => {
    if (config.onConfirm) config.onConfirm()
    hideModal()
  }

  const handleCancel = (): void => {
    if (config.onCancel) config.onCancel()
    hideModal()
  }

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      <Modal
        isOpen={isOpen}
        title={config.title}
        message={config.message}
        type={config.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ModalContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
