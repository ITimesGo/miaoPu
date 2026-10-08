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

/** 悬停说明：各职业职责 */
export const ROLE_HINT: Record<CatRole, string> = {
  civilian: '不专职干活，在岛上闲逛，等待被编制到其他职业。',
  farmer: '在麦田翻地、播种、浇水、收获小麦，是主要的食物与金币来源之一。',
  miner: '前往矿山挖掘矿石，用于升级小屋、港口、货船等建筑。',
  lumberjack: '砍伐成材的树，产出木材，同样用于建筑升级与出海装货。',
  fisher: '在岸边钓鱼，直接增加鱼肉库存，用来养活猫群（日结口粮）。',
  scholar: '研读产出知识，用于职业升级与建筑升级，是中后期成长关键。',
  sailor:
    '不负责钓鱼。提升码头卖麦/回收价与出海贸易收益；白天可装鱼装木出航换金币，高等级偶带回药品。',
  doctor:
    '消耗知识炼制药品。岛上有医生时，治病每只只需 1 药；没有医生则每只要 2 药。医生生病仍可炼药。',
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

/** 换岗就任：继承原等级并降 1 级（最低仍为 1） */
export function roleLevelAfterReassign(prevLevel: number | undefined): number {
  return Math.max(1, clampRoleLevel(prevLevel) - 1)
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

/** 玩具/零食开心加成：持续游戏分钟 */
export const COMFORT_BOOST_MINUTES = 3 * 60
/** 开心期间工作产出倍率（+20%） */
export const COMFORT_BOOST_MULT = 1.2

export function hasComfortBoost(
  cat: { boostUntil?: number } | undefined,
  nowAbs: number,
): boolean {
  return (cat?.boostUntil ?? 0) > nowAbs
}

export function comfortYieldMult(
  cat: { boostUntil?: number } | undefined,
  nowAbs: number,
): number {
  return hasComfortBoost(cat, nowAbs) ? COMFORT_BOOST_MULT : 1
}

/** 职业等级 + 开心加成后的工作产出 */
export function workYield(
  base: number,
  roleLevel: number | undefined,
  cat: { boostUntil?: number } | undefined,
  nowAbs: number,
): number {
  return Math.max(
    1,
    Math.round(base * roleYieldMult(roleLevel) * comfortYieldMult(cat, nowAbs)),
  )
}

export function studyYield(
  roleLevel: number | undefined,
  cat?: { boostUntil?: number },
  nowAbs = 0,
): number {
  return workYield(STUDY_YIELD, roleLevel, cat, nowAbs)
}

export function medicineCraftYield(
  roleLevel: number | undefined,
  cat?: { boostUntil?: number },
  nowAbs = 0,
): number {
  return workYield(MEDICINE_CRAFT_YIELD, roleLevel, cat, nowAbs)
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

/** 有医生编制时，日结治愈每只病猫耗药 */
export const MEDICINE_PER_CURE_WITH_DOCTOR = 1
/** 无医生时，日结治愈每只病猫耗药 */
export const MEDICINE_PER_CURE_NO_DOCTOR = 2

/** 岛上有医生编制（含生病医生）则 1 药/只，否则 2 药/只 */
export function medicinePerCure(cats: Array<{ role?: CatRole }>): number {
  return cats.some((c) => c.role === 'doctor')
    ? MEDICINE_PER_CURE_WITH_DOCTOR
    : MEDICINE_PER_CURE_NO_DOCTOR
}

/** 麦种告罄时额外生病压力（可种植季） */
export const SEED_SHORTAGE_SICK_BONUS = 0.05
/** 麦种告罄（可种植季）时随机饿死/走失 1 只的概率 */
export const SEED_SHORTAGE_DEATH_CHANCE = 0.1
/** 鱼严重短缺（不足需求一半）时随机饿死 1 只的概率 */
export const FISH_SEVERE_SHORTAGE_DEATH_CHANCE = 0.35

