import { CAT_BREEDS, nextRecruitBreed } from './breeds'
import { dailyFishNeed, medicinePerCure } from './careers'
import {
  PIRATE_COOLDOWN_MINUTES,
  PIRATE_DECIDE_MS,
  PIRATE_MIN_DAY,
  PIRATE_STOCK_THRESHOLD,
  PIRATE_WEALTH_THRESHOLD,
  stockScore,
  wealthScore,
  type PirateFightOutcome,
} from './pirates'
import {
  catCapForCottage,
  MINUTES_PER_DAY,
  type CatInstance,
} from '../types'

export const MAJOR_DECIDE_MS = PIRATE_DECIDE_MS
export const MAJOR_COOLDOWN_MINUTES = PIRATE_COOLDOWN_MINUTES
/** 海盗参与统一抽签时的权重系数 */
export const PIRATE_P_WEIGHT = 0.55

export const PLAGUE_MIN_DAY = 20
export const PLAGUE_MIN_CATS = 6
export const STRAY_MIN_DAY = 16
export const STRAY_MIN_EMPTY_SLOTS = 2

export type MajorEventKind = 'none' | 'pirate' | 'plague' | 'stray'
export type MajorEventPhase = 'idle' | 'threat' | 'fighting' | 'result'

export type MajorEventState = {
  kind: MajorEventKind
  phase: MajorEventPhase
  decideBy: number
  fightEndsAt: number
  pendingOutcome: PirateFightOutcome | null
  resultTitle: string
  resultBody: string
  nextEligibleAt: number
  needsAck: boolean
  autoResolved: boolean
  plagueUntil: number
  plagueSickMult: number
  strayBreedId: string
  strayCostFish: number
  strayCostCoins: number
}

export function emptyMajorEvent(nextEligibleAt = 0): MajorEventState {
  return {
    kind: 'none',
    phase: 'idle',
    decideBy: 0,
    fightEndsAt: 0,
    pendingOutcome: null,
    resultTitle: '',
    resultBody: '',
    nextEligibleAt,
    needsAck: false,
    autoResolved: false,
    plagueUntil: 0,
    plagueSickMult: 1,
    strayBreedId: '',
    strayCostFish: 0,
    strayCostCoins: 0,
  }
}

/** 保留 plague 残留，清空决策窗 */
export function clearDecisionWindow(
  prev: MajorEventState,
  nextEligibleAt: number,
): MajorEventState {
  return {
    ...emptyMajorEvent(nextEligibleAt),
    plagueUntil: prev.plagueUntil,
    plagueSickMult: prev.plagueSickMult,
  }
}

export function decisionWindowBusy(ev: MajorEventState): boolean {
  return ev.phase !== 'idle' || ev.needsAck
}

/** 海盗财富/天数门槛（门禁由 store 统一检查） */
export function pirateWealthEligible(input: {
  day: number
  coins: number
  inventory: Record<string, number>
}): boolean {
  if (input.day < PIRATE_MIN_DAY) return false
  if (stockScore(input.inventory) < PIRATE_STOCK_THRESHOLD) return false
  return wealthScore(input.coins, input.inventory) >= PIRATE_WEALTH_THRESHOLD
}

export function canRollPlague(input: {
  day: number
  cats: CatInstance[]
  inventory: Record<string, number>
}): boolean {
  const { day, cats, inventory } = input
  if (day < PLAGUE_MIN_DAY || cats.length < PLAGUE_MIN_CATS) return false
  const cost = medicinePerCure(cats)
  const med = inventory.medicine ?? 0
  const sickCount = cats.filter((c) => c.sick).length
  return med <= cats.length * cost * 0.5 || sickCount >= 2
}

export function plagueChance(input: {
  cats: CatInstance[]
  inventory: Record<string, number>
}): number {
  const cost = medicinePerCure(input.cats)
  const med = input.inventory.medicine ?? 0
  const need = input.cats.length * cost
  const tight = need > 0 ? Math.max(0, 1 - med / need) : 0
  const medicineTightBonus = tight * 0.04
  const noDoctorBonus = input.cats.some((c) => c.role === 'doctor') ? 0 : 0.02
  return Math.min(0.1, Math.max(0.04, 0.04 + medicineTightBonus + noDoctorBonus))
}

export function canRollStray(input: {
  day: number
  cats: CatInstance[]
  cottageLevel: number
  inventory: Record<string, number>
}): boolean {
  const { day, cats, cottageLevel, inventory } = input
  if (day < STRAY_MIN_DAY) return false
  const empty = catCapForCottage(cottageLevel) - cats.length
  if (empty < STRAY_MIN_EMPTY_SLOTS) return false
  const fishNeed = dailyFishNeed(cats)
  if ((inventory.fish ?? 0) < fishNeed * 2) return false
  const comfort = (inventory.toy ?? 0) + (inventory.snack ?? 0)
  return comfort >= 2
}

export function strayChance(input: {
  cats: CatInstance[]
  cottageLevel: number
}): number {
  const empty = catCapForCottage(input.cottageLevel) - input.cats.length
  const emptySlotBonus = Math.max(0, empty - STRAY_MIN_EMPTY_SLOTS) * 0.015
  return Math.min(0.08, Math.max(0.03, 0.03 + emptySlotBonus))
}

