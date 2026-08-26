import { Button } from '../Common/Button'

const LAUNCHER_URL = 'https://cdn-files.aspectvisuals.su/launcher/AspectVisualsSetup.exe'

const steps = [
  {
    title: 'Скачайте и запустите лаунчер',
    text: 'Нажмите кнопку «Скачать лаунчер» и сохраните файл. При первом запуске все необходимые файлы скачаются автоматически.',
  },
  {
    title: 'Войдите в аккаунт',
    text: 'Лаунчер откроет страницу авторизации. Авторизируйтесь в свой аккаунт Aspect.',
  },
  {
    title: 'Выберите версию и играйте',
    text: 'Введите никнейм, выберите нужную версию Minecraft и нажмите Play.',
  },
]

export function DownloadClient() {
  return (
    <div className="account-panel download-client">
      <p className="activate-crumb">Главная / Мой аккаунт / Скачать клиент</p>
      <h1 className="page-title">Как установить</h1>
      <ol className="install-steps">
        {steps.map((step, index) => (
          <li key={step.title} className="install-step">
            <span className="install-num">{index + 1}</span>
            <div>
              <h2>{step.title}</h2>
              <p className="page-text">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Button
        onClick={() => {
          window.open(LAUNCHER_URL, '_blank', 'noopener,noreferrer')
        }}
      >
        Скачать лаунчер
      </Button>
    </div>
  )
}
