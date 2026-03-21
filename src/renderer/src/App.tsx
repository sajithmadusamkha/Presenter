import { useState, useCallback, useRef } from 'react'
import Toolbar from './components/Toolbar'
import ScheduleArea from './components/ScheduleArea'
import PreviewPanel from './components/PreviewPanel'
import LibraryView from './components/LibraryView'
import ResizeHandle from './components/ResizeHandle'
import SongEditor from './components/SongEditor'

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

// ── Editor window mode ────────────────────────────────────────────────────────
// When loaded with ?editor=new → blank new-song editor (creates on OK)
// When loaded with ?editor=<id> → edit existing song
const editorParam = new URLSearchParams(window.location.search).get('editor')
const isEditorWindow = editorParam !== null
const editorSongId: number | null = editorParam && editorParam !== 'new'
  ? parseInt(editorParam, 10)
  : null

function EditorWindow(): JSX.Element {
  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      <SongEditor
        songId={editorSongId}
        onDeleted={() => window.close()}
      />
    </div>
  )
}

// Column / panel size constraints
const SCHEDULE_MIN = 160
const SCHEDULE_MAX = 400
const RIGHT_MIN = 200
const RIGHT_MAX = 500
const BOTTOM_MIN = 120
const BOTTOM_MAX = 600
const RIGHT_SPLIT_MIN = 0.2   // LiveSelect gets at least 20% of right column height
const RIGHT_SPLIT_MAX = 0.8

export default function App(): JSX.Element {
  if (isEditorWindow) return <EditorWindow />
  // ── Output state ─────────────────────────────────────────────────────────
  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(DEMO_SLIDES[0])
  const [liveSlide, setLiveSlide] = useState<Slide | null>(null)
  const [outputState, setOutputState] = useState<OutputState>('idle')
  const [warning, setWarning] = useState<string | null>(null)

  // ── Layout sizes (px) ─────────────────────────────────────────────────────
  const [scheduleWidth, setScheduleWidth] = useState(220)
  const [rightWidth, setRightWidth] = useState(260)
  const [bottomHeight, setBottomHeight] = useState(280)
  // Fraction of right column given to LiveSelectPanel (top); remainder = LiveOutputPanel
  const [rightSplitRatio, setRightSplitRatio] = useState(0.55)

  // Ref to the upper work area to get its height during right-split drag
  const upperAreaRef = useRef<HTMLDivElement>(null)

  // ── Resize handlers ───────────────────────────────────────────────────────
  const onScheduleDrag = useCallback((delta: number) => {
    setScheduleWidth((w) => Math.max(SCHEDULE_MIN, Math.min(SCHEDULE_MAX, w + delta)))
  }, [])

  const onRightDrag = useCallback((delta: number) => {
    setRightWidth((w) => Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, w - delta)))
  }, [])

  const onBottomDrag = useCallback((delta: number) => {
    setBottomHeight((h) => Math.max(BOTTOM_MIN, Math.min(BOTTOM_MAX, h - delta)))
  }, [])

  const onRightSplitDrag = useCallback((delta: number) => {
    const h = upperAreaRef.current?.clientHeight ?? 400
    setRightSplitRatio((r) =>
      Math.max(RIGHT_SPLIT_MIN, Math.min(RIGHT_SPLIT_MAX, r + delta / h))
    )
  }, [])

  // ── Output control ────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-screen select-none flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-base)' }}
    >
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <Toolbar
        outputState={outputState}
        hasSelection={!!selectedSlide}
        liveTitle={liveSlide?.title ?? null}
        warning={warning}
        onGoLive={handleGoLive}
        onBlank={handleBlank}
        onClear={handleClear}
      />

      {/* ── Upper work area (3 columns) ───────────────────────────────────── */}
      <div ref={upperAreaRef} className="flex min-h-0 flex-1 overflow-hidden">

        {/* Column 1: Schedule */}
        <div
          className="flex shrink-0 flex-col overflow-hidden"
          style={{ width: scheduleWidth }}
        >
          <ScheduleArea
            slides={DEMO_SLIDES}
            selectedSlide={selectedSlide}
            liveSlide={liveSlide}
            onSelect={setSelectedSlide}
          />
        </div>

        <ResizeHandle onDrag={onScheduleDrag} direction="horizontal" />

        {/* Column 2: Preview — takes all remaining space between col 1 and col 3 */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <PreviewPanel
            selectedSlide={selectedSlide}
            liveSlide={liveSlide}
            width={0}   // width prop unused when flex-1; kept for type compat
          />
        </div>

        <ResizeHandle onDrag={onRightDrag} direction="horizontal" />

        {/* Column 3: Right panel — Live Select (top) + Live Output (bottom) */}
        <div
          className="flex shrink-0 flex-col overflow-hidden border-l"
          style={{ width: rightWidth, borderColor: 'var(--color-border)' }}
        >
          {/* Live Select placeholder */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ flex: rightSplitRatio }}
          >
            <div
              className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-widest"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              Live Select
            </div>
            <div className="flex flex-1 items-center justify-center">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Phase 2
              </span>
            </div>
          </div>

          <ResizeHandle onDrag={onRightSplitDrag} direction="vertical" />

          {/* Live Output placeholder */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ flex: 1 - rightSplitRatio }}
          >
            <div
              className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-widest"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              Live Output
            </div>
            <div className="flex flex-1 items-center justify-center p-3">
              {/* Mini output thumbnail */}
              <div
                className="w-full overflow-hidden rounded"
                style={{ aspectRatio: '16 / 9', backgroundColor: '#000' }}
              >
                {liveSlide && outputState === 'live' && (
                  <div className="flex h-full flex-col items-center justify-center p-2 text-center">
                    <p className="text-xs font-bold leading-tight" style={{ color: '#fff' }}>
                      {liveSlide.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {liveSlide.body}
                    </p>
                  </div>
                )}
                {outputState === 'blank' && (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-xs" style={{ color: '#f59e0b' }}>BLANK</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Horizontal resizer between upper and bottom ───────────────────── */}
      <ResizeHandle onDrag={onBottomDrag} direction="vertical" />

      {/* ── Bottom panel: Library ─────────────────────────────────────────── */}
      <div
        className="shrink-0 overflow-hidden border-t"
        style={{ height: bottomHeight, borderColor: 'var(--color-border)' }}
      >
        <LibraryView />
      </div>
    </div>
  )
}
