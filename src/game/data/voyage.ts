import {
  BOAT_FISH_CAP,
  BOAT_WOOD_CAP,
  emptyBoatVoyage,
  sailorMedicineLoot,
  voyageCooldownMinutes,
  voyageDurationMinutes,
  voyageFishPrice,
  voyageWoodPrice,
  type BoatVoyage,
  type CatInstance,
  type LevelState,
  type Season,
} from '../types'
import { clampRoleLevel, dailyFishNeed, tradePriceMult } from './careers'
import {
  applyInventoryGain,
  formatOverflowStatus,
  type SoftCapBuildings,
} from './economy'
import { heatingWoodNeed } from './heating'

export interface VoyageContext {
  nowAbs: number
  minuteOfDay: number
  season: Season
  inventory: Record<string, number>
  cats: CatInstance[]
  harbor: LevelState
  boat: LevelState
  boatVoyage: BoatVoyage
  buildings: SoftCapBuildings
}

/** 出海预留：明日口粮鱼 + 今日取暖木；可装 = 库存 − 预留，再夹船舱 */
export function voyageLoadableCargo(ctx: {
  inventory: Record<string, number>
  cats: CatInstance[]
  season: Season
  boatLevel: number
}): { fishLoad: number; woodLoad: number; fishReserve: number; woodReserve: number } {
  const fishReserve = dailyFishNeed(ctx.cats)
  const woodReserve = heatingWoodNeed(ctx.cats.length, ctx.season)
  const fishCap = BOAT_FISH_CAP[ctx.boatLevel] ?? 4
  const woodCap = BOAT_WOOD_CAP[ctx.boatLevel] ?? 1
  const fishAvail = Math.max(0, (ctx.inventory.fish ?? 0) - fishReserve)
  const woodAvail = Math.max(0, (ctx.inventory.wood ?? 0) - woodReserve)
  return {
    fishReserve,
    woodReserve,
    fishLoad: Math.min(fishAvail, fishCap),
    woodLoad: Math.min(woodAvail, woodCap),
  }
}

export function canDepartVoyage(ctx: VoyageContext): boolean {
  if (ctx.boatVoyage.phase !== 'docked') return false
  if (ctx.nowAbs < ctx.boatVoyage.readyAt) return false
  const hour = ctx.minuteOfDay / 60
  if (hour < 7 || hour >= 18) return false
  const sailorOk = ctx.cats.some(
    (c) => c.role === 'sailor' && !c.sick && clampRoleLevel(c.roleLevel) >= 1,
  )
  if (!sailorOk) return false
  const { fishLoad, woodLoad } = voyageLoadableCargo({
    inventory: ctx.inventory,
    cats: ctx.cats,
    season: ctx.season,
    boatLevel: ctx.boat.level,
  })
  return fishLoad + woodLoad > 0
}

export function buildDepartVoyage(ctx: VoyageContext): {
  boatVoyage: BoatVoyage
  inventory: Record<string, number>
  statusMessage: string
} | null {
  if (!canDepartVoyage(ctx)) return null
  const { fishLoad, woodLoad } = voyageLoadableCargo({
    inventory: ctx.inventory,
    cats: ctx.cats,
    season: ctx.season,
    boatLevel: ctx.boat.level,
  })
  if (fishLoad + woodLoad <= 0) return null

  const sailors = ctx.cats.filter((c) => c.role === 'sailor')
  const mult = tradePriceMult(sailors)
  const expectedCoins = Math.max(
    1,
    Math.round(
      (fishLoad * voyageFishPrice(ctx.harbor.level) + woodLoad * voyageWoodPrice(ctx.boat.level)) *
        mult,
    ),
  )
  const duration = voyageDurationMinutes(ctx.boat.level)
  return {
    inventory: {
      ...ctx.inventory,
      fish: (ctx.inventory.fish ?? 0) - fishLoad,
      wood: (ctx.inventory.wood ?? 0) - woodLoad,
    },
    boatVoyage: {
      phase: 'away',
      returnAt: ctx.nowAbs + duration,
      readyAt: ctx.nowAbs + duration,
      cargoFish: fishLoad,
      cargoWood: woodLoad,
      expectedCoins,
    },
    statusMessage: `货船出海：鱼 ×${fishLoad}、木 ×${woodLoad}，预计 +${expectedCoins} 金`,
  }
}

export function settleVoyageReturn(ctx: VoyageContext): {
  boatVoyage: BoatVoyage
  inventory: Record<string, number>
  coinsDelta: number
  statusMessage: string
} | null {
  if (ctx.boatVoyage.phase !== 'away') return null
  if (ctx.nowAbs < ctx.boatVoyage.returnAt) return null

  const sailors = ctx.cats.filter((c) => c.role === 'sailor')
  const topSailor = sailors.sort(
    (a, b) => clampRoleLevel(b.roleLevel) - clampRoleLevel(a.roleLevel),
  )[0]
  const medLoot = topSailor ? sailorMedicineLoot(topSailor.roleLevel) : 0
  // coins 从 0 起算：仅累计药品溢出兑金；航行卖货金由 store 叠到现有金币后再夹帽
  const gained = applyInventoryGain(
    ctx.inventory,
    0,
    medLoot > 0 ? { medicine: medLoot } : {},
    ctx.buildings,
  )
  const coinsDelta = ctx.boatVoyage.expectedCoins + gained.coins
  const cooldown = voyageCooldownMinutes(ctx.harbor.level)
  const parts = [`预计 +${ctx.boatVoyage.expectedCoins} 金`]
  if (ctx.boatVoyage.cargoFish > 0) parts.unshift(`卸下鱼货`)
  const medAdded = gained.added.medicine ?? 0
  if (medAdded > 0) parts.push(`带回药品 ×${medAdded}`)
  const overflowNote = formatOverflowStatus(gained)
  if (overflowNote) parts.push(overflowNote)

  return {
    coinsDelta,
    inventory: gained.inventory,
    boatVoyage: emptyBoatVoyage(ctx.nowAbs + cooldown),
    statusMessage: `货船回港：${parts.join(' · ')}`,
  }
}
