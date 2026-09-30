import {
  BOAT_FISH_CAP,
  BOAT_WOOD_CAP,
  emptyBoatVoyage,
  MEDICINE_SOFT_CAP,
  sailorMedicineLoot,
  voyageCooldownMinutes,
  voyageDurationMinutes,
  voyageFishPrice,
  voyageWoodPrice,
  type BoatVoyage,
  type CatInstance,
  type LevelState,
} from '../types'
import { clampRoleLevel, tradePriceMult } from './careers'

export interface VoyageContext {
  nowAbs: number
  minuteOfDay: number
  inventory: Record<string, number>
  cats: CatInstance[]
  harbor: LevelState
  boat: LevelState
  boatVoyage: BoatVoyage
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
  const fishCap = BOAT_FISH_CAP[ctx.boat.level] ?? 4
  const woodCap = BOAT_WOOD_CAP[ctx.boat.level] ?? 1
  const fishLoad = Math.min(ctx.inventory.fish ?? 0, fishCap)
  const woodLoad = Math.min(ctx.inventory.wood ?? 0, woodCap)
  return fishLoad + woodLoad > 0
}

export function buildDepartVoyage(ctx: VoyageContext): {
  boatVoyage: BoatVoyage
  inventory: Record<string, number>
  statusMessage: string
} | null {
  if (!canDepartVoyage(ctx)) return null
  const fishCap = BOAT_FISH_CAP[ctx.boat.level] ?? 4
  const woodCap = BOAT_WOOD_CAP[ctx.boat.level] ?? 1
  const fishLoad = Math.min(ctx.inventory.fish ?? 0, fishCap)
  const woodLoad = Math.min(ctx.inventory.wood ?? 0, woodCap)
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
  const medNow = ctx.inventory.medicine ?? 0
  const medAdd = Math.min(medLoot, Math.max(0, MEDICINE_SOFT_CAP - medNow))
  const coins = ctx.boatVoyage.expectedCoins
  const cooldown = voyageCooldownMinutes(ctx.harbor.level)
  const parts = [`+${coins} 金`]
  if (ctx.boatVoyage.cargoFish > 0) parts.unshift(`卸下鱼货`)
  if (medAdd > 0) parts.push(`带回药品 ×${medAdd}`)

  return {
    coinsDelta: coins,
    inventory: {
      ...ctx.inventory,
      medicine: medNow + medAdd,
    },
    boatVoyage: emptyBoatVoyage(ctx.nowAbs + cooldown),
    statusMessage: `货船回港：${parts.join(' · ')}`,
  }
}
