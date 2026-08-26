const items = [
  { name: 'Mono Default', status: 'Активен' },
  { name: 'Carbon', status: 'Скоро' },
  { name: 'Ivory', status: 'Скоро' },
]

export function CosmeticsPage() {
  return (
    <div className="account-panel">
      <p className="activate-crumb">Главная / Мой аккаунт / Косметика</p>
      <h1 className="page-title">Косметика</h1>
      <p className="page-text">Визуальные пакеты и оформление клиента.</p>
      <div className="hub-cards">
        {items.map((item) => (
          <article key={item.name} className="lib-card">
            <p className="hub-card-title">{item.name}</p>
            <p className="page-text">{item.status}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
