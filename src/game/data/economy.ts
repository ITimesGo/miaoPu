import {
  FISH_SOFT_CAP,
  KNOWLEDGE_SOFT_CAP,
  MEDICINE_SOFT_CAP,
  ORE_SOFT_CAP,
  WOOD_SOFT_CAP,
} from '../types'

/** Lv1 基线（与表 [1] 一致；HUD 请用动态帽） */
export const COIN_SOFT_CAP = 3000
export const TOY_SOFT_CAP = 20
export const SNACK_SOFT_CAP = 20

export {
  FISH_SOFT_CAP,
  KNOWLEDGE_SOFT_CAP,
  MEDICINE_SOFT_CAP,
  ORE_SOFT_CAP,
  WOOD_SOFT_CAP,
}

export type SoftCapBuildings = {
  cottage: number
  harbor: number
  boat: number
  /** 0 = 未建 → 矿/木用 Lv1 */
  granary: number
}

/** index 1…8；0 占位 */
const TOY_BY_LV = [0, 20, 24, 28, 32, 36, 40, 44, 48] as const
const SNACK_BY_LV = TOY_BY_LV
const KNOWLEDGE_BY_LV = [0, 50, 58, 66, 74, 80, 88, 94, 100] as const
const COIN_BY_LV = [0, 3000, 3600, 4200, 4800, 5400, 6000, 6600, 7200] as const
/** 鱼单独抬高（适配更高猫口）；药/矿/木仍用原表 */
const FISH_BY_LV = [0, 48, 56, 64, 72, 80, 88, 96, 104] as const
const MEDICINE_BY_LV = [0, 40, 48, 56, 64, 72, 80, 88, 96] as const
const ORE_BY_LV = MEDICINE_BY_LV
const WOOD_BY_LV = MEDICINE_BY_LV

const MAX_BUILDING_LV = 8

function clampLv(n: number): number {
  return Math.max(1, Math.min(MAX_BUILDING_LV, Math.floor(n || 1)))
}

function granaryCapLv(granary: number): number {
  if (granary <= 0) return 1
  return clampLv(granary)
}

export function coinSoftCap(b: SoftCapBuildings): number {
  const c = COIN_BY_LV[clampLv(b.cottage)]!
  const h = COIN_BY_LV[clampLv(b.harbor)]!
  return Math.max(c, h)
}

/** 溢出 1 单位资源兑金 */
export const OVERFLOW_COIN_RATE: Record<string, number> = {
  fish: 4,
  wheat: 4,
  ore: 8,
  wood: 8,
  knowledge: 12,
  medicine: 16,
  toy: 8,
  snack: 8,
}

export function softCapFor(key: string, b: SoftCapBuildings): number | null {
  switch (key) {
    case 'fish':
      return FISH_BY_LV[clampLv(b.harbor)]!
    case 'ore':
      return ORE_BY_LV[granaryCapLv(b.granary)]!
    case 'wood':
      return WOOD_BY_LV[granaryCapLv(b.granary)]!
    case 'knowledge':
      return KNOWLEDGE_BY_LV[clampLv(b.cottage)]!
    case 'medicine':
      return MEDICINE_BY_LV[clampLv(b.boat)]!
    case 'toy':
      return TOY_BY_LV[clampLv(b.cottage)]!
    case 'snack':
      return SNACK_BY_LV[clampLv(b.cottage)]!
    case 'wheat':
      return null
    default:
      return null
  }
}

const SOFT_CAP_HINT_KEYS: { key: string; label: string }[] = [
  { key: 'toy', label: '玩具' },
  { key: 'snack', label: '零食' },
  { key: 'knowledge', label: '知识' },
  { key: 'fish', label: '鱼肉' },
  { key: 'medicine', label: '药品' },
  { key: 'ore', label: '矿石' },
  { key: 'wood', label: '木材' },
]

/** 建筑升级前后软帽正增量文案；无上涨返回空串 */
export function softCapDeltaHint(
  before: SoftCapBuildings,
  after: SoftCapBuildings,
): string {
  const parts: string[] = []
  for (const { key, label } of SOFT_CAP_HINT_KEYS) {
    const a = softCapFor(key, before)
    const b = softCapFor(key, after)
    if (a == null || b == null) continue
    const d = b - a
    if (d > 0) parts.push(`${label} +${d}`)
  }
  const coinD = coinSoftCap(after) - coinSoftCap(before)
  if (coinD > 0) parts.push(`金库 +${coinD}`)
  return parts.join(' · ')
}

