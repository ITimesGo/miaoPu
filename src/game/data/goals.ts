import type { Season } from '../types'

export type GoalKind =
  | 'stock_fish'
  | 'stock_wheat'
  | 'stock_ore'
  | 'stock_wood'
  | 'stock_coins'
  | 'stock_knowledge'
  | 'cottage_level'
  | 'harbor_level'
  | 'boat_level'
  | 'cat_count'
  | 'voyages'
  | 'craft_medicine'
  | 'harvests'
  | 'chops'

export interface SeasonGoal {
  kind: GoalKind
  target: number
  /** 累计型进度（出航/炼药/收获/伐木）；存量型读实时数值 */
  progress: number
  season: Season
  completed: boolean
  rewardLabel: string
  rewardCoins: number
  rewardMedicine: number
  rewardKnowledge: number
}

export type GoalCandidate = { kind: GoalKind; target: number }

/** 去重窗口：约覆盖 10 年 × 4 季 */
export const GOAL_HISTORY_LIMIT = 40

export function goalKey(goal: Pick<SeasonGoal, 'kind' | 'target'> | GoalCandidate): string {
  return `${goal.kind}:${goal.target}`
}

export function pushGoalHistory(history: string[], goal: Pick<SeasonGoal, 'kind' | 'target'>): string[] {
  const key = goalKey(goal)
  const next = [...history.filter((k) => k !== key), key]
  return next.length > GOAL_HISTORY_LIMIT ? next.slice(next.length - GOAL_HISTORY_LIMIT) : next
}

const GOAL_LABEL: Record<GoalKind, (n: number) => string> = {
  stock_fish: (n) => `囤鱼肉达到 ${n}`,
  stock_wheat: (n) => `囤小麦达到 ${n}`,
  stock_ore: (n) => `囤矿石达到 ${n}`,
  stock_wood: (n) => `囤木材达到 ${n}`,
  stock_coins: (n) => `囤金币达到 ${n}`,
  stock_knowledge: (n) => `囤知识达到 ${n}`,
  cottage_level: (n) => `小屋升到 Lv.${n}`,
  harbor_level: (n) => `港口升到 Lv.${n}`,
  boat_level: (n) => `货船升到 Lv.${n}`,
  cat_count: (n) => `猫群达到 ${n} 只`,
  voyages: (n) => `货船出航 ${n} 次`,
  craft_medicine: (n) => `炼成药品 ${n} 次`,
  harvests: (n) => `收获作物 ${n} 次`,
  chops: (n) => `伐木 ${n} 次`,
}

/** 累计型：靠 progress；其余读快照 */
export function isCumulativeGoal(kind: GoalKind): boolean {
  return kind === 'voyages' || kind === 'craft_medicine' || kind === 'harvests' || kind === 'chops'
}

function rewardFor(
  kind: GoalKind,
  target: number,
): Pick<SeasonGoal, 'rewardCoins' | 'rewardMedicine' | 'rewardKnowledge' | 'rewardLabel'> {
  switch (kind) {
    case 'stock_fish':
      return { rewardCoins: 14 + target, rewardMedicine: 1, rewardKnowledge: 0, rewardLabel: `金币+药品` }
    case 'stock_wheat':
      return {
        rewardCoins: 18 + Math.floor(target / 2),
        rewardMedicine: 0,
        rewardKnowledge: 2,
        rewardLabel: `金币+知识`,
      }
    case 'stock_ore':
      return { rewardCoins: 16 + target * 2, rewardMedicine: 0, rewardKnowledge: 1, rewardLabel: `金币+知识` }
    case 'stock_wood':
      return { rewardCoins: 14 + target * 2, rewardMedicine: 1, rewardKnowledge: 0, rewardLabel: `金币+药品` }
    case 'stock_coins':
      return {
        rewardCoins: Math.max(20, Math.floor(target / 4)),
        rewardMedicine: 1,
        rewardKnowledge: 1,
        rewardLabel: `综合奖励`,
      }
    case 'stock_knowledge':
      return { rewardCoins: 20 + target * 3, rewardMedicine: 1, rewardKnowledge: 2, rewardLabel: `丰厚奖励` }
    case 'cottage_level':
      return { rewardCoins: 28 * target, rewardMedicine: 1, rewardKnowledge: 3, rewardLabel: `丰厚奖励` }
    case 'harbor_level':
      return { rewardCoins: 26 * target, rewardMedicine: 2, rewardKnowledge: 1, rewardLabel: `金币+药品` }
    case 'boat_level':
      return { rewardCoins: 26 * target, rewardMedicine: 1, rewardKnowledge: 2, rewardLabel: `金币+知识` }
    case 'cat_count':
      return { rewardCoins: 14 * target, rewardMedicine: 0, rewardKnowledge: 2, rewardLabel: `金币+知识` }
    case 'voyages':
      return { rewardCoins: 22 * target, rewardMedicine: 2, rewardKnowledge: 0, rewardLabel: `金币+药品` }
    case 'craft_medicine':
      return { rewardCoins: 12 * target, rewardMedicine: 1, rewardKnowledge: 3, rewardLabel: `知识+药品` }
    case 'harvests':
      return { rewardCoins: 10 + target * 4, rewardMedicine: 0, rewardKnowledge: 2, rewardLabel: `金币+知识` }
    case 'chops':
      return { rewardCoins: 10 + target * 5, rewardMedicine: 1, rewardKnowledge: 1, rewardLabel: `综合奖励` }
  }
}

