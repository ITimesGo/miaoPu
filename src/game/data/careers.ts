import type { CatRole } from '../types'
import {
  MEDICINE_CRAFT_YIELD,
  ROLE_CONSUME_PER_LEVEL,
  ROLE_MAX_LEVEL,
  ROLE_YIELD_PER_LEVEL,
  STUDY_YIELD,
} from '../types'

export const ROLE_LABEL: Record<CatRole, string> = {
  civilian: '散民',
  farmer: '农夫',
  miner: '矿工',
  lumberjack: '伐木工',
  fisher: '渔夫',
  scholar: '学者',
  sailor: '船商',
  doctor: '医生',
}

export const ROLE_SHORT: Record<CatRole, string> = {
  civilian: '散',
  farmer: '农',
  miner: '矿',
  lumberjack: '伐',
  fisher: '渔',
  scholar: '学',
  sailor: '船',
  doctor: '医',
}

/** 可编制职业（不含散民） */
export const JOB_ROLES: CatRole[] = [
  'farmer',
  'miner',
  'lumberjack',
  'fisher',
  'scholar',
  'sailor',
  'doctor',
]

export const ALL_ROLES: CatRole[] = ['civilian', ...JOB_ROLES]

export function roleBehavior(role: CatRole): import('../types').CatBehavior {
  switch (role) {
    case 'miner':
      return 'mine'
    case 'lumberjack':
      return 'chop'
    case 'fisher':
      return 'fish'
    case 'scholar':
      return 'study'
    case 'sailor':
      return 'trade'
    case 'doctor':
      return 'craft'
    case 'civilian':
      return 'wander'
    default:
      return 'idle'
  }
}

export function countByRole(cats: Array<{ role?: CatRole }>): Record<CatRole, number> {
  const counts: Record<CatRole, number> = {
    civilian: 0,
    farmer: 0,
    miner: 0,
    lumberjack: 0,
    fisher: 0,
    scholar: 0,
    sailor: 0,
    doctor: 0,
  }
  for (const c of cats) {
    const r = c.role ?? 'farmer'
    counts[r] = (counts[r] ?? 0) + 1
  }
  return counts
}

export function clampRoleLevel(level: number | undefined): number {
  const n = Math.floor(level ?? 1)
  return Math.max(1, Math.min(ROLE_MAX_LEVEL, n))
}

/** 职业等级 → 产能倍率（Lv1=1，每级 +ROLE_YIELD_PER_LEVEL） */
export function roleYieldMult(level: number | undefined): number {
  return 1 + (clampRoleLevel(level) - 1) * ROLE_YIELD_PER_LEVEL
}

/** 职业等级 → 日耗倍率 */
export function roleConsumeMult(level: number | undefined): number {
  return 1 + (clampRoleLevel(level) - 1) * ROLE_CONSUME_PER_LEVEL
}

export function scaledYield(base: number, roleLevel: number | undefined): number {
  return Math.max(1, Math.round(base * roleYieldMult(roleLevel)))
}

export function studyYield(roleLevel: number | undefined): number {
  return scaledYield(STUDY_YIELD, roleLevel)
}

export function medicineCraftYield(roleLevel: number | undefined): number {
  return scaledYield(MEDICINE_CRAFT_YIELD, roleLevel)
}

export function dailyFishNeed(cats: Array<{ roleLevel?: number }>): number {
  return Math.max(
    0,
    Math.round(cats.reduce((sum, c) => sum + 1 * roleConsumeMult(c.roleLevel), 0)),
  )
}

export function dailyComfortNeed(cats: Array<{ roleLevel?: number }>): number {
  return Math.max(
    0,
    Math.round(cats.reduce((sum, c) => sum + 1 * roleConsumeMult(c.roleLevel), 0)),
  )
}

/**
 * 船商加产贸易：每名船商贡献售价加成。
 * Lv1 +12%，每级再 +8%，总倍率上限 2.5。
 */
export function tradePriceMult(sailors: Array<{ roleLevel?: number }>): number {
  if (sailors.length === 0) return 1
  const bonus = sailors.reduce(
    (sum, c) => sum + 0.12 + (clampRoleLevel(c.roleLevel) - 1) * 0.08,
    0,
  )
  return Math.min(2.5, 1 + bonus)
}

/** 日结生病基础概率（轻松节奏，偏低） */
export const SICK_CHANCE_BASE = 0.035
/** 矿工、船商户外劳累，生病概率更高 */
export const SICK_CHANCE_BY_ROLE: Partial<Record<CatRole, number>> = {
  miner: 0.07,
  sailor: 0.08,
  lumberjack: 0.05,
  fisher: 0.045,
  farmer: 0.03,
  scholar: 0.025,
  doctor: 0.02,
  civilian: 0.02,
}

export function sickChanceForRole(role: CatRole | undefined): number {
  const r = role ?? 'farmer'
  return SICK_CHANCE_BY_ROLE[r] ?? SICK_CHANCE_BASE
}

/** 麦种告罄时额外生病压力（可种植季） */
export const SEED_SHORTAGE_SICK_BONUS = 0.05
/** 麦种告罄（可种植季）时随机饿死/走失 1 只的概率 */
export const SEED_SHORTAGE_DEATH_CHANCE = 0.1
/** 鱼严重短缺（不足需求一半）时随机饿死 1 只的概率 */
export const FISH_SEVERE_SHORTAGE_DEATH_CHANCE = 0.35

