import { JSX } from 'react'
import { ViewLayout } from '../components/layout/ViewLayout'
import { BentoMainCard } from '../components/BentoMainCard'
import { MoodWidget } from '../components/MoodWidget'
import { ApiSlider } from '../components/ApiSlider'

export function DashboardPage(): JSX.Element {
  return (
    <ViewLayout
      variant="bento"
      main={<BentoMainCard />}
      side={
        <>
          <div className="grow-[2] shrink basis-0 min-h-0 flex flex-col w-full max-[1350px]:grow-0 max-[1350px]:shrink-0 max-[1350px]:basis-auto max-[1350px]:h-auto max-[1350px]:min-h-[26vh]">
            <MoodWidget />
          </div>
          <div className="grow shrink basis-0 min-h-0 flex flex-col w-full max-[1350px]:grow-0 max-[1350px]:shrink-0 max-[1350px]:basis-auto max-[1350px]:h-auto max-[1350px]:min-h-[25vh] max-[1350px]:mt-[2.5vw]">
            <ApiSlider />
          </div>
        </>
      }
    />
  )
}