function expand(kind: GoalKind, targets: number[]): GoalCandidate[] {
  return targets.map((target) => ({ kind, target }))
}

/**
 * 四季大池：同种类多档数值 + 新种类。
 * 合计约 90+ 条，配合 40 条历史去重，约 10 年内少重复。
 */
export const SEASON_GOAL_POOLS: Record<Season, GoalCandidate[]> = {
  spring: [
    ...expand('stock_wheat', [6, 8, 10, 12, 14, 16, 20]),
    ...expand('stock_fish', [4, 6, 8, 10]),
    ...expand('stock_wood', [3, 5, 7, 9]),
    ...expand('stock_ore', [2, 4, 6]),
    ...expand('stock_coins', [100, 140, 180]),
    ...expand('stock_knowledge', [3, 5, 8]),
    ...expand('cat_count', [2, 3]),
    ...expand('cottage_level', [2]),
    ...expand('harbor_level', [2]),
    ...expand('voyages', [1, 2]),
    ...expand('harvests', [3, 5, 8, 10]),
    ...expand('chops', [2, 4, 6]),
    ...expand('craft_medicine', [1, 2]),
  ],
  summer: [
    ...expand('stock_fish', [6, 8, 10, 12, 14, 16]),
    ...expand('stock_wheat', [8, 10, 12, 14]),
    ...expand('stock_ore', [3, 5, 7, 9, 11]),
    ...expand('stock_wood', [4, 6, 8]),
    ...expand('stock_coins', [120, 160, 200, 240]),
    ...expand('stock_knowledge', [4, 6, 9]),
    ...expand('cat_count', [2, 3, 4]),
    ...expand('cottage_level', [2, 3]),
    ...expand('harbor_level', [2]),
    ...expand('boat_level', [2]),
    ...expand('voyages', [1, 2, 3]),
    ...expand('craft_medicine', [1, 2, 3]),
    ...expand('harvests', [4, 6, 8, 12]),
    ...expand('chops', [3, 5, 7]),
  ],
  autumn: [
    ...expand('stock_wheat', [10, 12, 14, 16, 18, 22, 26]),
    ...expand('stock_fish', [6, 8, 10, 12]),
    ...expand('stock_wood', [5, 7, 9, 11]),
    ...expand('stock_ore', [4, 6, 8]),
    ...expand('stock_coins', [150, 200, 250]),
    ...expand('stock_knowledge', [5, 8, 10]),
    ...expand('cat_count', [3, 4]),
    ...expand('cottage_level', [2, 3]),
    ...expand('harbor_level', [2, 3]),
    ...expand('boat_level', [2]),
    ...expand('voyages', [2, 3]),
    ...expand('harvests', [5, 8, 10, 14]),
    ...expand('chops', [4, 6, 8]),
    ...expand('craft_medicine', [2, 3]),
  ],
  winter: [
    ...expand('stock_fish', [8, 10, 12, 14, 16, 18]),
    ...expand('stock_ore', [5, 7, 9, 12]),
    ...expand('stock_wood', [6, 8, 10, 12]),
    ...expand('stock_coins', [160, 220, 280]),
    ...expand('stock_knowledge', [6, 9, 12]),
    ...expand('stock_wheat', [8, 12]),
    ...expand('cat_count', [3, 4]),
    ...expand('cottage_level', [2, 3]),
    ...expand('harbor_level', [2, 3]),
    ...expand('boat_level', [2, 3]),
    ...expand('voyages', [1, 2]),
    ...expand('craft_medicine', [2, 3, 4]),
    ...expand('chops', [3, 5, 7, 9]),
  ],
}

