import type { Season } from '../types'

export interface SeasonLook {
  grass: string
  meadow: string
  hill: string
  hillDark: string
  bladeA: string
  bladeB: string
  canopy: string
  canopyMid: string
  canopyDark: string
  canopyLight: string
  bush: string
  bushMid: string
  bushDark: string
  /** Tree foliage fullness: spring buds < summer lush < autumn still full; winter near 0. */
  canopyScale: number
  showSnow: boolean
  waterDeep: string
  waterShallow: string
  sand: string
  untilled: string
}

export const SEASON_LOOK: Record<Season, SeasonLook> = {
  spring: {
    grass: '#8fc968',
    meadow: '#a8db7a',
    hill: '#7cbc62',
    hillDark: '#6aad55',
    bladeA: '#9ad86a',
    bladeB: '#78c050',
    canopy: '#9ad86a',
    canopyMid: '#b8e888',
    canopyDark: '#6ab048',
    canopyLight: '#c8f098',
    bush: '#7cc858',
    bushMid: '#96d86e',
    bushDark: '#5aa840',
    canopyScale: 0.55,
    showSnow: false,
    waterDeep: '#3a7fa0',
    waterShallow: '#5aadc0',
    sand: '#ead8b0',
    untilled: '#8a6a4e',
  },
  summer: {
    grass: '#4f9a52',
    meadow: '#5cad5a',
    hill: '#3f8a48',
    hillDark: '#347a40',
    bladeA: '#4f9a55',
    bladeB: '#3d8248',
    canopy: '#2f9a48',
    canopyMid: '#3aad54',
    canopyDark: '#1f7a38',
    canopyLight: '#48b860',
    bush: '#2f8a40',
    bushMid: '#3fa050',
    bushDark: '#246834',
    canopyScale: 1.08,
    showSnow: false,
    waterDeep: '#2f6f96',
    waterShallow: '#4a9bb8',
    sand: '#e8d5a8',
    untilled: '#8a6a4e',
  },
  autumn: {
    grass: '#9a9a4a',
    meadow: '#b0a858',
    hill: '#8a8a42',
    hillDark: '#7a7438',
    bladeA: '#b8a848',
    bladeB: '#8a8438',
    canopy: '#d47828',
    canopyMid: '#e89838',
    canopyDark: '#a84818',
    canopyLight: '#f0b848',
    bush: '#c86828',
    bushMid: '#d88838',
    bushDark: '#8a4418',
    canopyScale: 0.92,
    showSnow: false,
    waterDeep: '#3a6888',
    waterShallow: '#5a8aa0',
    sand: '#e0c898',
    untilled: '#7a5a40',
  },
  winter: {
    grass: '#d0d8d0',
    meadow: '#e4ebe4',
    hill: '#c8d0c8',
    hillDark: '#b0bcb4',
    bladeA: '#c8d0c0',
    bladeB: '#a8b4a8',
    canopy: '#e8eef2',
    canopyMid: '#f4f8fa',
    canopyDark: '#c8d0d8',
    canopyLight: '#ffffff',
    bush: '#8a7a68',
    bushMid: '#a09080',
    bushDark: '#6a5a4a',
    canopyScale: 0.18,
    showSnow: true,
    waterDeep: '#4a6888',
    waterShallow: '#7aa0b8',
    sand: '#e8e4d8',
    untilled: '#6a5a50',
  },
}

export function seasonLook(season: Season): SeasonLook {
  return SEASON_LOOK[season]
}
