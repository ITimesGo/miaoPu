import {
  BOAT_MAX_LEVEL,
  BOAT_UPGRADE_KNOWLEDGE,
  BOAT_UPGRADE_ORE,
  BOAT_UPGRADE_PRICE,
  BOAT_UPGRADE_WOOD,
  catCapForCottage,
  COTTAGE_MAX_LEVEL,
  COTTAGE_UPGRADE_KNOWLEDGE,
  COTTAGE_UPGRADE_ORE,
  COTTAGE_UPGRADE_PRICE,
  COTTAGE_UPGRADE_WOOD,
  GRANARY_BUY_ORE,
  GRANARY_BUY_PRICE,
  GRANARY_BUY_WOOD,
  GRANARY_CAPACITY,
  GRANARY_MAX_LEVEL,
  GRANARY_REPAIR_AMOUNT,
  GRANARY_REPAIR_COST,
  GRANARY_UPGRADE_KNOWLEDGE,
  GRANARY_UPGRADE_ORE,
  GRANARY_UPGRADE_PRICE,
  GRANARY_UPGRADE_WOOD,
  HARBOR_MAX_LEVEL,
  HARBOR_UPGRADE_KNOWLEDGE,
  HARBOR_UPGRADE_ORE,
  HARBOR_UPGRADE_PRICE,
  HARBOR_UPGRADE_WOOD,
  POCKET_WHEAT_CAP,
  RECRUIT_PRICE_SCALE,
  ROLE_MAX_LEVEL,
  ROLE_UPGRADE_KNOWLEDGE,
  SEED_PACK_AMOUNT,
  SEED_PACK_PRICE,
  SNACK_PRICE,
  TOY_PRICE,
  type CatInstance,
  type GranaryState,
  type LevelState,
} from '../types'
import { ROLE_LABEL, clampRoleLevel } from './careers'
import { nextRecruitBreed } from './breeds'

export type ShopCategory = 'item' | 'building' | 'cat' | 'sell'

export type ShopActionId =
  | 'buy_seed'
  | 'buy_toy'
  | 'buy_snack'
  | 'granary_buy'
  | 'granary_upgrade'
  | 'granary_repair'
  | 'harbor_upgrade'
  | 'boat_upgrade'
  | 'cottage_upgrade'
  | 'recruit_cat'
  | 'upgrade_role'

export interface ShopAction {
  id: ShopActionId
  category: ShopCategory
  label: string
  desc: string
  price: number
  oreCost?: number
  woodCost?: number
  knowledgeCost?: number
}

export function granaryCapacity(granary: GranaryState): number {
  if (granary.level <= 0) return POCKET_WHEAT_CAP
  const base = GRANARY_CAPACITY[granary.level] ?? POCKET_WHEAT_CAP
  const factor = granary.condition >= 50 ? 1 : 0.5 + granary.condition / 100
  return Math.max(1, Math.floor(base * factor))
}

/** 招募价随当前猫数递增；物品价不变。 */
export function recruitPriceFor(basePrice: number, currentCatCount: number): number {
  if (basePrice <= 0) return 0
  return Math.round(basePrice * (1 + currentCatCount * RECRUIT_PRICE_SCALE))
}

/** 找一只可升职业等级的猫（优先等级最低） */
export function findUpgradeableCat(cats: CatInstance[]): CatInstance | null {
  const candidates = cats
    .filter((c) => (c.role ?? 'farmer') !== 'civilian')
    .filter((c) => clampRoleLevel(c.roleLevel) < ROLE_MAX_LEVEL)
    .sort((a, b) => clampRoleLevel(a.roleLevel) - clampRoleLevel(b.roleLevel))
  return candidates[0] ?? null
}

