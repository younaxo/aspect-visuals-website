const configs = [
  { name: 'FPS Boost', desc: 'Лёгкий профиль под слабые ПК' },
  { name: 'Cinematic', desc: 'Максимум теней и объёма' },
  { name: 'PvP Clean', desc: 'Чистая картинка без лишнего' },
]

export function ConfigsPage() {
  return (
    <div className="account-panel">
      <p className="activate-crumb">Главная / Мой аккаунт / Конфиги</p>
      <h1 className="page-title">Конфиги</h1>
      <p className="page-text">Готовые пресеты графики для клиента Aspect Visuals.</p>
      <div className="hub-cards">
        {configs.map((item) => (
          <article key={item.name} className="lib-card">
            <p className="hub-card-title">{item.name}</p>
            <p className="page-text">{item.desc}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
