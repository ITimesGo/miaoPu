import { DAYS_PER_SEASON, MINUTES_PER_DAY, type Season } from '../types'

/** 偶发事件：商船 / 丰收日 / 欠收日 */
export type EventKind = 'none' | 'merchant' | 'bountiful' | 'lean'

export interface GameEvent {
  kind: EventKind
  /** 绝对游戏分钟：事件结束 */
  until: number
  /** 绝对游戏分钟：下一场可触发 */
  nextAt: number
}

/** 一年 = 四季 × 每季天数 */
export const MINUTES_PER_YEAR = DAYS_PER_SEASON * 4 * MINUTES_PER_DAY

/** 商船停靠时长（白天为主） */
export const MERCHANT_DURATION_MIN = 4 * 60
export const MERCHANT_DURATION_MAX = 6 * 60

/** 丰收/欠收持续到当天结束附近 */
export const DAY_EVENT_LINGER = 10 * 60

export function emptyGameEvent(nextAt = 0): GameEvent {
  return { kind: 'none', until: 0, nextAt }
}

function randBetween(min: number, max: number): number {
  return min + Math.random() * Math.max(0, max - min)
}

/**
 * 偶发间隔（按年计）：
 * - 约 25%：年内多件（0.3～0.7 年）
 * - 约 45%：一年一件左右（0.8～1.4 年）
 * - 约 30%：几年一件（1.8～3.5 年）
 */
export function rollEventGap(): number {
  const y = MINUTES_PER_YEAR
  const roll = Math.random()
  if (roll < 0.25) return Math.floor(y * randBetween(0.3, 0.7))
  if (roll < 0.7) return Math.floor(y * randBetween(0.8, 1.4))
  return Math.floor(y * randBetween(1.8, 3.5))
}

export function rollMerchantDuration(): number {
  return Math.floor(randBetween(MERCHANT_DURATION_MIN, MERCHANT_DURATION_MAX))
}

/** 按季节抽事件（一次最多一件，由调度保证） */
export function rollEventKind(season: Season): Exclude<EventKind, 'none'> {
  const table: Array<Exclude<EventKind, 'none'>> =
    season === 'spring'
      ? ['merchant', 'merchant', 'bountiful', 'bountiful']
      : season === 'summer'
        ? ['merchant', 'bountiful', 'bountiful', 'lean']
        : season === 'autumn'
          ? ['merchant', 'bountiful', 'lean', 'lean']
          : ['merchant', 'lean', 'lean', 'bountiful']
  return table[Math.floor(Math.random() * table.length)]!
}

export function eventLabel(kind: EventKind): string {
  switch (kind) {
    case 'merchant':
      return '商船停靠'
    case 'bountiful':
      return '丰收日'
    case 'lean':
      return '欠收日'
    default:
      return '平静'
  }
}

/** HUD 红色醒目条 */
export function eventAlertText(kind: EventKind, season: Season): string {
  switch (kind) {
    case 'merchant':
      return '【偶发】商船靠岸！小麦、鱼肉高价收购，快去港口卖货'
    case 'bountiful':
      return season === 'autumn'
        ? '【偶发】丰收日！今日收麦更饱满'
        : season === 'winter'
          ? '【偶发】好运日！海边鱼群变多了'
          : '【偶发】丰收日！浇过水的麦子长得更快'
    case 'lean':
      return season === 'winter'
        ? '【偶发】欠收日！鱼不好钓，产量变少'
        : '【偶发】欠收日！庄稼长得慢了一些'
    default:
      return ''
  }
}

export function eventStartMessage(kind: Exclude<EventKind, 'none'>, season: Season): string {
  return eventAlertText(kind, season)
}

export function eventEndMessage(kind: EventKind): string {
  switch (kind) {
    case 'merchant':
      return '商船离港了'
    case 'bountiful':
      return '丰收日过去了'
    case 'lean':
      return '欠收日过去了'
    default:
      return ''
  }
}

/** 商船：麦价倍率 */
export const MERCHANT_WHEAT_MULT = 1.5
/** 商船：鱼肉收购单价 */
export const MERCHANT_FISH_PRICE = 7
/** 商船一次最多收购鱼肉 */
export const MERCHANT_FISH_BUY_CAP = 12

export function growEventMult(kind: EventKind): number {
  if (kind === 'bountiful') return 1.5
  if (kind === 'lean') return 0.7
  return 1
}

export function harvestEventBonus(kind: EventKind): number {
  return kind === 'bountiful' ? 1 : 0
}

export function fishEventYield(base: number, kind: EventKind): number {
  if (kind === 'bountiful') return base + 1
  if (kind === 'lean') return Math.max(1, base - 1)
  return base
}

export function minutesUntilDayEnd(minuteOfDay: number): number {
  return Math.max(30, MINUTES_PER_DAY - minuteOfDay)
}
