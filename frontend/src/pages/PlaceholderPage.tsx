interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="panel flex-1 p-8">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-50">{title}</h1>
      <p className="mt-2 text-sm text-zinc-400">Раздел будет подключён в следующих спринтах.</p>
    </section>
  )
}
