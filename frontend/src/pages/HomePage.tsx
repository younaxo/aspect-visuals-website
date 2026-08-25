export function HomePage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="panel flex min-h-0 flex-1 flex-col p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">Aspect Visuals</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">Главная страница</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Базовая инфраструктура готова: тёмная тема Apple Design, стеклянная морфология и каркас авторизации через Discord.
        </p>
        <div className="mt-8 min-h-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-black/40 p-4">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">Status</p>
          <div>
            <div className="term-line">
              <span className="text-zinc-600">ok</span> Frontend · Vite + React + Tailwind
            </div>
            <div className="term-line">
              <span className="text-zinc-600">ok</span> Backend · Express + Prisma
            </div>
            <div className="term-line">
              <span className="text-zinc-600">ok</span> Auth · Discord OAuth2 + JWT
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
