/** Apple Color Emoji (Emojipedia / Apple) */
const APPLE_CDN = 'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64'

export const APPLE_EMOJI = {
  checkMark: `${APPLE_CDN}/2705.png`,
  crossMark: `${APPLE_CDN}/274c.png`,
  warning: `${APPLE_CDN}/26a0-fe0f.png`,
  information: `${APPLE_CDN}/2139-fe0f.png`,
  star: `${APPLE_CDN}/2b50.png`,
  whiteCircle: `${APPLE_CDN}/26aa.png`,
} as const
