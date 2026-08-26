export function ProfilePlaceholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="account-panel">
      <p className="activate-crumb">Главная / Мой аккаунт / {title}</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-text">{text}</p>
    </div>
  )
}
