import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [minimized, setMinimized] = useState(false)

  const handleMaximize = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen()
    } else {
      void document.exitFullscreen()
    }
  }

  if (minimized) {
    return (
      <button
        type="button"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-50"
        onClick={() => setMinimized(false)}
      >
        Aspect Visuals
      </button>
    )
  }

  return (
    <div className={`app ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Header
        onMinimize={() => setMinimized(true)}
        onMaximize={handleMaximize}
        onClose={() => setMinimized(true)}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        <main className="flex min-w-0 flex-1 flex-col bg-zinc-950">
          <div className="flex min-h-0 flex-1 flex-col p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
