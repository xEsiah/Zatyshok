import { JSX, useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface DropdownOption {
  value: string
  label: string
}

type DropdownSize = 'default' | 'compact'

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  size?: DropdownSize
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  size = 'default'
}: DropdownProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  const isCompact = size === 'compact'
  const buttonPadding = isCompact ? 'px-2.5 py-1.5' : 'px-3.75 py-3'
  const buttonTextSize = isCompact ? 'text-[0.85rem]' : 'text-profund'
  const itemPadding = isCompact ? 'px-3 py-1.5' : 'px-3.5 py-2.5'
  const itemTextSize = isCompact ? 'text-[0.8rem]' : 'font-medium'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updatePosition = (): void => {
    if (buttonRef.current) {
      setDropdownRect(buttonRef.current.getBoundingClientRect())
    }
  }

  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  const selectedOption = options.find((o) => o.value === value)

  const dropdownContent = dropdownRect ? (
    <div
      className="fixed z-1000 max-h-50 flex-col gap-1 overflow-y-auto rounded-2xl bg-card p-2.5 shadow-[8px_8px_16px_var(--shadow-dark),-8px_-8px_16px_var(--shadow-light)] w-50"
      style={{
        top: dropdownRect.bottom + window.scrollY,
        left: dropdownRect.left + window.scrollX,
        width: dropdownRect.width,
        minWidth: 200
      }}
    >
      {placeholder && (
        <div
          className={`cursor-pointer rounded-lg ${itemPadding} ${itemTextSize} text-profund transition-all duration-200 ease-in-out hover:bg-bg hover:text-lilas hover:shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-4px_-4px_8px_var(--shadow-light)]`}
          onClick={() => {
            onChange('')
            setIsOpen(false)
          }}
        >
          {placeholder}
        </div>
      )}
      {options.map((option) => (
        <div
          key={option.value}
          className={`cursor-pointer rounded-lg ${itemPadding} ${itemTextSize} transition-all duration-200 ease-in-out hover:bg-bg hover:text-lilas hover:shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-4px_-4px_8px_var(--shadow-light)] ${value === option.value ? 'text-lilas bg-bg' : 'text-profund'}`}
          onClick={() => {
            onChange(option.value)
            setIsOpen(false)
          }}
        >
          {option.label}
        </div>
      ))}
    </div>
  ) : null

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      <div
        ref={buttonRef}
        className={`w-full bg-(--field-bg) border-0 ${buttonPadding} rounded-xl ${buttonTextSize} shadow-[inset_3px_3px_6px_var(--shadow-dark),inset_-3px_-3px_6px_var(--shadow-light)] outline-hidden box-border flex items-center justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={() => {
          if (!disabled) {
            updatePosition()
            setIsOpen(!isOpen)
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="truncate">{selectedOption?.label || placeholder || '--'}</span>
        <svg
          className="size-4.5 shrink-0 text-lilas-doux"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </div>

      {isOpen && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  )
}
