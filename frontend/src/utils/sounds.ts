let clickAudio: HTMLAudioElement | null = null
let hoverAudio: HTMLAudioElement | null = null
let clickLockUntil = 0
let hoverLockUntil = 0

function getClick() {
  if (!clickAudio) {
    clickAudio = new Audio('/sounds/click.mp3')
    clickAudio.preload = 'auto'
    clickAudio.volume = 0.2
  }
  return clickAudio
}

function getHover() {
  if (!hoverAudio) {
    hoverAudio = new Audio('/sounds/hover.mp3')
    hoverAudio.preload = 'auto'
    hoverAudio.volume = 0.12
  }
  return hoverAudio
}

function soundsOn() {
  return document.documentElement.dataset.sound !== 'off'
}

export function playClick() {
  if (!soundsOn()) return
  const now = Date.now()
  if (now < clickLockUntil) return
  clickLockUntil = now + 80
  try {
    const node = getClick().cloneNode() as HTMLAudioElement
    node.volume = 0.2
    void node.play().catch(() => undefined)
  } catch {
    // ignore autoplay restrictions
  }
}

export function playHover() {
  if (!soundsOn()) return
  const now = Date.now()
  if (now < hoverLockUntil) return
  hoverLockUntil = now + 60
  try {
    const node = getHover().cloneNode() as HTMLAudioElement
    node.volume = 0.12
    void node.play().catch(() => undefined)
  } catch {
    // ignore
  }
}

export function bindSiteSounds() {
  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target?.closest('button, a, [role="button"], .interactive, .shop-filter, .shop-lib-btn, .auth-tab, .nav-item')) {
      return
    }
    playClick()
  }
  const onOver = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    if (!target?.closest('button, a, [role="button"], .interactive, .shop-filter, .shop-lib-btn, .auth-tab')) {
      return
    }
    playHover()
  }
  document.addEventListener('click', onClick, true)
  document.addEventListener('mouseover', onOver, true)
  return () => {
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('mouseover', onOver, true)
  }
}
