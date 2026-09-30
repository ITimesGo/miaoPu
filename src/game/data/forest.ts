import { FOREST_POS, MINUTES_PER_DAY, type Season, type TreeState } from '../types'

export type ForestSpot = { x: number; z: number; trunk: number; canopy: number }

function hash(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export const TREE_MAX_STAGE = 3

/**
 * 整轮回长（桩→成材）所需游戏日。
 * 冬天停止生长。
 */
export const TREE_REGROW_DAYS: Record<Season, number | null> = {
  spring: 2,
  summer: 3,
  autumn: 5,
  winter: null,
}

/** 当前季节下各阶段所需分钟；冬天返回 null（不长）。比例约 30% / 30% / 40%。 */
export function treeStageMinutesForSeason(season: Season): number[] | null {
  const days = TREE_REGROW_DAYS[season]
  if (days == null) return null
  const total = days * MINUTES_PER_DAY
  return [total * 0.3, total * 0.3, total * 0.4]
}

/** @deprecated 用 treeStageMinutesForSeason；保留常量避免旧引用炸掉 */
export const TREE_STAGE_MINUTES = treeStageMinutesForSeason('spring')!

/** 各阶段相对成材的体型 */
export const TREE_STAGE_SCALE = [
  0, // stump — 单独渲染
  0.32,
  0.62,
  1,
] as const

function buildForestLayout(): ForestSpot[] {
  const spots: ForestSpot[] = []
  const layout: Array<{ dx: number; dz: number; scale: number }> = [
    { dx: 0, dz: 0, scale: 1.65 },
    { dx: 1.4, dz: 0.8, scale: 1.4 },
    { dx: 1.2, dz: -1.2, scale: 0.95 },
    { dx: -0.6, dz: 1.2, scale: 1.5 },
    { dx: -0.4, dz: -1.4, scale: 1.2 },
    { dx: 2.2, dz: 0.2, scale: 0.8 },
    { dx: 0.8, dz: 2.0, scale: 1.35 },
    { dx: 0.6, dz: -2.2, scale: 1.05 },
    { dx: 2.6, dz: 1.4, scale: 1.55 },
    { dx: 2.4, dz: -1.6, scale: 0.9 },
    { dx: -1.2, dz: 0.4, scale: 1.25 },
    { dx: 3.2, dz: 0.6, scale: 1.0 },
    { dx: 1.8, dz: 2.4, scale: 1.45 },
    { dx: 1.6, dz: -2.8, scale: 0.75 },
    { dx: 3.0, dz: -0.6, scale: 1.15 },
    { dx: -0.2, dz: 2.6, scale: 1.3 },
    { dx: 0.2, dz: -3.0, scale: 1.1 },
    { dx: 3.6, dz: 1.8, scale: 0.85 },
    { dx: 2.8, dz: -2.4, scale: 1.5 },
    { dx: -1.0, dz: -0.8, scale: 0.95 },
    { dx: 1.0, dz: 0.4, scale: 1.4 },
    { dx: 3.4, dz: -1.8, scale: 0.7 },
    { dx: 2.0, dz: 1.0, scale: 1.2 },
    { dx: 0.4, dz: 1.6, scale: 1.05 },
    { dx: 2.2, dz: -0.4, scale: 1.3 },
    { dx: 3.8, dz: 0.2, scale: 0.8 },
    // 加密补植
    { dx: -1.8, dz: 1.6, scale: 1.15 },
    { dx: -1.5, dz: -1.8, scale: 0.88 },
    { dx: 0.9, dz: 3.2, scale: 1.25 },
    { dx: -0.8, dz: 3.0, scale: 0.95 },
    { dx: 4.2, dz: 1.0, scale: 1.1 },
    { dx: 4.0, dz: -1.2, scale: 0.82 },
    { dx: 3.5, dz: 2.6, scale: 1.35 },
    { dx: 1.2, dz: -3.4, scale: 1.05 },
    { dx: -0.5, dz: -3.2, scale: 0.9 },
    { dx: 4.4, dz: -0.2, scale: 1.2 },
    { dx: 2.5, dz: 3.0, scale: 0.78 },
    { dx: 0.0, dz: 3.5, scale: 1.4 },
    { dx: 4.6, dz: 1.6, scale: 0.92 },
    { dx: 1.5, dz: 0.0, scale: 0.7 },
    { dx: -1.6, dz: 0.0, scale: 1.08 },
    { dx: 3.1, dz: -3.0, scale: 1.18 },
    { dx: 0.5, dz: -1.0, scale: 1.32 },
    { dx: 4.1, dz: -2.2, scale: 0.85 },
    { dx: 2.0, dz: -3.6, scale: 1.0 },
    { dx: -0.9, dz: 2.0, scale: 0.8 },
    { dx: 3.7, dz: 0.8, scale: 1.45 },
    { dx: 1.1, dz: 2.8, scale: 0.95 },
  ]

  for (const [i, p] of layout.entries()) {
    const jitter = (hash(i * 7.13) - 0.5) * 0.28
    const jitterZ = (hash(i * 11.7) - 0.5) * 0.28
    const s = p.scale * (0.92 + hash(i * 3.1) * 0.16)
    const x = FOREST_POS.x + p.dx + jitter
    const z = FOREST_POS.z + p.dz + jitterZ
    if (x < -7.0) continue
    spots.push({
      x,
      z,
      trunk: 1.05 + s * 0.75,
      canopy: 1.05 + s * 0.85,
    })
  }
  return spots
}

export const FOREST_LAYOUT = buildForestLayout()

export function createInitialTrees(): TreeState[] {
  return FOREST_LAYOUT.map(() => ({
    stage: TREE_MAX_STAGE,
    growProgress: 0,
  }))
}

export function isTreeMature(tree: TreeState): boolean {
  return tree.stage >= TREE_MAX_STAGE
}

export function countMatureTrees(trees: TreeState[]): number {
  return trees.filter(isTreeMature).length
}

/** 当前季节一整轮再生天数；冬天为 null */
export function treeRegrowDays(season: Season = 'spring'): number | null {
  return TREE_REGROW_DAYS[season]
}
