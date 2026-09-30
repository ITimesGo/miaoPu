import { dailyFishNeed, tradePriceMult } from './careers'
import { MERCHANT_FISH_PRICE } from './events'
import { WHEAT_SELL_PRICE, voyageWoodPrice, type CatInstance } from '../types'

export type SellResourceId = 'wheat' | 'ore' | 'wood' | 'fish'

export type SellAmountMode = 'one' | 'half' | 'all'

export const SELL_RESOURCES: SellResourceId[] = ['wheat', 'ore', 'wood', 'fish']

export const SELL_LABEL: Record<SellResourceId, string> = {
  wheat: '小麦',
  ore: '矿石',
  wood: '木材',
  fish: '鱼肉',
}

/** 相对正经贸易的折价回收基价（再乘船商半额加成） */
export const SELL_BASE_PRICE: Record<SellResourceId, number> = {
  wheat: Math.max(1, Math.round(WHEAT_SELL_PRICE * 0.6)),
  ore: 5,
  wood: Math.max(1, Math.round(voyageWoodPrice(1) * 0.6)),
  fish: Math.max(1, Math.round(MERCHANT_FISH_PRICE * 0.5)),
}

export const SELL_HINT: Record<SellResourceId, string> = {
  wheat: '低于码头卖麦价，应急清仓用',
  ore: '升级材料，急用钱可抛',
  wood: '低于出海木材价',
  fish: '须留足明日口粮后再卖',
}

export function sellUnitPrice(
  id: SellResourceId,
  sailors: Array<{ roleLevel?: number }>,
): number {
  const base = SELL_BASE_PRICE[id]
  const tradeMult = tradePriceMult(sailors)
  // 手动回收只吃一半船商加成，避免压过正经贸易
  const soft = 1 + (tradeMult - 1) * 0.5
  return Math.max(1, Math.round(base * soft))
}

/** 鱼肉强制预留日耗口粮 */
export function maxSellable(
  id: SellResourceId,
  inventory: Record<string, number>,
  cats: Array<{ roleLevel?: number }>,
): number {
  const have = inventory[id] ?? 0
  if (have <= 0) return 0
  if (id === 'fish') {
    return Math.max(0, have - dailyFishNeed(cats))
  }
  return have
}

export function resolveSellQty(max: number, mode: SellAmountMode): number {
  if (max <= 0) return 0
  if (mode === 'one') return 1
  if (mode === 'half') return Math.max(1, Math.floor(max / 2))
  return max
}

export function sellPreview(
  id: SellResourceId,
  mode: SellAmountMode,
  inventory: Record<string, number>,
  cats: CatInstance[],
): { qty: number; unit: number; earn: number; max: number } {
  const sailors = cats.filter((c) => c.role === 'sailor' && !c.sick)
  const unit = sellUnitPrice(id, sailors)
  const max = maxSellable(id, inventory, cats)
  const qty = resolveSellQty(max, mode)
  return { qty, unit, earn: qty * unit, max }
}
