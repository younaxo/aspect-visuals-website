import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function MainLayout() {
  return (
    <div className="site">
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>Aspect Visuals</p>
      </footer>
    </div>
  )
}
