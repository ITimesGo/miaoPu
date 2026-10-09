import {
  LEISURE_WHEN_FULL,
  LEISURE_WHEN_HALF,
  LEISURE_WHEN_LOW,
  LEISURE_WHEN_TIGHT,
  WORK_RESERVE_DAYS,
} from '../types'

export { WORK_RESERVE_DAYS }

/** 户外工休闲：低于约 N 日储备则几乎打满日限；半帽/满帽仍多摸鱼 */
export function survivalLeisureChance(
  stock: number,
  softCap: number,
  reserveNeed: number,
): number {
  if (softCap <= 0) return LEISURE_WHEN_LOW
  if (stock >= softCap) return LEISURE_WHEN_FULL
  if (stock < Math.max(1, Math.floor(reserveNeed))) return LEISURE_WHEN_TIGHT
  if (stock >= softCap * 0.5) return LEISURE_WHEN_HALF
  return LEISURE_WHEN_LOW
}

export function reserveNeedFor(dailyBurn: number): number {
  return Math.max(0, Math.floor(dailyBurn)) * WORK_RESERVE_DAYS
}
