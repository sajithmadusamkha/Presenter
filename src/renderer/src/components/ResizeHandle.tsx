import { useCallback, useRef } from 'react'

interface Props {
  onDrag: (delta: number) => void
  direction?: 'horizontal' | 'vertical'
}

export default function ResizeHandle({ onDrag, direction = 'horizontal' }: Props): JSX.Element {
  const dragging = useRef(false)
  const lastPos = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY

      const onMouseMove = (ev: MouseEvent): void => {
        if (!dragging.current) return
        const pos = direction === 'horizontal' ? ev.clientX : ev.clientY
        onDrag(pos - lastPos.current)
        lastPos.current = pos
      }

      const onMouseUp = (): void => {
        dragging.current = false
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [onDrag, direction]
  )

  const isH = direction === 'horizontal'

  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative flex-shrink-0 select-none"
      style={{
        width: isH ? 5 : '100%',
        height: isH ? '100%' : 5,
        cursor: isH ? 'col-resize' : 'row-resize',
        backgroundColor: 'var(--color-border)'
      }}
    >
      {/* Wider invisible hit area */}
      <div
        className="absolute"
        style={{
          inset: isH ? '0 -3px' : '-3px 0',
          zIndex: 10
        }}
      />
      {/* Highlight on hover */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: 'var(--color-accent)' }}
      />
    </div>
  )
}
