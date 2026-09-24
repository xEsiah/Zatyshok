import { JSX, ReactNode } from 'react'
import { LayoutMode } from '../../types'

interface ViewLayoutProps {
  variant: LayoutMode
  main: ReactNode
  side?: ReactNode
  className?: string
}

const MULTI_CLASSES =
  'grid-cols-[2fr_1fr] max-[1350px]:flex max-[1350px]:flex-col max-[1350px]:items-stretch max-[1350px]:h-auto max-[1350px]:min-h-0'
const MAIN_CLASSES =
  'col-start-1 min-w-0 min-h-0 flex flex-col w-full max-[1350px]:w-full max-[1350px]:h-auto max-[1350px]:shrink-0'

export function ViewLayout({ variant, main, side, className }: ViewLayoutProps): JSX.Element {
  if (variant === 'single') {
    return (
      <div
        key="single"
        className={`grid grid-cols-1 grid-rows-[1fr] gap-[2.5vw] w-[95%] h-full min-h-full pb-[2vh] box-border max-[1350px]:shrink-0 ${className ?? ''}`}
      >
        <div className={MAIN_CLASSES}>{main}</div>
      </div>
    )
  }
  return (
    <div
      key={variant}
      className={`grid gap-[2.5vw] w-[95%] h-full min-h-full pb-[2vh] box-border max-[1350px]:shrink-0 ${MULTI_CLASSES} ${className ?? ''}`}
    >
      <div className={MAIN_CLASSES}>{main}</div>
      <div className="col-start-2 flex flex-col items-stretch min-w-0 min-h-0 w-full gap-[2.5vw] max-[1350px]:gap-0 max-[1350px]:w-full max-[1350px]:h-auto">
        {side}
      </div>
    </div>
  )
}