export function getShopActions(input: {
  granary: GranaryState
  harbor: LevelState
  boat: LevelState
  cottage: LevelState
  ownedBreedIds: string[]
  catCount: number
  cats: CatInstance[]
}): ShopAction[] {
  const { granary, harbor, boat, cottage, ownedBreedIds, catCount, cats } = input
  const cap = catCapForCottage(cottage.level)
  const actions: ShopAction[] = [
    {
      id: 'buy_seed',
      category: 'item',
      label: '麦种',
      desc: `+${SEED_PACK_AMOUNT} 袋（定价固定）`,
      price: SEED_PACK_PRICE,
    },
    {
      id: 'buy_toy',
      category: 'item',
      label: '玩具',
      desc: `玩耍消耗（定价固定）`,
      price: TOY_PRICE,
    },
    {
      id: 'buy_snack',
      category: 'item',
      label: '零食',
      desc: `加餐（日结仍要吃鱼）`,
      price: SNACK_PRICE,
    },
  ]

  const next = nextRecruitBreed(ownedBreedIds)
  if (next && catCount < cap) {
    const price = recruitPriceFor(next.recruitPrice, catCount)
    actions.push({
      id: 'recruit_cat',
      category: 'cat',
      label: '招募小猫',
      desc: `${next.title}「${next.name}」·口 ${catCount}/${cap}`,
      price,
    })
  }

  const upCat = findUpgradeableCat(cats)
  if (upCat) {
    const nextLv = clampRoleLevel(upCat.roleLevel) + 1
    const need = ROLE_UPGRADE_KNOWLEDGE[nextLv] ?? 99
    actions.push({
      id: 'upgrade_role',
      category: 'cat',
      label: '升级职业',
      desc: `${ROLE_LABEL[upCat.role ?? 'farmer']} Lv.${clampRoleLevel(upCat.roleLevel)}→${nextLv}`,
      price: 0,
      knowledgeCost: need,
    })
  }

  if (cottage.level < COTTAGE_MAX_LEVEL) {
    const lv = cottage.level + 1
    actions.push({
      id: 'cottage_upgrade',
      category: 'building',
      label: '升级小屋',
      desc: `Lv.${cottage.level}→${lv} · 猫口 ${catCapForCottage(lv)}`,
      price: COTTAGE_UPGRADE_PRICE[lv] ?? 999,
      oreCost: COTTAGE_UPGRADE_ORE[lv],
      woodCost: COTTAGE_UPGRADE_WOOD[lv],
      knowledgeCost: COTTAGE_UPGRADE_KNOWLEDGE[lv],
    })
  }

  if (granary.level <= 0) {
    actions.push({
      id: 'granary_buy',
      category: 'building',
      label: '建粮仓',
      desc: `容量 ${GRANARY_CAPACITY[1]}`,
      price: GRANARY_BUY_PRICE,
      oreCost: GRANARY_BUY_ORE || undefined,
      woodCost: GRANARY_BUY_WOOD || undefined,
    })
  } else {
    if (granary.level < GRANARY_MAX_LEVEL) {
      const lv = granary.level + 1
      actions.push({
        id: 'granary_upgrade',
        category: 'building',
        label: '升级粮仓',
        desc: `Lv.${granary.level}→${lv} · 容量 ${GRANARY_CAPACITY[lv]}`,
        price: GRANARY_UPGRADE_PRICE[lv] ?? 999,
        oreCost: GRANARY_UPGRADE_ORE[lv],
        woodCost: GRANARY_UPGRADE_WOOD[lv],
        knowledgeCost: GRANARY_UPGRADE_KNOWLEDGE[lv],
      })
    }
    actions.push({
      id: 'granary_repair',
      category: 'building',
      label: '修缮粮仓',
      desc: `完好度 +${GRANARY_REPAIR_AMOUNT}（只耗金）`,
      price: GRANARY_REPAIR_COST,
    })
  }

  if (harbor.level < HARBOR_MAX_LEVEL) {
    const lv = harbor.level + 1
    actions.push({
      id: 'harbor_upgrade',
      category: 'building',
      label: '升级港口',
      desc: `Lv.${harbor.level}→${lv} · 码头扩大 · 商船更常来`,
      price: HARBOR_UPGRADE_PRICE[lv] ?? 999,
      oreCost: HARBOR_UPGRADE_ORE[lv],
      woodCost: HARBOR_UPGRADE_WOOD[lv],
      knowledgeCost: HARBOR_UPGRADE_KNOWLEDGE[lv],
    })
  }

  if (boat.level < BOAT_MAX_LEVEL) {
    const lv = boat.level + 1
    actions.push({
      id: 'boat_upgrade',
      category: 'building',
      label: '升级货船',
      desc: `Lv.${boat.level}→${lv} · 船只变大`,
      price: BOAT_UPGRADE_PRICE[lv] ?? 999,
      oreCost: BOAT_UPGRADE_ORE[lv],
      woodCost: BOAT_UPGRADE_WOOD[lv],
      knowledgeCost: BOAT_UPGRADE_KNOWLEDGE[lv],
    })
  }

  return actions
}
