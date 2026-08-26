import { useEffect } from 'react'
import { bindSiteSounds } from '../../utils/sounds'

export function SiteSounds() {
  useEffect(() => bindSiteSounds(), [])
  return null
}
