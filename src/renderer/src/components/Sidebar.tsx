export type View = 'schedule' | 'library'

interface Props {
  view: View
  onViewChange: (view: View) => void
}

export default function Sidebar({ view, onViewChange }: Props): JSX.Element {
  const navItems: { id: View; label: string }[] = [
    { id: 'schedule', label: 'Schedule' },
    { id: 'library', label: 'Song Library' }
  ]

  return (
    <div
      className="flex w-52 flex-shrink-0 flex-col border-r"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)'
      }}
    >
      <div
        className="border-b px-4 py-3 text-xs font-semibold uppercase tracking-widest"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        Presenter
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const isActive = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="w-full px-4 py-2 text-left text-sm transition-colors"
              style={{
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
                backgroundColor: isActive ? 'var(--color-bg-overlay)' : 'transparent'
              }}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
