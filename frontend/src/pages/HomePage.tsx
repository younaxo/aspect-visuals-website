import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AspectIcon, type FigmaIconName } from '../components/Common/FigmaIcons'

/*
 * Наполнение страницы взято из макета Aspect Visuals (страница GUI HUD):
 * модули и экраны названы так же, как в клиенте, иконки — те же, что лежат
 * в UI Kit. Раньше здесь стояли три общие карточки про подписки и Discord,
 * по которым нельзя было понять, что вообще показывает клиент.
 */

interface Module {
  name: string
  icon: FigmaIconName
  text: string
}

const HUD_MODULES: Module[] = [
  {
    name: 'Dynamic Island',
    icon: 'layout',
    text: 'Ник, пинг, FPS и TPS сервера одной строкой сверху.',
  },
  {
    name: 'Target HUD',
    icon: 'target',
    text: 'Карточка противника: ник, здоровье и его префикс на сервере.',
  },
  {
    name: 'Music Bar',
    icon: 'pause',
    text: 'Что играет в системном плеере, с обложкой и полосой прогресса.',
  },
  {
    name: 'Potions',
    icon: 'timer',
    text: 'Активные эффекты и сколько осталось до конца каждого.',
  },
  {
    name: 'Armor HUD',
    icon: 'shield',
    text: 'Прочность брони и того, что в руках, без открытия инвентаря.',
  },
  {
    name: 'Cooldowns',
    icon: 'timer',
    text: 'Откат перла, щита и еды — Pearl, Combat, Hunger.',
  },
  {
    name: 'Coordinates',
    icon: 'waypoints',
    text: 'X, Y, Z и направление, которые можно скинуть в чат одной кнопкой.',
  },
  {
    name: 'Keybinds',
    icon: 'command',
    text: 'Список включённых биндов клиента. Стандартные майнкрафтовские не показываются.',
  },
  {
    name: 'Totem Counter',
    icon: 'asterisk',
    text: 'Сколько тотемов осталось в инвентаре.',
  },
  {
    name: 'Chat',
    icon: 'send',
    text: 'Свой чат со временем сообщений и префиксами ролей.',
  },
  {
    name: 'Watermark',
    icon: 'logotype',
    text: 'Подпись клиента в углу экрана.',
  },
]

interface Screen {
  name: string
  icon: FigmaIconName
  text: string
  points: string[]
}

const SCREENS: Screen[] = [
  {
    name: 'Peek',
    icon: 'search',
    text: 'Быстрое меню модулей поверх игры.',
    points: ['Slider и LimitSlider', 'Boolean и Checkbox', 'Bind, Input, Dropdown', 'Color Picker'],
  },
  {
    name: 'Settings',
    icon: 'settings',
    text: 'Настройки клиента и раскладка HUD.',
    points: ['Перетаскивание модулей', 'Свой размер модуля', 'Смена клавиши открытия'],
  },
  {
    name: 'Friends',
    icon: 'handshake',
    text: 'Список друзей и чем они заняты.',
    points: ['Ник и подпись', 'Playing Minecraft 1.21.4', 'Since: дата добавления'],
  },
  {
    name: 'Waypoints',
    icon: 'waypoints',
    text: 'Точки на карте и метки смерти.',
    points: ['Name и Coordinates', 'Point color', 'Icons из набора'],
  },
  {
    name: 'Configs',
    icon: 'configs',
    text: 'Наборы настроек, которые можно переключать.',
    points: ['Name и Key', 'Public — делиться с другими', 'Дата последнего изменения'],
  },
]

export function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <p className="eyebrow">Minecraft 1.21.4</p>
        <h1 className="hero-title">Aspect Visuals</h1>
        <p className="hero-text">
          Визуальный клиент: HUD, свой чат, точки на карте и конфиги. Вход по email или Discord,
          подписка и ключи — на этом сайте, настройка — в игре.
        </p>
        <div className="hero-actions">
          <Link to="/shop" className="btn-primary">
            Магазин
          </Link>
          {!isAuthenticated && (
            <Link to="/login" className="btn-ghost">
              Войти
            </Link>
          )}
        </div>
      </section>

      <section className="content-panel" aria-labelledby="modules-title">
        <p className="eyebrow">HUD</p>
        <h2 className="page-title" id="modules-title">
          Модули на экране
        </h2>
        <p className="page-text">
          Каждый модуль включается отдельно, двигается мышью при открытом чате и меняет размер.
        </p>
        <ul className="module-grid">
          {HUD_MODULES.map((module) => (
            <li className="module-card" key={module.name}>
              <span className="module-icon">
                <AspectIcon name={module.icon} size={16} />
              </span>
              <div>
                <h3>{module.name}</h3>
                <p>{module.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="content-panel" aria-labelledby="screens-title">
        <p className="eyebrow">Клиент</p>
        <h2 className="page-title" id="screens-title">
          Экраны
        </h2>
        <p className="page-text">Открываются поверх игры, под ними затемнение, а под Peek — размытие.</p>
        <ul className="screen-grid">
          {SCREENS.map((screen) => (
            <li className="screen-card" key={screen.name}>
              <span className="module-icon">
                <AspectIcon name={screen.icon} size={16} />
              </span>
              <h3>{screen.name}</h3>
              <p>{screen.text}</p>
              <ul className="screen-points">
                {screen.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="feature-grid" aria-label="Аккаунт и покупки">
        <article className="feature-card">
          <h2>Подписки</h2>
          <p>Базовый и премиум доступ, ключи активации и тестовый день раз в три месяца.</p>
        </article>
        <article className="feature-card">
          <h2>Discord</h2>
          <p>Вход через Discord и синхронизация ролей сервера с аккаунтом на сайте.</p>
        </article>
        <article className="feature-card">
          <h2>Вход в клиент</h2>
          <p>Клиент показывает одноразовый код, вы подтверждаете его на сайте — пароль в игру не попадает.</p>
        </article>
      </section>
    </div>
  )
}
