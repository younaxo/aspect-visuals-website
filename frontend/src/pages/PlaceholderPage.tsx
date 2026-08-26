interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="content-panel">
      <p className="eyebrow">Aspect Visuals</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-text">Раздел будет подключён в следующих спринтах.</p>
    </section>
  )
}
