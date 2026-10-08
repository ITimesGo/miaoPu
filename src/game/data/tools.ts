import type { CatInstance, CatRole } from '../types'

/** 需要工具保养的户外职业 */
export const TOOL_MAINT_ROLES: readonly CatRole[] = ['miner', 'lumberjack', 'fisher']

/** 每位户外工日结保养耗矿 */
export const TOOL_MAINT_ORE_PER_WORKER = 1

/** 新开局矿石 */
export const STARTING_ORE = 10

/** 保养不足次日户外产量倍率 */
export const TOOLS_WORN_YIELD_MULT = 0.85

export function isToolMaintRole(role: CatRole | undefined): boolean {
  return role != null && (TOOL_MAINT_ROLES as readonly string[]).includes(role)
}

/** 日结工具保养所需矿石（按尚在岛上的矿工/伐木/渔夫人数） */
export function toolMaintOreNeed(cats: Array<{ role?: CatRole }>): number {
  const n = cats.filter((c) => isToolMaintRole(c.role)).length
  return n * TOOL_MAINT_ORE_PER_WORKER
}

export function applyToolsWornYield(amount: number, toolsWorn: boolean): number {
  if (!toolsWorn || amount <= 0) return amount
  return Math.max(1, Math.floor(amount * TOOLS_WORN_YIELD_MULT))
}

export function countToolWorkers(cats: CatInstance[]): number {
  return cats.filter((c) => isToolMaintRole(c.role)).length
}
