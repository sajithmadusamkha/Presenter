import { useEffect, useState } from 'react'
import type { SlidePayload } from '../../../shared/ipc-channels'

type DisplayState = 'idle' | 'slide' | 'blank'

export default function App(): JSX.Element {
  const [displayState, setDisplayState] = useState<DisplayState>('idle')
  const [slide, setSlide] = useState<SlidePayload | null>(null)

  useEffect(() => {
    const removeSlide = window.presenterOutput.onSlideUpdate((payload) => {
      setSlide(payload)
      setDisplayState('slide')
    })

    const removeBlank = window.presenterOutput.onBlank(() => {
      setDisplayState('blank')
    })

    const removeClear = window.presenterOutput.onClear(() => {
      setSlide(null)
      setDisplayState('idle')
    })

    return () => {
      removeSlide()
      removeBlank()
      removeClear()
    }
  }, [])

  if (displayState === 'idle' || displayState === 'blank') {
    return <div className="h-screen w-screen bg-black" />
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-black">
      {slide?.imagePath && (
        <img
          src={slide.imagePath}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.4 }}
        />
      )}
      <div className="relative z-10 max-w-4xl px-16 text-center">
        <h1 className="text-6xl font-bold leading-tight text-white">{slide?.title}</h1>
        {slide?.body && (
          slide.body.trimStart().startsWith('<') ? (
            <div
              className="mt-6 text-3xl font-light leading-relaxed text-white/80 slide-body"
              dangerouslySetInnerHTML={{ __html: slide.body }}
            />
          ) : (
            <p className="mt-6 text-3xl font-light leading-relaxed text-white/80">{slide.body}</p>
          )
        )}
      </div>
    </div>
  )
}