/** 两次 rng：先是否出，再按 p 比例选 kind */
export function pickMajorEventKind(
  weights: { pirate: number; plague: number; stray: number },
  rng = Math.random,
): Exclude<MajorEventKind, 'none'> | null {
  const entries = (['pirate', 'plague', 'stray'] as const)
    .map((kind) => ({ kind, p: Math.max(0, weights[kind]) }))
    .filter((e) => e.p > 0)
  const total = entries.reduce((s, e) => s + e.p, 0)
  if (total <= 0) return null
  if (rng() >= Math.min(1, total)) return null
  let r = rng() * total
  for (const e of entries) {
    r -= e.p
    if (r < 0) return e.kind
  }
  return entries[entries.length - 1]!.kind
}

export function plagueIsolateMedicineCost(cats: CatInstance[]): number {
  const base = Math.max(2, cats.length * medicinePerCure(cats))
  const hasDoc = cats.some((c) => c.role === 'doctor')
  return Math.max(1, hasDoc ? base - 1 : base)
}

export function applyPlagueIsolate(input: {
  nowAbs: number
  cats: CatInstance[]
  inventory: Record<string, number>
  prev: MajorEventState
}): {
  inventory: Record<string, number>
  majorEvent: MajorEventState
} {
  const cost = plagueIsolateMedicineCost(input.cats)
  const inv = { ...input.inventory }
  inv.medicine = Math.max(0, (inv.medicine ?? 0) - cost)
  const nextEligible = input.nowAbs + MAJOR_COOLDOWN_MINUTES
  const base = clearDecisionWindow(input.prev, nextEligible)
  const body = `消耗药品 ×${cost}。未来两日生病风险降低。`
  return {
    inventory: inv,
    majorEvent: {
      ...base,
      phase: 'result',
      needsAck: true,
      resultTitle: '隔离防疫',
      resultBody: body,
      plagueUntil: input.nowAbs + 2 * MINUTES_PER_DAY,
      plagueSickMult: 0.5,
    },
  }
}

export function applyPlagueEndure(input: {
  nowAbs: number
  cats: CatInstance[]
  prev: MajorEventState
  auto: boolean
}): MajorEventState {
  const hasDoc = input.cats.some((c) => c.role === 'doctor')
  const mult = hasDoc ? 1.7 : 2.2
  const nextEligible = input.nowAbs + MAJOR_COOLDOWN_MINUTES
  const base = clearDecisionWindow(input.prev, nextEligible)
  return {
    ...base,
    phase: 'result',
    needsAck: true,
    autoResolved: input.auto,
    resultTitle: input.auto ? '疫病潮：已硬扛' : '选择硬扛',
    resultBody: input.auto
      ? '你不在时岛民只能硬扛疫病。未来三日生病风险升高。'
      : `未来三日生病风险升高（倍率 ×${mult}）。`,
    plagueUntil: input.nowAbs + 3 * MINUTES_PER_DAY,
    plagueSickMult: mult,
  }
}

export function rollStrayOffer(ownedBreedIds: string[]): {
  strayBreedId: string
  strayCostFish: number
  strayCostCoins: number
} {
  const next = nextRecruitBreed(ownedBreedIds)
  const pool = CAT_BREEDS.filter((b) => b.recruitPrice > 0)
  const breed =
    next ?? pool[Math.floor(Math.random() * Math.max(1, pool.length))] ?? CAT_BREEDS[0]!
  return {
    strayBreedId: breed.id,
    strayCostFish: 5 + Math.floor(Math.random() * 4),
    strayCostCoins: 20 + Math.floor(Math.random() * 21),
  }
}

export function canAffordStray(
  coins: number,
  inventory: Record<string, number>,
  offer: { strayCostFish: number; strayCostCoins: number },
): boolean {
  return (
    coins >= offer.strayCostCoins && (inventory.fish ?? 0) >= offer.strayCostFish
  )
}

export function applyStrayReject(input: {
  nowAbs: number
  prev: MajorEventState
  auto: boolean
}): MajorEventState {
  const nextEligible = input.nowAbs + MAJOR_COOLDOWN_MINUTES
  return {
    ...clearDecisionWindow(input.prev, nextEligible),
    phase: 'result',
    needsAck: true,
    autoResolved: input.auto,
    resultTitle: input.auto ? '流浪猫：已婉拒' : '婉拒投奔',
    resultBody: '它们去了别的岛。',
  }
}

export function startMajorThreat(
  kind: Exclude<MajorEventKind, 'none'>,
  prev: MajorEventState,
  extras: Partial<MajorEventState> = {},
  now = Date.now(),
): MajorEventState {
  return {
    ...prev,
    kind,
    phase: 'threat',
    decideBy: now + MAJOR_DECIDE_MS,
    fightEndsAt: 0,
    pendingOutcome: null,
    needsAck: false,
    autoResolved: false,
    resultTitle: '',
    resultBody: '',
    strayBreedId: '',
    strayCostFish: 0,
    strayCostCoins: 0,
    ...extras,
  }
}

export function expirePlagueIfNeeded(
  ev: MajorEventState,
  nowAbs: number,
): MajorEventState {
  if (ev.plagueUntil <= 0 || nowAbs < ev.plagueUntil) return ev
  return { ...ev, plagueUntil: 0, plagueSickMult: 1 }
}