function pickFromPool(
  list: GoalCandidate[],
  history: string[],
  avoidLast: number,
  dayHint: number,
  season: Season,
): GoalCandidate {
  const recent = new Set(history.slice(-avoidLast))
  const filtered = list.filter((c) => !recent.has(goalKey(c)))
  const pool = filtered.length > 0 ? filtered : list
  const seed = Math.abs(Math.floor(dayHint * 17 + season.length * 13 + history.length * 7))
  const fallback = pool[seed % pool.length]!
  return pool[Math.floor(Math.random() * pool.length)] ?? fallback
}

/** 按季节抽目标；避开近期历史（先 40，不够再 20，再不够允许重复） */
export function rollSeasonGoal(
  season: Season,
  dayHint = 1,
  history: string[] = [],
): SeasonGoal {
  const list = SEASON_GOAL_POOLS[season]
  let choice = pickFromPool(list, history, GOAL_HISTORY_LIMIT, dayHint, season)
  if (history.includes(goalKey(choice)) && history.length >= Math.floor(GOAL_HISTORY_LIMIT / 2)) {
    choice = pickFromPool(list, history, Math.floor(GOAL_HISTORY_LIMIT / 2), dayHint + 3, season)
  }
  const reward = rewardFor(choice.kind, choice.target)
  return {
    kind: choice.kind,
    target: choice.target,
    progress: 0,
    season,
    completed: false,
    ...reward,
  }
}

export function goalTitle(goal: SeasonGoal): string {
  return GOAL_LABEL[goal.kind](goal.target)
}

/** 列出具体奖励，如「金币 ×40 · 药品 ×1」 */
export function goalRewardText(goal: SeasonGoal): string {
  const parts: string[] = []
  if (goal.rewardCoins > 0) parts.push(`金币 ×${goal.rewardCoins}`)
  if (goal.rewardMedicine > 0) parts.push(`药品 ×${goal.rewardMedicine}`)
  if (goal.rewardKnowledge > 0) parts.push(`知识 ×${goal.rewardKnowledge}`)
  return parts.length > 0 ? parts.join(' · ') : '无'
}

export type GoalSnap = {
  fish: number
  wheat: number
  ore: number
  wood: number
  knowledge: number
  coins: number
  cottageLevel: number
  harborLevel: number
  boatLevel: number
  catCount: number
}

export function liveGoalProgress(goal: SeasonGoal, ctx: GoalSnap): number {
  switch (goal.kind) {
    case 'stock_fish':
      return Math.min(goal.target, ctx.fish)
    case 'stock_wheat':
      return Math.min(goal.target, ctx.wheat)
    case 'stock_ore':
      return Math.min(goal.target, ctx.ore)
    case 'stock_wood':
      return Math.min(goal.target, ctx.wood)
    case 'stock_coins':
      return Math.min(goal.target, ctx.coins)
    case 'stock_knowledge':
      return Math.min(goal.target, ctx.knowledge)
    case 'cottage_level':
      return Math.min(goal.target, ctx.cottageLevel)
    case 'harbor_level':
      return Math.min(goal.target, ctx.harborLevel)
    case 'boat_level':
      return Math.min(goal.target, ctx.boatLevel)
    case 'cat_count':
      return Math.min(goal.target, ctx.catCount)
    case 'voyages':
    case 'craft_medicine':
    case 'harvests':
    case 'chops':
      return Math.min(goal.target, goal.progress)
  }
}

export function isGoalMet(goal: SeasonGoal, ctx: GoalSnap): boolean {
  if (goal.completed) return true
  return liveGoalProgress(goal, ctx) >= goal.target
}

/** 候选条数（说明书用） */
export function seasonGoalPoolSize(season?: Season): number {
  if (season) return SEASON_GOAL_POOLS[season].length
  return (Object.keys(SEASON_GOAL_POOLS) as Season[]).reduce(
    (n, s) => n + SEASON_GOAL_POOLS[s].length,
    0,
  )
}
