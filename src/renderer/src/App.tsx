import { useState } from 'react'
import Sidebar, { type View } from './components/Sidebar'
import ScheduleArea from './components/ScheduleArea'
import PreviewPanel from './components/PreviewPanel'
import BottomBar from './components/BottomBar'
import StatusBar from './components/StatusBar'
import LibraryView from './components/LibraryView'

export interface Slide {
  id: string
  title: string
  body: string
  imagePath?: string
}

const DEMO_SLIDES: Slide[] = [
  { id: '1', title: 'Welcome', body: 'Good morning and welcome to our service.' },
  { id: '2', title: 'Announcements', body: 'Community lunch this Sunday after service.' },
  { id: '3', title: 'Opening Prayer', body: 'Let us bow our heads and pray together.' },
  { id: '4', title: 'Worship Song 1', body: '"How Great Thou Art" — Hymn 45' },
  { id: '5', title: 'Sermon', body: 'The Road Less Traveled — Matthew 7:13-14' },
  { id: '6', title: 'Closing', body: 'Thank you for joining us. Go in peace.' }
]

type OutputState = 'idle' | 'live' | 'blank'

export default function App(): JSX.Element {
  const [view, setView] = useState<View>('schedule')
  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(DEMO_SLIDES[0])
  const [liveSlide, setLiveSlide] = useState<Slide | null>(null)
  const [outputState, setOutputState] = useState<OutputState>('idle')
  const [warning, setWarning] = useState<string | null>(null)

  const showWarning = (msg: string): void => {
    setWarning(msg)
    setTimeout(() => setWarning(null), 4000)
  }

  const handleGoLive = async (): Promise<void> => {
    if (!selectedSlide) return
    const result = await window.presenterControl.goLive({
      id: selectedSlide.id,
      title: selectedSlide.title,
      body: selectedSlide.body,
      imagePath: selectedSlide.imagePath
    })
    if (!result.success) {
      showWarning('No external display detected — connect a second screen to go live.')
      return
    }
    setLiveSlide(selectedSlide)
    setOutputState('live')
  }

  const handleBlank = async (): Promise<void> => {
    if (outputState === 'blank') {
      if (liveSlide) {
        const result = await window.presenterControl.goLive({
          id: liveSlide.id,
          title: liveSlide.title,
          body: liveSlide.body,
          imagePath: liveSlide.imagePath
        })
        if (result.success) {
          setOutputState('live')
        } else {
          showWarning('No external display detected — connect a second screen to go live.')
          setLiveSlide(null)
          setOutputState('idle')
        }
      } else {
        await window.presenterControl.clear()
        setOutputState('idle')
      }
    } else {
      await window.presenterControl.blank()
      setOutputState('blank')
    }
  }

  const handleClear = async (): Promise<void> => {
    await window.presenterControl.clear()
    setLiveSlide(null)
    setOutputState('idle')
  }

  return (
    <div
      className="flex h-screen flex-col"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <div className="flex flex-1 overflow-hidden">
        <Sidebar view={view} onViewChange={setView} />

        {view === 'library' ? (
          <LibraryView />
        ) : (
          <>
            <ScheduleArea
              slides={DEMO_SLIDES}
              selectedSlide={selectedSlide}
              liveSlide={liveSlide}
              onSelect={setSelectedSlide}
            />
            <PreviewPanel selectedSlide={selectedSlide} liveSlide={liveSlide} />
          </>
        )}
      </div>

      <BottomBar
        outputState={outputState}
        hasSelection={!!selectedSlide}
        onGoLive={handleGoLive}
        onBlank={handleBlank}
        onClear={handleClear}
      />
      <StatusBar outputState={outputState} liveSlide={liveSlide} warning={warning} />
    </div>
  )
}