export function applyCoinGain(
  coins: number,
  delta: number,
  coinCap: number,
): { coins: number; added: number; discarded: number } {
  if (delta <= 0) return { coins, added: 0, discarded: 0 }
  const cap = Math.max(0, Math.floor(coinCap))
  const room = Math.max(0, cap - coins)
  const added = Math.min(delta, room)
  return { coins: coins + added, added, discarded: delta - added }
}

export type InventoryGainResult = {
  inventory: Record<string, number>
  coins: number
  added: Record<string, number>
  overflow: Record<string, number>
  coinFromOverflow: number
  coinDiscarded: number
}

export function applyInventoryGain(
  inventory: Record<string, number>,
  coins: number,
  gains: Record<string, number>,
  buildings: SoftCapBuildings,
): InventoryGainResult {
  const inv = { ...inventory }
  const added: Record<string, number> = {}
  const overflow: Record<string, number> = {}
  let overflowCoins = 0

  for (const [key, wantRaw] of Object.entries(gains)) {
    const want = Math.max(0, Math.floor(wantRaw))
    if (want <= 0) continue
    const have = inv[key] ?? 0
    const cap = softCapFor(key, buildings)
    const room = cap == null ? want : Math.max(0, cap - have)
    const add = Math.min(want, room)
    const over = want - add
    if (add > 0) {
      inv[key] = have + add
      added[key] = add
    }
    if (over > 0) {
      overflow[key] = over
      overflowCoins += over * (OVERFLOW_COIN_RATE[key] ?? 0)
    }
  }

  const coin = applyCoinGain(coins, overflowCoins, coinSoftCap(buildings))
  return {
    inventory: inv,
    coins: coin.coins,
    added,
    overflow,
    coinFromOverflow: coin.added,
    coinDiscarded: coin.discarded,
  }
}

/** 小麦：硬容量裁切 + 超额兑金 */
export function applyWheatHarvestGain(
  inventory: Record<string, number>,
  coins: number,
  yieldAmt: number,
  granaryCap: number,
  buildings: SoftCapBuildings,
): InventoryGainResult {
  const have = inventory.wheat ?? 0
  const space = Math.max(0, granaryCap - have)
  const want = Math.max(0, Math.floor(yieldAmt))
  const add = Math.min(want, space)
  const over = want - add
  const mid = applyInventoryGain(inventory, coins, { wheat: add }, buildings)
  const coin = applyCoinGain(
    mid.coins,
    over * (OVERFLOW_COIN_RATE.wheat ?? 4),
    coinSoftCap(buildings),
  )
  return {
    ...mid,
    coins: coin.coins,
    overflow:
      over > 0 ? { ...mid.overflow, wheat: (mid.overflow.wheat ?? 0) + over } : mid.overflow,
    coinFromOverflow: mid.coinFromOverflow + coin.added,
    coinDiscarded: mid.coinDiscarded + coin.discarded,
  }
}

/** 日结舒适：先 snack 后 toy，合计只扣 need */
export function applyComfortConsume(
  inventory: Record<string, number>,
  need: number,
): { inventory: Record<string, number>; snackUsed: number; toyUsed: number } {
  const inv = { ...inventory }
  let left = Math.max(0, Math.floor(need))
  const snackHave = inv.snack ?? 0
  const snackUsed = Math.min(left, snackHave)
  if (snackUsed > 0) {
    inv.snack = snackHave - snackUsed
    left -= snackUsed
  }
  const toyHave = inv.toy ?? 0
  const toyUsed = Math.min(left, toyHave)
  if (toyUsed > 0) inv.toy = toyHave - toyUsed
  return { inventory: inv, snackUsed, toyUsed }
}

export function formatOverflowStatus(r: {
  overflow: Record<string, number>
  coinFromOverflow: number
  coinDiscarded: number
}): string {
  const parts = Object.entries(r.overflow).filter(([, n]) => n > 0)
  if (parts.length === 0) return ''
  const label: Record<string, string> = {
    fish: '鱼',
    wheat: '麦',
    ore: '矿',
    wood: '木',
    knowledge: '知',
    medicine: '药',
    toy: '玩具',
    snack: '零食',
  }
  const body = parts.map(([k, n]) => `${label[k] ?? k}×${n}`).join('、')
  if (r.coinFromOverflow > 0) return `${body} 已满，溢出兑金 +${r.coinFromOverflow}`
  if (r.coinDiscarded > 0) return `${body} 已满，金库也满无法兑金`
  return `${body} 已满`
}

/** 开局 / 测试用默认建筑快照 */
export const DEFAULT_SOFT_CAP_BUILDINGS: SoftCapBuildings = {
  cottage: 1,
  harbor: 1,
  boat: 1,
  granary: 0,
}
