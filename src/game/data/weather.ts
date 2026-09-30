import { MINUTES_PER_DAY, type Season } from '../types'

export type WeatherKind = 'clear' | 'rain' | 'snow'

export interface SeasonWeatherConfig {
  /** 降水形态 */
  precip: 'rain' | 'snow'
  /** 两场之间晴天间隔（游戏分钟）——刻意拉长 */
  gapMin: number
  gapMax: number
  /** 单场持续（游戏分钟） */
  durMin: number
  durMax: number
}

/**
 * 季节降水：间隔偏长（约 1.5～3.5 天一场）。
 * 春常雨 · 夏少而短 · 秋多雨 · 冬雪。
 */
export const WEATHER_BY_SEASON: Record<Season, SeasonWeatherConfig> = {
  spring: {
    precip: 'rain',
    gapMin: 40 * 60,
    gapMax: 58 * 60,
    durMin: 2 * 60,
    durMax: 3.5 * 60,
  },
  summer: {
    precip: 'rain',
    gapMin: 64 * 60,
    gapMax: 90 * 60,
    durMin: 1.25 * 60,
    durMax: 2.5 * 60,
  },
  autumn: {
    precip: 'rain',
    gapMin: 32 * 60,
    gapMax: 48 * 60,
    durMin: 2.5 * 60,
    durMax: 4 * 60,
  },
  winter: {
    precip: 'snow',
    gapMin: 52 * 60,
    gapMax: 78 * 60,
    durMin: 3 * 60,
    durMax: 5.5 * 60,
  },
}

export function absoluteGameMinute(day: number, minuteOfDay: number): number {
  return (Math.max(1, day) - 1) * MINUTES_PER_DAY + minuteOfDay
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * Math.max(0, max - min)
}

export function rollPrecipDuration(season: Season): number {
  const c = WEATHER_BY_SEASON[season]
  return Math.floor(randBetween(c.durMin, c.durMax))
}

/** 从「现在」起再隔多久开始下一场 */
export function rollClearGap(season: Season): number {
  const c = WEATHER_BY_SEASON[season]
  return Math.floor(randBetween(c.gapMin, c.gapMax))
}

export function precipKindForSeason(season: Season): 'rain' | 'snow' {
  return WEATHER_BY_SEASON[season].precip
}

export function isPrecipitating(weather: WeatherKind): boolean {
  return weather === 'rain' || weather === 'snow'
}

export function weatherLabel(weather: WeatherKind): string {
  switch (weather) {
    case 'rain':
      return '下雨'
    case 'snow':
      return '下雪'
    default:
      return '晴'
  }
}

/** 雨停后出现彩虹的概率（下雪不停出） */
export const RAINBOW_CHANCE = 0.4

/** 彩虹持续（游戏分钟） */
export function rollRainbowDuration(): number {
  return Math.floor(randBetween(50, 100))
}

/** 白天才出彩虹（约 6–17 点） */
export function canSpawnRainbow(minuteOfDay: number): boolean {
  const h = minuteOfDay / 60
  return h >= 6 && h < 17
}

/** 雨刚停时掷一次：成功则返回持续分钟，否则 0 */
export function rollRainbowAfterRain(minuteOfDay: number): number {
  if (!canSpawnRainbow(minuteOfDay)) return 0
  if (Math.random() >= RAINBOW_CHANCE) return 0
  return rollRainbowDuration()
}
