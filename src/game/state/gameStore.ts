import { create } from 'zustand'
import { getBreed, growSpeedFactor, harvestYield, nextRecruitBreed, pickRecruitRole } from '../data/breeds'
import { getCrop } from '../data/crops'
import {
  FOREST_LAYOUT,
  isTreeMature,
  TREE_MAX_STAGE,
  treeStageMinutesForSeason,
} from '../data/forest'
import { granaryCapacity, recruitPriceFor, findUpgradeableCat, type ShopActionId } from '../data/shop'
import {
  SELL_LABEL,
  sellPreview,
  type SellAmountMode,
  type SellResourceId,
} from '../data/sell'
import {
  dailyComfortNeed,
  dailyFishNeed,
  ROLE_LABEL,
  clampRoleLevel,
  countByRole,
  roleBehavior,
  scaledYield,
  studyYield,
  medicineCraftYield,
  tradePriceMult,
  sickChanceForRole,
  SEED_SHORTAGE_SICK_BONUS,
  SEED_SHORTAGE_DEATH_CHANCE,
  FISH_SEVERE_SHORTAGE_DEATH_CHANCE,
} from '../data/careers'
import {
  emptyGameEvent,
  eventEndMessage,
  eventStartMessage,
  fishEventYield,
  growEventMult,
  harvestEventBonus,
  MERCHANT_FISH_BUY_CAP,
  MERCHANT_FISH_PRICE,
  MERCHANT_WHEAT_MULT,
  minutesUntilDayEnd,
  rollEventGap,
  rollEventKind,
  rollMerchantDuration,
  type EventKind,
  type GameEvent,
} from '../data/events'
import {
  goalRewardText,
  goalTitle,
  isCumulativeGoal,
  isGoalMet,
  pushGoalHistory,
  rollSeasonGoal,
  type SeasonGoal,
} from '../data/goals'
import { buildDepartVoyage, settleVoyageReturn } from '../data/voyage'
import type { DialogueSituation } from '../data/catDialogue'
import {
  nextSpeechState,
  pruneExpiredBubbles,
  type SpeechBubble,
} from '../systems/catDialogue'
import {
  attachAutoSave,
  clearSavedGame,
  createFreshPersistSlice,
  loadSavedGame,
  writeSavedGame,
} from './saveGame'
import {
  absoluteGameMinute,
  isPrecipitating,
  precipKindForSeason,
  rollClearGap,
  rollPrecipDuration,
  rollRainbowAfterRain,
  rollRainbowDuration,
  type WeatherKind,
} from '../data/weather'
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
  CHOP_WOOD_YIELD,
  CHOP_DAILY_LIMIT,
  DAYS_PER_SEASON,
  FARM_SIZE,
  FISH_SOFT_CAP,
  FISH_YIELD,
  FISH_DAILY_LIMIT,
  GAME_MINUTES_PER_REAL_SECOND,
  GRANARY_BUY_ORE,
  GRANARY_BUY_PRICE,
  GRANARY_BUY_WOOD,
  GRANARY_DAILY_DECAY,
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
  HOME_POS,
  KNOWLEDGE_SOFT_CAP,
  KNOWLEDGE_PER_MEDICINE,
  MEDICINE_SOFT_CAP,
  CRAFT_DAILY_LIMIT,
  sailorMedicineLoot,
  MINE_ORE_YIELD,
  MINUTES_PER_DAY,
  ORE_SOFT_CAP,
  ROLE_UPGRADE_KNOWLEDGE,
  SEED_PACK_AMOUNT,
  SEED_PACK_PRICE,
  SNACK_PRICE,
  STUDY_DAILY_LIMIT,
  TOY_PRICE,
  WHEAT_SELL_PRICE,
  WOOD_SOFT_CAP,
  type CatBehavior,
  type CatInstance,
  type CatRole,
  type GranaryState,
  type LevelState,
  type BoatVoyage,
  type PlotState,
  type Season,
  type TreeState,
} from '../types'

function emptyPlots(): PlotState[][] {
  return Array.from({ length: FARM_SIZE }, () =>
    Array.from({ length: FARM_SIZE }, () => ({
      tilled: false,
      cropId: null,
      stage: 0,
      growProgress: 0,
      watered: false,
    })),
  )
}

function clonePlots(plots: PlotState[][]): PlotState[][] {
  return plots.map((row) => row.map((p) => ({ ...p })))
}

/** 生病期间不能干活；医生仍可炼药 */
function isSickOffDuty(cat: { sick?: boolean; role?: CatRole } | undefined): boolean {
  if (!cat?.sick) return false
  return (cat.role ?? 'farmer') !== 'doctor'
}

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

function seasonForDay(day: number): Season {
  const index = Math.floor((day - 1) / DAYS_PER_SEASON) % SEASONS.length
  return SEASONS[index]!
}

function advanceCrops(
  plots: PlotState[][],
  gameMinutes: number,
  catCount: number,
  growMult = 1,
): PlotState[][] {
  if (gameMinutes <= 0) return plots
  const sped = gameMinutes * growSpeedFactor(catCount) * growMult
  let visualChanged = false
  for (let z = 0; z < plots.length; z++) {
    const row = plots[z]!
    for (let x = 0; x < row.length; x++) {
      const plot = row[x]!
      if (!plot.cropId || !plot.watered) continue
      const crop = getCrop(plot.cropId)
      if (!crop || plot.stage >= crop.maxStage) continue

      plot.growProgress += sped
      while (plot.stage < crop.maxStage) {
        const need = crop.stageMinutes[plot.stage]
        if (need == null || plot.growProgress < need) break
        plot.growProgress -= need
        plot.stage += 1
        plot.watered = false
        plot.growProgress = 0
        visualChanged = true
        break
      }
    }
  }
  // Only new array when stage/watered changed — growProgress ticks stay in-place.
  return visualChanged ? clonePlots(plots) : plots
}

function advanceTrees(trees: TreeState[], gameMinutes: number, season: Season): TreeState[] {
  if (gameMinutes <= 0) return trees
  const stageMinutes = treeStageMinutesForSeason(season)
  if (!stageMinutes) return trees // 冬天不长
  let visualChanged = false
  for (const tree of trees) {
    if (tree.stage >= TREE_MAX_STAGE) continue
    tree.growProgress += gameMinutes
    while (tree.stage < TREE_MAX_STAGE) {
      const need = stageMinutes[tree.stage]
      if (need == null || tree.growProgress < need) break
      tree.growProgress -= need
      tree.stage += 1
      visualChanged = true
    }
  }
  return visualChanged ? trees.map((t) => ({ ...t })) : trees
}

function onNewDay(plots: PlotState[][]): PlotState[][] {
  return plots.map((row) => row.map((p) => ({ ...p, watered: false })))
}

function rainWaterPlots(plots: PlotState[][]): PlotState[][] {
  let changed = false
  const next = plots.map((row) =>
    row.map((p) => {
      if (p.cropId && !p.watered) {
        changed = true
        return { ...p, watered: true }
      }
      return p
    }),
  )
  return changed ? next : plots
}

function goalSnapshot(
  inventory: Record<string, number>,
  cottage: LevelState,
  harbor: LevelState,
  boat: LevelState,
  cats: CatInstance[],
  coins: number,
) {
  return {
    fish: inventory.fish ?? 0,
    wheat: inventory.wheat ?? 0,
    ore: inventory.ore ?? 0,
    wood: inventory.wood ?? 0,
    knowledge: inventory.knowledge ?? 0,
    coins,
    cottageLevel: cottage.level,
    harborLevel: harbor.level,
    boatLevel: boat.level,
    catCount: cats.length,
  }
}

function pickDevRoleDonor(cats: CatInstance[]): CatInstance | null {
  const civilians = cats.filter((c) => c.role === 'civilian')
  if (civilians.length > 0) return civilians[civilians.length - 1]!
  const farmers = cats.filter((c) => (c.role ?? 'farmer') === 'farmer')
  if (farmers.length > 0) return farmers[farmers.length - 1]!
  return null
}

function applyGoalIfMet(
  goal: SeasonGoal,
  inventory: Record<string, number>,
  coins: number,
  cottage: LevelState,
  harbor: LevelState,
  boat: LevelState,
  cats: CatInstance[],
  history: string[],
): {
  goal: SeasonGoal
  inventory: Record<string, number>
  coins: number
  note: string | null
  goalHistory: string[]
} {
  if (goal.completed) {
    return { goal, inventory, coins, note: null, goalHistory: history }
  }
  const snap = goalSnapshot(inventory, cottage, harbor, boat, cats, coins)
  if (!isGoalMet(goal, snap)) {
    return { goal, inventory, coins, note: null, goalHistory: history }
  }
  const inv = { ...inventory }
  inv.medicine = (inv.medicine ?? 0) + goal.rewardMedicine
  inv.knowledge = (inv.knowledge ?? 0) + goal.rewardKnowledge
  const done: SeasonGoal = { ...goal, completed: true, progress: goal.target }
  return {
    goal: done,
    inventory: inv,
    coins: coins + goal.rewardCoins,
    note: `季节目标完成：${goalTitle(goal)}（奖励 ${goalRewardText(goal)}）`,
    goalHistory: pushGoalHistory(history, done),
  }
}

/** 累计型目标 +1 并尝试发奖 */
function bumpGoalProgress(
  goal: SeasonGoal,
  kind: SeasonGoal['kind'],
  inventory: Record<string, number>,
  coins: number,
  cottage: LevelState,
  harbor: LevelState,
  boat: LevelState,
  cats: CatInstance[],
  history: string[],
) {
  let g = goal
  if (isCumulativeGoal(kind) && g.kind === kind && !g.completed) {
    g = { ...g, progress: g.progress + 1 }
  }
  return applyGoalIfMet(g, inventory, coins, cottage, harbor, boat, cats, history)
}

interface GameState {
  day: number
  minuteOfDay: number
  season: Season
  timeScale: number
  coins: number
  inventory: Record<string, number>
  granary: GranaryState
  harbor: LevelState
  boat: LevelState
  cottage: LevelState
  boatVoyage: BoatVoyage
  plots: PlotState[][]
  trees: TreeState[]
  cats: CatInstance[]
  statusMessage: string
  /** clear | rain | snow */
  weather: WeatherKind
  /** 绝对游戏分钟：本场降水结束时刻 */
  weatherUntil: number
  /** 绝对游戏分钟：下一场降水开始时刻 */
  nextWeatherAt: number
  /** 绝对游戏分钟：彩虹消失时刻；0 = 无 */
  rainbowUntil: number
  /** 偶发事件：商船 / 丰收 / 欠收 */
  gameEvent: GameEvent
  /** 天空白云数量 */
  cloudCount: number
  /** 白云漂移速度 */
  cloudSpeed: number
  /** 日/月视觉大小 */
  celestialSize: number
  /** 日/月背景弧距离（越大越贴天空背景） */
  skyOrbit: number
  /** 全灭结束 */
  gameOver: boolean
  /** 本季节轻量目标 */
  seasonGoal: SeasonGoal
  /** 近期目标去重历史（kind:target） */
  goalHistory: string[]
  /** 猫头闲聊气泡（最多 2） */
  speechBubbles: SpeechBubble[]
  lastIslandSpeechAt: number
  catSpeechAt: Record<string, number>
  catMorningOutDay: Record<string, number>
  recentLineIds: string[]
  catRecentLineIds: Record<string, string[]>
  setTimeScale: (scale: number) => void
  setCatPose: (catId: string, x: number, z: number, behavior: CatBehavior) => void
  setStatusMessage: (msg: string) => void
  tick: (deltaSeconds: number) => void
  restartGame: () => void
  tryCatSpeech: (args: {
    catId: string
    situation: DialogueSituation
    force?: boolean
  }) => boolean
  shopBuy: (id: ShopActionId) => boolean
  /** 商店回收：手动出售资源换金币 */
  shopSell: (resource: SellResourceId, mode: SellAmountMode) => boolean
  /** 职业编制：+1 从散民就任，-1 解除为散民（均免费） */
  adjustRoleCount: (role: CatRole, delta: 1 | -1) => boolean
  catHoe: (x: number, z: number) => boolean
  catPlant: (x: number, z: number) => boolean
  catWater: (x: number, z: number) => boolean
  catHarvest: (x: number, z: number) => boolean
  catSellWheat: (catId?: string) => boolean
  catMine: (catId: string) => boolean
  catChop: (catId: string, treeIndex: number) => boolean
  catFish: (catId: string) => boolean
  catStudy: (catId: string) => boolean
  catCraftMedicine: (catId: string) => boolean
  catPlay: () => boolean
  catEat: () => boolean
  /** 开发者工具：批量改状态 */
  devSet: (patch: DevPatch) => void
}

export interface DevPatch {
  day?: number
  minuteOfDay?: number
  season?: Season
  timeScale?: number
  coins?: number
  wheat?: number
  wheat_seed?: number
  ore?: number
  wood?: number
  fish?: number
  knowledge?: number
  medicine?: number
  toy?: number
  snack?: number
  granaryLevel?: number
  granaryCondition?: number
  harborLevel?: number
  boatLevel?: number
  cottageLevel?: number
  cloudCount?: number
  cloudSpeed?: number
  celestialSize?: number
  skyOrbit?: number
  weather?: WeatherKind
  /** 立刻下场雨/雪（按季节） */
  forcePrecip?: boolean
  /** 立刻放晴并重排下一场 */
  clearWeather?: boolean
  /** 立刻挂彩虹 */
  forceRainbow?: boolean
  /** 立刻清彩虹 */
  clearRainbow?: boolean
  /** 立刻让货船出海（有货才行） */
  forceVoyage?: boolean
  /** 立刻让货船回港结算 */
  forceVoyageReturn?: boolean
  /** 重抽季节目标 */
  rerollGoal?: boolean
  /** 立刻完成当前季节目标并发奖 */
  completeGoal?: boolean
  /** 清空季节目标去重历史 */
  clearGoalHistory?: boolean
  /** 立刻触发偶发事件 */
  forceEvent?: EventKind
  matureAllCrops?: boolean
  clearFarm?: boolean
  matureAllTrees?: boolean
  clearForest?: boolean
  /** 立刻砍倒一棵成材树（测树桩） */
  forceChopOne?: boolean
  /** Set every cat's role, or flip the first matching cat. */
  allCatsRole?: CatRole
  /** 全员职业等级 */
  allRoleLevel?: number
  ensureMiner?: boolean
  ensureLumberjack?: boolean
  ensureFisher?: boolean
  ensureScholar?: boolean
  ensureSailor?: boolean
  ensureDoctor?: boolean
  ensureFarmer?: boolean
  /** 让一只健康猫生病 */
  forceSickOne?: boolean
  /** 治好全部 */
  cureAll?: boolean
  /** 立刻判定一只病猫死亡（无药） */
  forceDeathSick?: boolean
  /** 清空闲聊冷却与近期句子 */
  clearSpeechCooldown?: boolean
  /** 强制某情境冒泡（随机一只健康猫） */
  forceSpeechSituation?: DialogueSituation
  /** 清除浏览器本地存档（不重置当前局） */
  clearSave?: boolean
}

const savedSlice = loadSavedGame()
const initialPersist = savedSlice ?? createFreshPersistSlice()

export const useGameStore = create<GameState>((set, get) => ({
  ...initialPersist,
  timeScale: 1,
  statusMessage: savedSlice
    ? `已读取本地进度（第 ${savedSlice.day} 天）`
    : '奶糖开始打理田地…升级建筑需要矿石和木材',
  speechBubbles: [],

  setTimeScale: (scale) => set({ timeScale: scale }),
  setStatusMessage: (msg) => set({ statusMessage: msg }),

  restartGame: () => {
    clearSavedGame()
    const fresh = createFreshPersistSlice()
    set({
      ...fresh,
      timeScale: 1,
      statusMessage: '新的一天：奶糖重新打理田地…',
      speechBubbles: [],
    })
    writeSavedGame(fresh)
  },
  setCatPose: (catId, x, z, behavior) =>
    set((s) => {
      const cat = s.cats.find((c) => c.id === catId)
      if (!cat) return s
      if (cat.x === x && cat.z === z && cat.behavior === behavior) return s
      return {
        cats: s.cats.map((c) => (c.id === catId ? { ...c, x, z, behavior } : c)),
      }
    }),

  tryCatSpeech: ({ catId, situation, force }) => {
    const s = get()
    if (s.gameOver) return false
    const cat = s.cats.find((c) => c.id === catId)
    if (!cat) return false

    let catMorningOutDay = s.catMorningOutDay
    if (situation === 'morning_out' && !force) {
      if (catMorningOutDay[catId] === s.day) return false
      catMorningOutDay = { ...catMorningOutDay, [catId]: s.day }
    }

    const next = nextSpeechState(
      {
        speechBubbles: s.speechBubbles,
        lastIslandSpeechAt: s.lastIslandSpeechAt,
        catSpeechAt: s.catSpeechAt,
        catMorningOutDay,
        recentLineIds: s.recentLineIds,
        catRecentLineIds: s.catRecentLineIds,
      },
      {
        catId,
        situation,
        role: cat.role ?? 'farmer',
        force,
      },
    )

    if (!next) {
      if (situation === 'morning_out' && !force) {
        set({ catMorningOutDay })
      }
      return false
    }

    set({
      speechBubbles: next.speechBubbles,
      lastIslandSpeechAt: next.lastIslandSpeechAt,
      catSpeechAt: next.catSpeechAt,
      catMorningOutDay: next.catMorningOutDay,
      recentLineIds: next.recentLineIds,
      catRecentLineIds: next.catRecentLineIds,
    })
    return true
  },

  devSet: (patch) => {
    const s = get()
    const next: Partial<GameState> = {}
    const inv = { ...s.inventory }

    if (patch.season != null) {
      const idx = SEASONS.indexOf(patch.season)
      next.season = patch.season
      // Snap day into that season unless day is also being set
      if (patch.day == null) {
        next.day = idx * DAYS_PER_SEASON + 5
      }
      if (!patch.rerollGoal && !patch.completeGoal) {
        const hist = pushGoalHistory(s.goalHistory, s.seasonGoal)
        next.goalHistory = hist
        next.seasonGoal = rollSeasonGoal(patch.season, next.day ?? s.day, hist)
      }
    }
    if (patch.day != null) {
      next.day = Math.max(1, Math.floor(patch.day))
      if (patch.season == null) next.season = seasonForDay(next.day)
    }
    if (patch.minuteOfDay != null) {
      next.minuteOfDay = ((Math.floor(patch.minuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
    }
    if (patch.timeScale != null) next.timeScale = Math.max(0, patch.timeScale)
    if (patch.coins != null) next.coins = Math.max(0, Math.floor(patch.coins))

    if (patch.wheat != null) inv.wheat = Math.max(0, Math.floor(patch.wheat))
    if (patch.wheat_seed != null) inv.wheat_seed = Math.max(0, Math.floor(patch.wheat_seed))
    if (patch.ore != null) inv.ore = Math.max(0, Math.floor(patch.ore))
    if (patch.wood != null) inv.wood = Math.max(0, Math.floor(patch.wood))
    if (patch.fish != null) inv.fish = Math.max(0, Math.floor(patch.fish))
    if (patch.knowledge != null) inv.knowledge = Math.max(0, Math.floor(patch.knowledge))
    if (patch.medicine != null) inv.medicine = Math.max(0, Math.floor(patch.medicine))
    if (patch.toy != null) inv.toy = Math.max(0, Math.floor(patch.toy))
    if (patch.snack != null) inv.snack = Math.max(0, Math.floor(patch.snack))

    if (
      patch.wheat != null ||
      patch.wheat_seed != null ||
      patch.ore != null ||
      patch.wood != null ||
      patch.fish != null ||
      patch.knowledge != null ||
      patch.medicine != null ||
      patch.toy != null ||
      patch.snack != null
    ) {
      next.inventory = inv
    }

    if (patch.granaryLevel != null || patch.granaryCondition != null) {
      const level = Math.max(
        0,
        Math.min(GRANARY_MAX_LEVEL, Math.floor(patch.granaryLevel ?? s.granary.level)),
      )
      const condition = Math.max(
        0,
        Math.min(100, Math.floor(patch.granaryCondition ?? s.granary.condition)),
      )
      next.granary = { level, condition: level > 0 ? condition : 100 }
    }
    if (patch.harborLevel != null) {
      next.harbor = {
        level: Math.max(1, Math.min(HARBOR_MAX_LEVEL, Math.floor(patch.harborLevel))),
      }
    }
    if (patch.boatLevel != null) {
      next.boat = {
        level: Math.max(1, Math.min(BOAT_MAX_LEVEL, Math.floor(patch.boatLevel))),
      }
    }
    if (patch.cottageLevel != null) {
      next.cottage = {
        level: Math.max(1, Math.min(COTTAGE_MAX_LEVEL, Math.floor(patch.cottageLevel))),
      }
    }
    if (patch.cloudCount != null) next.cloudCount = Math.max(0, Math.min(16, Math.floor(patch.cloudCount)))
    if (patch.cloudSpeed != null) next.cloudSpeed = Math.max(0, Math.min(4, patch.cloudSpeed))
    if (patch.celestialSize != null) next.celestialSize = Math.max(0.4, Math.min(2.5, patch.celestialSize))
    if (patch.skyOrbit != null) next.skyOrbit = Math.max(28, Math.min(90, patch.skyOrbit))

    {
      const day = next.day ?? s.day
      const minute = next.minuteOfDay ?? s.minuteOfDay
      const season = next.season ?? seasonForDay(day)
      const nowAbs = absoluteGameMinute(day, minute)
      if (patch.forcePrecip) {
        const kind = precipKindForSeason(season)
        next.weather = kind
        next.weatherUntil = nowAbs + rollPrecipDuration(season)
        next.rainbowUntil = 0
        next.statusMessage = kind === 'snow' ? '【开发者】下雪了' : '【开发者】下雨了'
      } else if (patch.clearWeather) {
        next.weather = 'clear'
        next.weatherUntil = 0
        next.nextWeatherAt = nowAbs + rollClearGap(season)
        next.statusMessage = '【开发者】天晴了'
      } else if (patch.weather != null) {
        next.weather = patch.weather
        if (patch.weather === 'clear') {
          next.weatherUntil = 0
          next.nextWeatherAt = nowAbs + rollClearGap(season)
        } else {
          next.weatherUntil = nowAbs + rollPrecipDuration(season)
          next.rainbowUntil = 0
        }
      } else if (patch.season != null && (next.weather ?? s.weather) === 'clear') {
        // 换季后重排下一场降水
        next.nextWeatherAt = nowAbs + rollClearGap(season)
      }

      if (patch.forceRainbow) {
        next.rainbowUntil = nowAbs + rollRainbowDuration()
        next.weather = 'clear'
        next.weatherUntil = 0
        next.statusMessage = '【开发者】彩虹出现了'
      } else if (patch.clearRainbow) {
        next.rainbowUntil = 0
        next.statusMessage = '【开发者】彩虹已清除'
      }

      if (patch.forceEvent != null) {
        if (patch.forceEvent === 'none') {
          next.gameEvent = emptyGameEvent(nowAbs + rollEventGap())
          next.statusMessage = '【开发者】偶发事件已清空'
        } else {
          const kind = patch.forceEvent
          const dur =
            kind === 'merchant'
              ? rollMerchantDuration()
              : Math.min(minutesUntilDayEnd(minute), 10 * 60)
          next.gameEvent = { kind, until: nowAbs + dur, nextAt: nowAbs + dur }
          next.statusMessage = `【开发者】${eventStartMessage(kind, season)}`
        }
      }
    }

    if (patch.clearFarm) {
      next.plots = emptyPlots()
    } else if (patch.matureAllCrops) {
      const crop = getCrop('wheat')
      next.plots = s.plots.map((row) =>
        row.map((p) =>
          p.cropId
            ? {
                ...p,
                stage: crop?.maxStage ?? 3,
                growProgress: 0,
                watered: true,
              }
            : p,
        ),
      )
    }

    if (patch.clearForest) {
      next.trees = s.trees.map(() => ({ stage: 0, growProgress: 0 }))
    } else if (patch.matureAllTrees) {
      next.trees = s.trees.map(() => ({ stage: TREE_MAX_STAGE, growProgress: 0 }))
    }

    if (patch.forceChopOne) {
      const list =
        (next.trees as TreeState[] | undefined) ??
        s.trees.map((t) => ({ ...t }))
      const synced =
        list.length === FOREST_LAYOUT.length
          ? list
          : FOREST_LAYOUT.map((_, i) => list[i] ?? { stage: TREE_MAX_STAGE, growProgress: 0 })
      const idx = synced.findIndex((t) => t.stage >= TREE_MAX_STAGE)
      if (idx >= 0) {
        next.trees = synced.map((t, i) => (i === idx ? { stage: 0, growProgress: 0 } : t))
        const wood = (next.inventory as Record<string, number> | undefined)?.wood ?? s.inventory.wood ?? 0
        const inv = { ...(s.inventory), ...((next.inventory as object) ?? {}) }
        if (wood < WOOD_SOFT_CAP) inv.wood = wood + CHOP_WOOD_YIELD
        next.inventory = inv
        next.statusMessage = `【开发者】砍倒第 ${idx + 1} 棵树 → 树桩`
      } else {
        next.statusMessage = '【开发者】没有成材树可砍（先点「树木全成材」）'
      }
    }

    if (patch.allCatsRole) {
      const role = patch.allCatsRole
      next.cats = s.cats.map((c) => ({
        ...c,
        role,
        roleLevel: clampRoleLevel(c.roleLevel),
        behavior: roleBehavior(role),
      }))
      if (role === 'lumberjack') {
        next.minuteOfDay = 10 * 60
        if (!patch.clearForest) {
          const base = (next.trees as TreeState[] | undefined) ?? s.trees
          next.trees = FOREST_LAYOUT.map((_, i) => base[i] ?? { stage: TREE_MAX_STAGE, growProgress: 0 }).map(
            () => ({ stage: TREE_MAX_STAGE, growProgress: 0 }),
          )
        }
      }
      if (role === 'fisher' || role === 'scholar' || role === 'sailor' || role === 'doctor') {
        next.minuteOfDay = 10 * 60
      }
    }
    if (patch.allRoleLevel != null) {
      const lv = clampRoleLevel(patch.allRoleLevel)
      const baseCats = (next.cats as CatInstance[] | undefined) ?? s.cats
      next.cats = baseCats.map((c) => ({ ...c, roleLevel: lv }))
    } else if (patch.ensureLumberjack) {
      const hasJack = s.cats.some((c) => c.role === 'lumberjack')
      const target = pickDevRoleDonor(s.cats)
      if (!hasJack && target) {
        next.cats = s.cats.map((c) =>
          c.id === target.id ? { ...c, role: 'lumberjack' as const, behavior: 'chop' } : c,
        )
        next.minuteOfDay = 10 * 60
        const base = (next.trees as TreeState[] | undefined) ?? s.trees
        next.trees = FOREST_LAYOUT.map((_, i) => base[i] ?? { stage: TREE_MAX_STAGE, growProgress: 0 }).map(
          () => ({ stage: TREE_MAX_STAGE, growProgress: 0 }),
        )
      }
    } else if (patch.ensureFisher) {
      const hasFisher = s.cats.some((c) => c.role === 'fisher')
      const target = pickDevRoleDonor(s.cats)
      if (!hasFisher && target) {
        next.cats = s.cats.map((c) =>
          c.id === target.id ? { ...c, role: 'fisher' as const, behavior: 'fish' } : c,
        )
        next.minuteOfDay = 10 * 60
      }
    } else if (patch.ensureMiner) {
      const hasMiner = s.cats.some((c) => c.role === 'miner')
      const target = pickDevRoleDonor(s.cats)
      if (!hasMiner && target) {
        next.cats = s.cats.map((c) =>
          c.id === target.id ? { ...c, role: 'miner' as const, behavior: 'mine' } : c,
        )
      }
    } else if (patch.ensureScholar) {
      const hasScholar = s.cats.some((c) => c.role === 'scholar')
      const target = pickDevRoleDonor(s.cats)
      if (!hasScholar && target) {
        next.cats = s.cats.map((c) =>
          c.id === target.id ? { ...c, role: 'scholar' as const, behavior: 'study' } : c,
        )
        next.minuteOfDay = 10 * 60
      }
    } else if (patch.ensureSailor) {
      const hasSailor = s.cats.some((c) => c.role === 'sailor')
      const target = pickDevRoleDonor(s.cats)
      if (!hasSailor && target) {
        next.cats = s.cats.map((c) =>
          c.id === target.id ? { ...c, role: 'sailor' as const, behavior: 'trade' } : c,
        )
        next.minuteOfDay = 10 * 60
      }
    } else if (patch.ensureDoctor) {
      const hasDoctor = s.cats.some((c) => c.role === 'doctor')
      const target = pickDevRoleDonor(s.cats)
      if (!hasDoctor && target) {
        next.cats = s.cats.map((c) =>
          c.id === target.id ? { ...c, role: 'doctor' as const, behavior: 'craft' } : c,
        )
        next.minuteOfDay = 10 * 60
      }
    } else if (patch.ensureFarmer) {
      const hasFarmer = s.cats.some((c) => (c.role ?? 'farmer') === 'farmer')
      if (!hasFarmer && s.cats.length > 0) {
        const target = s.cats.find((c) => c.role === 'civilian') ?? s.cats[0]!
        next.cats = s.cats.map((c) =>
          c.id === target.id ? { ...c, role: 'farmer' as const, behavior: 'idle' } : c,
        )
      }
    }

    if (patch.forceSickOne) {
      const healthy = (next.cats ?? s.cats).filter((c) => !c.sick)
      if (healthy.length > 0) {
        const target = healthy[Math.floor(Math.random() * healthy.length)]!
        next.cats = (next.cats ?? s.cats).map((c) =>
          c.id === target.id ? { ...c, sick: true, behavior: 'idle' } : c,
        )
        next.statusMessage = `【开发者】${getBreed(target.breedId)?.name ?? '小猫'}生病了`
      }
    }
    if (patch.cureAll) {
      next.cats = (next.cats ?? s.cats).map((c) => ({ ...c, sick: false }))
      next.statusMessage = '【开发者】全部痊愈'
    }
    if (patch.forceDeathSick) {
      const sickOnes = (next.cats ?? s.cats).filter((c) => c.sick)
      if (sickOnes.length > 0) {
        const target = sickOnes[0]!
        next.cats = (next.cats ?? s.cats).filter((c) => c.id !== target.id)
        next.statusMessage = `【开发者】${getBreed(target.breedId)?.name ?? '小猫'}因病离世`
        if ((next.cats ?? []).length === 0) {
          next.gameOver = true
          next.timeScale = 0
          next.statusMessage = '【开发者】全灭 · 可重新开始'
        }
      }
    }

    if (patch.clearSpeechCooldown) {
      next.speechBubbles = []
      next.lastIslandSpeechAt = 0
      next.catSpeechAt = {}
      next.catMorningOutDay = {}
      next.recentLineIds = []
      next.catRecentLineIds = {}
      next.statusMessage = '【开发者】闲聊冷却已清空'
    }

    let forceSpeech: { catId: string; situation: DialogueSituation } | null = null
    if (patch.forceSpeechSituation) {
      const pool = (next.cats ?? s.cats).filter((c) => !c.sick)
      const list = pool.length > 0 ? pool : (next.cats ?? s.cats)
      const target = list[Math.floor(Math.random() * list.length)]
      if (target) {
        next.lastIslandSpeechAt = 0
        next.catSpeechAt = { ...(next.catSpeechAt ?? s.catSpeechAt), [target.id]: 0 }
        forceSpeech = { catId: target.id, situation: patch.forceSpeechSituation }
        next.statusMessage = `【开发者】强制闲聊 · ${patch.forceSpeechSituation}`
      }
    }

    if (patch.clearSave) {
      clearSavedGame()
      next.statusMessage = '【开发者】已清除浏览器存档（当前局仍继续）'
    }

    {
      const day = next.day ?? s.day
      const minute = next.minuteOfDay ?? s.minuteOfDay
      const nowAbs = absoluteGameMinute(day, minute)
      const inv = { ...(next.inventory ?? s.inventory) }
      const cats = next.cats ?? s.cats
      const harbor = next.harbor ?? s.harbor
      const boat = next.boat ?? s.boat
      let voyage = next.boatVoyage ?? s.boatVoyage

      if (patch.forceVoyageReturn && voyage.phase === 'away') {
        voyage = { ...voyage, returnAt: nowAbs }
        const settled = settleVoyageReturn({
          nowAbs,
          minuteOfDay: minute,
          inventory: inv,
          cats,
          harbor,
          boat,
          boatVoyage: voyage,
        })
        if (settled) {
          next.boatVoyage = settled.boatVoyage
          next.inventory = settled.inventory
          next.coins = (next.coins ?? s.coins) + settled.coinsDelta
          next.statusMessage = `【开发者】${settled.statusMessage}`
          let g = next.seasonGoal ?? s.seasonGoal
          if (g.kind === 'voyages' && !g.completed) {
            const hit = bumpGoalProgress(
              g,
              'voyages',
              settled.inventory,
              next.coins ?? s.coins,
              next.cottage ?? s.cottage,
              next.harbor ?? s.harbor,
              next.boat ?? s.boat,
              cats,
              next.goalHistory ?? s.goalHistory,
            )
            next.seasonGoal = hit.goal
            next.inventory = hit.inventory
            next.coins = hit.coins
            next.goalHistory = hit.goalHistory
            if (hit.note) next.statusMessage = `【开发者】${hit.note}`
          }
        }
      } else if (patch.forceVoyage) {
        const departed = buildDepartVoyage({
          nowAbs,
          minuteOfDay: minute,
          inventory: inv,
          cats,
          harbor,
          boat,
          boatVoyage: voyage,
        })
        if (departed) {
          next.boatVoyage = departed.boatVoyage
          next.inventory = departed.inventory
          next.statusMessage = `【开发者】${departed.statusMessage}`
        } else {
          next.statusMessage = '【开发者】无法出海（需船商、货物、白天且冷却结束）'
        }
      }

      if (patch.rerollGoal) {
        const season = next.season ?? seasonForDay(day)
        const hist = pushGoalHistory(next.goalHistory ?? s.goalHistory, next.seasonGoal ?? s.seasonGoal)
        next.goalHistory = hist
        next.seasonGoal = rollSeasonGoal(season, day, hist)
        next.statusMessage = `【开发者】新目标：${goalTitle(next.seasonGoal)}（奖励 ${goalRewardText(next.seasonGoal)}）`
      }
      if (patch.completeGoal) {
        const g = next.seasonGoal ?? s.seasonGoal
        if (g.completed) {
          next.statusMessage = '【开发者】目标已完成过'
        } else {
          const inv = { ...(next.inventory ?? s.inventory) }
          inv.medicine = (inv.medicine ?? 0) + g.rewardMedicine
          inv.knowledge = (inv.knowledge ?? 0) + g.rewardKnowledge
          next.inventory = inv
          next.coins = (next.coins ?? s.coins) + g.rewardCoins
          const done = { ...g, completed: true, progress: g.target }
          next.seasonGoal = done
          next.goalHistory = pushGoalHistory(next.goalHistory ?? s.goalHistory, done)
          next.statusMessage = `【开发者】季节目标完成：${goalTitle(g)}（奖励 ${goalRewardText(g)}）`
        }
      }
      if (patch.clearGoalHistory) {
        next.goalHistory = []
        next.statusMessage = '【开发者】已清空目标历史'
      }
    }

    if (!patch.forcePrecip && !patch.clearWeather && patch.forceEvent == null) {
      if (
        !patch.forceSickOne &&
        !patch.cureAll &&
        !patch.forceDeathSick &&
        !patch.forceVoyage &&
        !patch.forceVoyageReturn &&
        !patch.rerollGoal &&
        !patch.completeGoal &&
        !patch.clearGoalHistory &&
        !patch.clearSpeechCooldown &&
        !patch.forceSpeechSituation &&
        !patch.clearSave
      ) {
        next.statusMessage = '【开发者】已应用调试参数'
      }
    }
    set(next)
    if (forceSpeech) {
      get().tryCatSpeech({ ...forceSpeech, force: true })
    }
  },
  tick: (deltaSeconds) => {
    const state = get()
    if (state.gameOver) return
    const catCount = state.cats.length
    const gameMinutes = deltaSeconds * GAME_MINUTES_PER_REAL_SECOND * state.timeScale
    let nextMinute = state.minuteOfDay + gameMinutes
    let nextDay = state.day
    let nextPlots = advanceCrops(
      state.plots,
      gameMinutes,
      catCount,
      growEventMult(state.gameEvent?.kind ?? 'none'),
    )
    let nextTrees = advanceTrees(state.trees, gameMinutes, state.season)
    let granary = { ...state.granary }
    let inventory = state.inventory
    let coins = state.coins
    let status = state.statusMessage
    let nextCats = state.cats
    let dayRolled = false
    let gameOver = false
    let boatVoyage = state.boatVoyage
    let seasonGoal = state.seasonGoal
    let goalHistory = state.goalHistory
    let voyageChanged = false
    let goalChanged = false
    let goalHistoryChanged = false
    let weather: WeatherKind = state.weather
    let weatherUntil = state.weatherUntil
    let nextWeatherAt = state.nextWeatherAt
    let weatherChanged = false
    let rainbowUntil = state.rainbowUntil
    let rainbowChanged = false
    let gameEvent: GameEvent = state.gameEvent
    let eventChanged = false

    while (nextMinute >= MINUTES_PER_DAY) {
      nextMinute -= MINUTES_PER_DAY
      nextDay += 1
      dayRolled = true
      nextPlots = onNewDay(nextPlots)

      const prevSeason = seasonForDay(nextDay - 1)
      const rollSeason = seasonForDay(nextDay)
      let seasonNote: string | null = null
      let newGoalNote: string | null = null
      if (prevSeason !== rollSeason) {
        const labels: Record<string, string> = {
          spring: '春天到了，草地返青，树上抽出嫩芽',
          summer: '夏天到了，树木葱郁，麦田正旺',
          autumn: '秋天到了，树叶染金，抓紧收麦',
          winter: '冬天到了，休耕积雪，小麦不可新种',
        }
        seasonNote = labels[rollSeason] ?? null
        if (weather === 'clear') {
          const abs = absoluteGameMinute(nextDay, nextMinute)
          nextWeatherAt = abs + rollClearGap(rollSeason)
          weatherChanged = true
        }
        goalHistory = pushGoalHistory(goalHistory, seasonGoal)
        seasonGoal = rollSeasonGoal(rollSeason, nextDay, goalHistory)
        goalChanged = true
        goalHistoryChanged = true
        newGoalNote = `新季节目标：${goalTitle(seasonGoal)}（奖励 ${goalRewardText(seasonGoal)}）`
      }

      if (granary.level > 0) {
        granary = {
          ...granary,
          condition: Math.max(0, granary.condition - GRANARY_DAILY_DECAY),
        }
      }

      const inv = { ...inventory }
      let living = nextCats.map((c) => ({ ...c }))
      const notes: string[] = []
      if (newGoalNote) notes.push(newGoalNote)

      // 1) 日耗鱼肉（药品仅治病，不当饭）
      const fishNeed = dailyFishNeed(living)
      const fishHave = inv.fish ?? 0
      let fishUsed = Math.min(fishNeed, fishHave)
      if (fishUsed > 0) inv.fish = fishHave - fishUsed
      if (fishNeed > 0) {
        if (fishUsed >= fishNeed) notes.push(`吃掉鱼肉 ×${fishUsed}`)
        else notes.push(`鱼肉不足 ${fishUsed}/${fishNeed}`)
      }

      // 2) 药品只治病：1:1；未治愈病猫翌日离世
      let cured = 0
      const diedSickNames: string[] = []
      const afterCure: typeof living = []
      for (const c of living) {
        if (!c.sick) {
          afterCure.push(c)
          continue
        }
        if ((inv.medicine ?? 0) >= 1) {
          inv.medicine = (inv.medicine ?? 0) - 1
          cured += 1
          afterCure.push({ ...c, sick: false })
        } else {
          diedSickNames.push(getBreed(c.breedId)?.name ?? '小猫')
        }
      }
      living = afterCure
      if (cured > 0) notes.push(`药品治愈 ${cured} 只病猫`)
      if (diedSickNames.length > 0) {
        notes.push(`${diedSickNames.join('、')} 因病离世`)
      }
      // 新发病：矿工/船商概率更高；麦种告罄额外压力
      const plantable = rollSeason !== 'winter'
      const seedEmpty = (inv.wheat_seed ?? 0) <= 0 && plantable
      let newlySick = 0
      living = living.map((c) => {
        if (c.sick) return c
        let chance = sickChanceForRole(c.role)
        if (seedEmpty) chance += SEED_SHORTAGE_SICK_BONUS
        if (Math.random() < chance) {
          newlySick += 1
          return { ...c, sick: true }
        }
        return c
      })
      if (newlySick > 0) notes.push(`${newlySick} 只猫生病了，快备药`)

      // 资源短缺惩罚（轻松节奏：低概率失去一只）
      const tryLoseOne = (reason: string, chance: number) => {
        if (living.length === 0 || Math.random() >= chance) return
        const idx = Math.floor(Math.random() * living.length)
        const lost = living[idx]!
        living = living.filter((_, i) => i !== idx)
        notes.push(`${getBreed(lost.breedId)?.name ?? '小猫'}因${reason}离开了喵圃`)
      }
      if (fishUsed < fishNeed * 0.5) {
        tryLoseOne('断粮', FISH_SEVERE_SHORTAGE_DEATH_CHANCE)
      }
      if (seedEmpty) {
        tryLoseOne('麦种断供', SEED_SHORTAGE_DEATH_CHANCE)
      }

      const comfortNeed = dailyComfortNeed(living)
      const snackHave = inv.snack ?? 0
      const snackUsed = Math.min(comfortNeed, snackHave)
      if (snackUsed > 0) inv.snack = snackHave - snackUsed
      const toyHave = inv.toy ?? 0
      const toyUsed = Math.min(comfortNeed, toyHave)
      if (toyUsed > 0) inv.toy = toyHave - toyUsed

      inventory = inv
      nextCats = living
      if (seasonNote) notes.unshift(seasonNote)

      if (gameEvent.kind === 'bountiful' || gameEvent.kind === 'lean') {
        const endMsg = eventEndMessage(gameEvent.kind)
        if (endMsg) notes.push(endMsg)
        gameEvent = emptyGameEvent(absoluteGameMinute(nextDay, nextMinute) + rollEventGap())
        eventChanged = true
      }

      if (living.length === 0) {
        gameOver = true
        notes.push('喵圃空无一只猫…')
      }
      if (notes.length > 0) status = notes.join(' · ')
    }

    if (dayRolled) {
      nextCats = nextCats.map((c) => ({
        ...c,
        chopsToday: 0,
        castsToday: 0,
        studiesToday: 0,
        craftsToday: 0,
        roleLevel: clampRoleLevel(c.roleLevel),
      }))
    }

    const nextSeason = seasonForDay(nextDay)
    const nowAbs = absoluteGameMinute(nextDay, nextMinute)

    if (isPrecipitating(weather)) {
      if (nowAbs >= weatherUntil) {
        const ended = weather
        weather = 'clear'
        weatherUntil = 0
        nextWeatherAt = nowAbs + rollClearGap(nextSeason)
        weatherChanged = true
        if (ended === 'rain') {
          const dur = rollRainbowAfterRain(nextMinute)
          if (dur > 0) {
            rainbowUntil = nowAbs + dur
            rainbowChanged = true
            status = '雨停了，天边挂起一道彩虹'
          } else {
            status = '雨停了，天晴了'
          }
        } else {
          status = '雪停了，天晴了'
        }
      } else {
        nextPlots = rainWaterPlots(nextPlots)
      }
    } else if (nowAbs >= nextWeatherAt) {
      const kind = precipKindForSeason(nextSeason)
      weather = kind
      weatherUntil = nowAbs + rollPrecipDuration(nextSeason)
      weatherChanged = true
      if (rainbowUntil > 0) {
        rainbowUntil = 0
        rainbowChanged = true
      }
      status = kind === 'snow' ? '下雪了，户外先歇一歇' : '下雨了，田地润了，户外先避雨'
      nextPlots = rainWaterPlots(nextPlots)
    }

    if (rainbowUntil > 0 && nowAbs >= rainbowUntil) {
      rainbowUntil = 0
      rainbowChanged = true
    }

    // 偶发事件
    if (gameEvent.kind !== 'none' && nowAbs >= gameEvent.until) {
      const endMsg = eventEndMessage(gameEvent.kind)
      if (endMsg) status = endMsg
      gameEvent = emptyGameEvent(nowAbs + rollEventGap())
      eventChanged = true
    } else if (gameEvent.kind === 'none' && nowAbs >= gameEvent.nextAt) {
      const hour = nextMinute / 60
      const kind = rollEventKind(nextSeason)
      if (kind === 'merchant' && (hour < 7 || hour >= 18)) {
        gameEvent = { ...gameEvent, nextAt: nowAbs + 90 }
        eventChanged = true
      } else {
        const dur =
          kind === 'merchant'
            ? rollMerchantDuration()
            : Math.min(minutesUntilDayEnd(nextMinute), 10 * 60)
        gameEvent = { kind, until: nowAbs + dur, nextAt: nowAbs + dur }
        status = eventStartMessage(kind, nextSeason)
        eventChanged = true
      }
    }

    // 货船回港
    {
      const settled = settleVoyageReturn({
        nowAbs,
        minuteOfDay: nextMinute,
        inventory,
        cats: nextCats,
        harbor: state.harbor,
        boat: state.boat,
        boatVoyage,
      })
      if (settled) {
        boatVoyage = settled.boatVoyage
        inventory = settled.inventory
        coins += settled.coinsDelta
        status = settled.statusMessage
        voyageChanged = true
        if (seasonGoal.kind === 'voyages' && !seasonGoal.completed) {
          const hit = bumpGoalProgress(
            seasonGoal,
            'voyages',
            inventory,
            coins,
            state.cottage,
            state.harbor,
            state.boat,
            nextCats,
            goalHistory,
          )
          seasonGoal = hit.goal
          inventory = hit.inventory
          coins = hit.coins
          if (hit.goalHistory !== goalHistory) {
            goalHistory = hit.goalHistory
            goalHistoryChanged = true
          }
          goalChanged = true
          if (hit.note) status = hit.note
        }
      }
    }

    // 货船自动出海（白天、有船商、有货、冷却好）
    {
      const departed = buildDepartVoyage({
        nowAbs,
        minuteOfDay: nextMinute,
        inventory,
        cats: nextCats,
        harbor: state.harbor,
        boat: state.boat,
        boatVoyage,
      })
      if (departed) {
        boatVoyage = departed.boatVoyage
        inventory = departed.inventory
        status = departed.statusMessage
        voyageChanged = true
      }
    }

    // 季节目标达成发奖
    {
      const hit = applyGoalIfMet(
        seasonGoal,
        inventory,
        coins,
        state.cottage,
        state.harbor,
        state.boat,
        nextCats,
        goalHistory,
      )
      if (hit.note) {
        seasonGoal = hit.goal
        inventory = hit.inventory
        coins = hit.coins
        status = hit.note
        goalChanged = true
      } else if (hit.goal !== seasonGoal) {
        seasonGoal = hit.goal
        goalChanged = true
      }
      if (hit.goalHistory !== goalHistory) {
        goalHistory = hit.goalHistory
        goalHistoryChanged = true
      }
    }

    // Always advance sim time; only notify React subscribers when something visible changes.
    const floorBefore = Math.floor(state.minuteOfDay)
    const floorAfter = Math.floor(nextMinute)
    const plotsChanged = nextPlots !== state.plots
    const treesChanged = nextTrees !== state.trees
    const dayChanged = nextDay !== state.day
    const catsChanged = nextCats !== state.cats
    const granaryChanged =
      granary.level !== state.granary.level || granary.condition !== state.granary.condition
    const invChanged = inventory !== state.inventory
    const statusChanged = status !== state.statusMessage
    const gameOverChanged = gameOver !== state.gameOver
    const coinsChanged = coins !== state.coins
    const speechBubbles = pruneExpiredBubbles(state.speechBubbles)
    const speechChanged = speechBubbles.length !== state.speechBubbles.length

    if (
      floorAfter !== floorBefore ||
      plotsChanged ||
      treesChanged ||
      dayChanged ||
      catsChanged ||
      granaryChanged ||
      invChanged ||
      statusChanged ||
      weatherChanged ||
      rainbowChanged ||
      eventChanged ||
      gameOverChanged ||
      voyageChanged ||
      goalChanged ||
      goalHistoryChanged ||
      coinsChanged ||
      speechChanged
    ) {
      set({
        minuteOfDay: nextMinute,
        day: nextDay,
        season: nextSeason,
        plots: nextPlots,
        trees: nextTrees,
        cats: nextCats,
        granary,
        inventory,
        coins,
        statusMessage: status,
        weather,
        weatherUntil,
        nextWeatherAt,
        rainbowUntil,
        gameEvent,
        boatVoyage,
        seasonGoal,
        goalHistory,
        speechBubbles,
        ...(gameOver ? { gameOver: true, timeScale: 0 } : {}),
      })
    } else {
      // Keep precise time for sky/lights via getState(), without React re-renders.
      state.minuteOfDay = nextMinute
      state.weather = weather
      state.weatherUntil = weatherUntil
      state.nextWeatherAt = nextWeatherAt
      state.rainbowUntil = rainbowUntil
      state.gameEvent = gameEvent
    }
  },

  shopBuy: (id) => {
    const { coins, inventory, granary, harbor, boat, cottage, cats, gameOver } = get()
    if (gameOver) return false
    const inv = { ...inventory }
    const ore = inv.ore ?? 0
    const wood = inv.wood ?? 0
    const knowledge = inv.knowledge ?? 0

    const pay = (price: number, oreCost = 0, woodCost = 0, knowledgeCost = 0) => {
      if (coins < price) {
        set({ statusMessage: '金币不够…可去「回收」折价卖货，或让船商去码头卖麦' })
        return false
      }
      if (oreCost > 0 && ore < oreCost) {
        set({ statusMessage: `矿石不够（需 ${oreCost}），让猫咪去山里挖矿` })
        return false
      }
      if (woodCost > 0 && wood < woodCost) {
        set({ statusMessage: `木材不够（需 ${woodCost}），让伐木工去树林砍` })
        return false
      }
      if (knowledgeCost > 0 && knowledge < knowledgeCost) {
        set({ statusMessage: `知识不够（需 ${knowledgeCost}），让学者研读` })
        return false
      }
      return true
    }

    const applyPay = (price: number, oreCost = 0, woodCost = 0, knowledgeCost = 0) => {
      inv.ore = ore - oreCost
      inv.wood = wood - woodCost
      inv.knowledge = knowledge - knowledgeCost
      return coins - price
    }

    switch (id) {
      case 'buy_seed': {
        if (!pay(SEED_PACK_PRICE)) return false
        inv.wheat_seed = (inv.wheat_seed ?? 0) + SEED_PACK_AMOUNT
        set({
          coins: coins - SEED_PACK_PRICE,
          inventory: inv,
          statusMessage: `购入麦种 ×${SEED_PACK_AMOUNT}`,
        })
        return true
      }
      case 'buy_toy': {
        if (!pay(TOY_PRICE)) return false
        inv.toy = (inv.toy ?? 0) + 1
        set({ coins: coins - TOY_PRICE, inventory: inv, statusMessage: '购入猫咪玩具 ×1' })
        return true
      }
      case 'buy_snack': {
        if (!pay(SNACK_PRICE)) return false
        inv.snack = (inv.snack ?? 0) + 1
        set({ coins: coins - SNACK_PRICE, inventory: inv, statusMessage: '购入猫咪零食 ×1' })
        return true
      }
      case 'recruit_cat': {
        const cap = catCapForCottage(cottage.level)
        if (cats.length >= cap) {
          set({ statusMessage: `猫口已满（${cap}），升级小屋可扩容` })
          return false
        }
        const owned = cats.map((c) => c.breedId)
        const breed = nextRecruitBreed(owned)
        if (!breed) {
          set({ statusMessage: '没有更多可招募的品种了' })
          return false
        }
        const price = recruitPriceFor(breed.recruitPrice, cats.length)
        if (!pay(price)) return false
        const idx = cats.length
        const role = pickRecruitRole(cats)
        const newbie: CatInstance = {
          id: `cat-${breed.id}-${idx}`,
          breedId: breed.id,
          x: HOME_POS.x + (idx % 3) * 0.7,
          z: HOME_POS.z + Math.floor(idx / 3) * 0.7,
          behavior: roleBehavior(role),
          role,
          roleLevel: 1,
          chopsToday: 0,
          castsToday: 0,
          studiesToday: 0,
          craftsToday: 0,
          sick: false,
        }
        set({
          coins: coins - price,
          cats: [...cats, newbie],
          statusMessage: `迎来了${breed.title}「${breed.name}」（${ROLE_LABEL[role]}）！花费 ${price} 金`,
        })
        return true
      }
      case 'upgrade_role': {
        const target = findUpgradeableCat(cats)
        if (!target) {
          set({ statusMessage: '所有猫职业已满级' })
          return false
        }
        const nextLv = clampRoleLevel(target.roleLevel) + 1
        const need = ROLE_UPGRADE_KNOWLEDGE[nextLv] ?? 99
        if (!pay(0, 0, 0, need)) return false
        const nextCoins = applyPay(0, 0, 0, need)
        const name = getBreed(target.breedId)?.name ?? '小猫'
        set({
          coins: nextCoins,
          inventory: inv,
          cats: cats.map((c) => (c.id === target.id ? { ...c, roleLevel: nextLv } : c)),
          statusMessage: `${name}的${ROLE_LABEL[target.role ?? 'farmer']}升到 Lv.${nextLv}（-${need} 知识）`,
        })
        return true
      }
      case 'cottage_upgrade': {
        if (cottage.level >= COTTAGE_MAX_LEVEL) return false
        const next = cottage.level + 1
        const price = COTTAGE_UPGRADE_PRICE[next]
        const needOre = COTTAGE_UPGRADE_ORE[next] ?? 0
        const needWood = COTTAGE_UPGRADE_WOOD[next] ?? 0
        const needKnow = COTTAGE_UPGRADE_KNOWLEDGE[next] ?? 0
        if (price == null || !pay(price, needOre, needWood, needKnow)) return false
        const nextCoins = applyPay(price, needOre, needWood, needKnow)
        set({
          coins: nextCoins,
          inventory: inv,
          cottage: { level: next },
          statusMessage: `小屋升到 Lv.${next}，猫口上限 ${catCapForCottage(next)}`,
        })
        return true
      }
      case 'granary_buy': {
        if (granary.level > 0) return false
        if (!pay(GRANARY_BUY_PRICE, GRANARY_BUY_ORE, GRANARY_BUY_WOOD)) return false
        const nextCoins = applyPay(GRANARY_BUY_PRICE, GRANARY_BUY_ORE, GRANARY_BUY_WOOD)
        set({
          coins: nextCoins,
          inventory: inv,
          granary: { level: 1, condition: 100 },
          statusMessage: '建好了 1 级粮仓！记得定期修缮',
        })
        return true
      }
      case 'granary_upgrade': {
        if (granary.level <= 0 || granary.level >= GRANARY_MAX_LEVEL) return false
        const next = granary.level + 1
        const price = GRANARY_UPGRADE_PRICE[next]
        const needOre = GRANARY_UPGRADE_ORE[next] ?? 0
        const needWood = GRANARY_UPGRADE_WOOD[next] ?? 0
        const needKnow = GRANARY_UPGRADE_KNOWLEDGE[next] ?? 0
        if (price == null || !pay(price, needOre, needWood, needKnow)) return false
        const nextCoins = applyPay(price, needOre, needWood, needKnow)
        set({
          coins: nextCoins,
          inventory: inv,
          granary: { ...granary, level: next, condition: Math.min(100, granary.condition + 10) },
          statusMessage: `粮仓升到 Lv.${next}（-${needOre} 矿 · -${needWood} 木 · -${needKnow} 知识）`,
        })
        return true
      }
      case 'granary_repair': {
        if (granary.level <= 0) return false
        if (granary.condition >= 100) {
          set({ statusMessage: '粮仓完好，无需修缮' })
          return false
        }
        if (!pay(GRANARY_REPAIR_COST)) return false
        const cond = Math.min(100, granary.condition + GRANARY_REPAIR_AMOUNT)
        set({
          coins: coins - GRANARY_REPAIR_COST,
          granary: { ...granary, condition: cond },
          statusMessage: `粮仓修缮完成，完好度 ${cond}`,
        })
        return true
      }
      case 'harbor_upgrade': {
        if (harbor.level >= HARBOR_MAX_LEVEL) return false
        const next = harbor.level + 1
        const price = HARBOR_UPGRADE_PRICE[next]
        const needOre = HARBOR_UPGRADE_ORE[next] ?? 0
        const needWood = HARBOR_UPGRADE_WOOD[next] ?? 0
        const needKnow = HARBOR_UPGRADE_KNOWLEDGE[next] ?? 0
        if (price == null || !pay(price, needOre, needWood, needKnow)) return false
        const nextCoins = applyPay(price, needOre, needWood, needKnow)
        set({
          coins: nextCoins,
          inventory: inv,
          harbor: { level: next },
          statusMessage: `港口升到 Lv.${next}（-${needOre} 矿 · -${needWood} 木 · -${needKnow} 知识）`,
        })
        return true
      }
      case 'boat_upgrade': {
        if (boat.level >= BOAT_MAX_LEVEL) return false
        const next = boat.level + 1
        const price = BOAT_UPGRADE_PRICE[next]
        const needOre = BOAT_UPGRADE_ORE[next] ?? 0
        const needWood = BOAT_UPGRADE_WOOD[next] ?? 0
        const needKnow = BOAT_UPGRADE_KNOWLEDGE[next] ?? 0
        if (price == null || !pay(price, needOre, needWood, needKnow)) return false
        const nextCoins = applyPay(price, needOre, needWood, needKnow)
        set({
          coins: nextCoins,
          inventory: inv,
          boat: { level: next },
          statusMessage: `货船升到 Lv.${next}（-${needOre} 矿 · -${needWood} 木 · -${needKnow} 知识）`,
        })
        return true
      }
      default:
        return false
    }
  },

  shopSell: (resource, mode) => {
    const { inventory, cats, coins, gameOver } = get()
    if (gameOver) return false
    const preview = sellPreview(resource, mode, inventory, cats)
    if (preview.qty <= 0) {
      if (resource === 'fish') {
        set({ statusMessage: '鱼肉须留足明日口粮，暂无可售' })
      } else {
        set({ statusMessage: `${SELL_LABEL[resource]}库存不足` })
      }
      return false
    }
    const inv = { ...inventory }
    inv[resource] = (inv[resource] ?? 0) - preview.qty
    set({
      inventory: inv,
      coins: coins + preview.earn,
      statusMessage: `回收${SELL_LABEL[resource]} ×${preview.qty}（+${preview.earn} 金 · 单价 ${preview.unit}）`,
    })
    return true
  },

  adjustRoleCount: (role, delta) => {
    const { cats, gameOver } = get()
    if (gameOver || cats.length === 0) return false
    if (role === 'civilian') return false
    const counts = countByRole(cats)

    if (delta === 1) {
      // 散民就任免费
      if (counts.civilian <= 0) {
        set({ statusMessage: '没有散民可分配，请先解除其他职业' })
        return false
      }
      const donor = cats.find((c) => c.role === 'civilian')
      if (!donor) return false
      const name = getBreed(donor.breedId)?.name ?? '小猫'
      set({
        cats: cats.map((c) =>
          c.id === donor.id
            ? { ...c, role, roleLevel: 1, behavior: roleBehavior(role) }
            : c,
        ),
        statusMessage: `${name}就任${ROLE_LABEL[role]}（散民 −1）`,
      })
      return true
    }

    // delta === -1：解除职业 → 散民（免费）
    if (counts[role] <= 0) return false
    const specialist = cats.find((c) => (c.role ?? 'farmer') === role)
    if (!specialist) return false
    const name = getBreed(specialist.breedId)?.name ?? '小猫'
    set({
      cats: cats.map((c) =>
        c.id === specialist.id
          ? { ...c, role: 'civilian' as const, roleLevel: 1, behavior: 'wander' }
          : c,
      ),
      statusMessage: `${name}卸任成散民，四处闲逛等待分配（${ROLE_LABEL[role]} −1）`,
    })
    return true
  },

  catHoe: (x, z) => {
    const { plots } = get()
    const plot = plots[z]?.[x]
    if (!plot || plot.cropId || plot.tilled) return false
    const next = clonePlots(plots)
    next[z]![x]!.tilled = true
    set({ plots: next, statusMessage: `翻好了 (${x + 1},${z + 1}) 号田` })
    return true
  },

  catPlant: (x, z) => {
    const { plots, inventory, season } = get()
    const plot = plots[z]?.[x]
    const crop = getCrop('wheat')
    if (!plot || !crop || !plot.tilled || plot.cropId) return false
    if (!crop.seasons.includes(season)) return false
    if ((inventory.wheat_seed ?? 0) <= 0) return false
    const next = clonePlots(plots)
    const nextInv = { ...inventory, wheat_seed: (inventory.wheat_seed ?? 0) - 1 }
    next[z]![x] = {
      tilled: true,
      cropId: 'wheat',
      stage: 0,
      growProgress: 0,
      watered: false,
    }
    set({ plots: next, inventory: nextInv, statusMessage: '播下小麦（麦种 -1）' })
    return true
  },

  catWater: (x, z) => {
    const { plots } = get()
    const plot = plots[z]?.[x]
    if (!plot?.cropId || plot.watered) return false
    const next = clonePlots(plots)
    next[z]![x]!.watered = true
    set({ plots: next, statusMessage: `浇水 (${x + 1},${z + 1})` })
    return true
  },

  catHarvest: (x, z) => {
    const { plots, inventory, granary, cats, seasonGoal, cottage, harbor, boat, coins, goalHistory } =
      get()
    const plot = plots[z]?.[x]
    if (!plot?.cropId) return false
    const crop = getCrop(plot.cropId)
    if (!crop || plot.stage < crop.maxStage) return false

    const cap = granaryCapacity(granary)
    const wheatNow = inventory.wheat ?? 0
    const space = cap - wheatNow
    if (space <= 0) {
      set({ statusMessage: '粮仓已满！先去港口卖掉，或升级/修缮粮仓' })
      return false
    }

    const farmerLevels = cats
      .filter((c) => (c.role ?? 'farmer') === 'farmer')
      .map((c) => clampRoleLevel(c.roleLevel))
    const yieldAmt =
      harvestYield(crop.harvestAmount, cats.length, farmerLevels) +
      harvestEventBonus(get().gameEvent.kind)
    const gained = Math.min(yieldAmt, space)
    const next = clonePlots(plots)
    next[z]![x] = {
      tilled: false,
      cropId: null,
      stage: 0,
      growProgress: 0,
      watered: false,
    }
    const nextInv = { ...inventory, wheat: wheatNow + gained }
    const hit = bumpGoalProgress(
      seasonGoal,
      'harvests',
      nextInv,
      coins,
      cottage,
      harbor,
      boat,
      cats,
      goalHistory,
    )
    set({
      plots: next,
      inventory: hit.inventory,
      coins: hit.coins,
      seasonGoal: hit.goal,
      goalHistory: hit.goalHistory,
      statusMessage:
        hit.note ??
        (cats.length > 1
          ? `收割小麦 +${gained}（${cats.length} 猫加成）`
          : `收割小麦 +${gained}`),
    })
    return true
  },

  catSellWheat: (catId) => {
    const { inventory, coins, gameEvent, cats, gameOver } = get()
    if (gameOver) return false
    if (catId) {
      const actor = cats.find((c) => c.id === catId)
      if (isSickOffDuty(actor)) {
        set({ statusMessage: '病猫在歇着，治好再去贸易' })
        return false
      }
    }
    const wheat = inventory.wheat ?? 0
    const fish = inventory.fish ?? 0
    const merchant = gameEvent.kind === 'merchant'
    if (wheat <= 0 && !(merchant && fish > 0)) return false

    const sailors = cats.filter((c) => c.role === 'sailor')
    const sailorMult = tradePriceMult(sailors)
    const wheatPrice = Math.round(
      (merchant ? WHEAT_SELL_PRICE * MERCHANT_WHEAT_MULT : WHEAT_SELL_PRICE) * sailorMult,
    )
    const fishPrice = Math.round(MERCHANT_FISH_PRICE * sailorMult)
    const sellFish = merchant ? Math.min(fish, MERCHANT_FISH_BUY_CAP) : 0
    const wheatEarn = wheat * wheatPrice
    const fishEarn = sellFish * fishPrice
    const earned = wheatEarn + fishEarn

    const trader = catId ? cats.find((c) => c.id === catId) : null
    const medNow = inventory.medicine ?? 0
    let medLoot = 0
    if (trader?.role === 'sailor' && medNow < MEDICINE_SOFT_CAP) {
      medLoot = Math.min(MEDICINE_SOFT_CAP - medNow, sailorMedicineLoot(trader.roleLevel))
    }

    const parts: string[] = []
    if (wheat > 0) parts.push(`小麦 ×${wheat}`)
    if (sellFish > 0) parts.push(`鱼肉 ×${sellFish}`)
    const sailorNote =
      sailors.length > 0 ? ` · 船商加成 ×${sailorMult.toFixed(2)}` : ''
    const lootNote = medLoot > 0 ? ` · 带回药品 ×${medLoot}` : ''
    set({
      coins: coins + earned,
      inventory: {
        ...inventory,
        wheat: 0,
        fish: fish - sellFish,
        medicine: medNow + medLoot,
      },
      statusMessage: merchant
        ? `商船收购${parts.join('、')}，+${earned} 金币${sailorNote}${lootNote}`
        : `港口卖出小麦 ×${wheat}，+${earned} 金币${sailorNote}${lootNote}`,
    })
    return true
  },

  catMine: (catId) => {
    const { inventory, cats } = get()
    const cat = cats.find((c) => c.id === catId)
    if (isSickOffDuty(cat)) {
      set({ statusMessage: '病猫在歇着，治好再挖矿' })
      return false
    }
    const ore = inventory.ore ?? 0
    if (ore >= ORE_SOFT_CAP) {
      set({ statusMessage: '矿石已经囤了不少' })
      return false
    }
    const gained = scaledYield(MINE_ORE_YIELD, cat?.roleLevel)
    const name = cat ? getBreed(cat.breedId)?.name ?? '小猫' : '小猫'
    set({
      inventory: { ...inventory, ore: Math.min(ORE_SOFT_CAP, ore + gained) },
      cats: cats.map((c) => (c.id === catId ? { ...c, behavior: 'mine' } : c)),
      statusMessage: `矿工${name}挖到矿石 +${gained}`,
    })
    return true
  },

  catChop: (catId, treeIndex) => {
    const { inventory, cats, trees, seasonGoal, cottage, harbor, boat, coins, goalHistory } = get()
    const cat = cats.find((c) => c.id === catId)
    if (isSickOffDuty(cat)) {
      set({ statusMessage: '病猫在歇着，治好再伐木' })
      return false
    }
    if ((cat?.chopsToday ?? 0) >= CHOP_DAILY_LIMIT) {
      set({ statusMessage: '今天已经砍够了，明天再来' })
      return false
    }
    // 布局热更新后长度可能对不上，自动补齐
    let treeList = trees
    if (treeList.length !== FOREST_LAYOUT.length) {
      treeList = FOREST_LAYOUT.map((_, i) => trees[i] ?? { stage: TREE_MAX_STAGE, growProgress: 0 })
    }
    let idx = treeIndex
    let tree: TreeState | undefined = treeList[idx]
    if (!tree || !isTreeMature(tree)) {
      idx = treeList.findIndex((t) => isTreeMature(t))
      tree = idx >= 0 ? treeList[idx] : undefined
    }
    if (idx < 0 || !tree) {
      set({ statusMessage: '没有成材的树可砍' })
      return false
    }
    const wood = inventory.wood ?? 0
    const atCap = wood >= WOOD_SOFT_CAP
    const gained = atCap ? 0 : scaledYield(CHOP_WOOD_YIELD, cat?.roleLevel)
    const name = cat ? getBreed(cat.breedId)?.name ?? '小猫' : '小猫'
    const nextChops = (cat?.chopsToday ?? 0) + 1
    const nextTrees = treeList.map((t, i) => (i === idx ? { stage: 0, growProgress: 0 } : t))
    const nextInv =
      gained > 0 ? { ...inventory, wood: Math.min(WOOD_SOFT_CAP, wood + gained) } : inventory
    const hit = bumpGoalProgress(
      seasonGoal,
      'chops',
      nextInv,
      coins,
      cottage,
      harbor,
      boat,
      cats,
      goalHistory,
    )
    set({
      inventory: hit.inventory,
      coins: hit.coins,
      trees: nextTrees,
      seasonGoal: hit.goal,
      goalHistory: hit.goalHistory,
      cats: cats.map((c) =>
        c.id === catId ? { ...c, behavior: 'chop', chopsToday: nextChops } : c,
      ),
      statusMessage:
        hit.note ??
        (atCap
          ? `伐木工${name}砍下一棵树（木材已满，留下树桩）今日 ${nextChops}/${CHOP_DAILY_LIMIT}`
          : `伐木工${name}砍下一棵树 +${gained} 木（今日 ${nextChops}/${CHOP_DAILY_LIMIT}）`),
    })
    return true
  },

  catFish: (catId) => {
    const { inventory, cats } = get()
    const cat = cats.find((c) => c.id === catId)
    if (isSickOffDuty(cat)) {
      set({ statusMessage: '病猫在歇着，治好再钓鱼' })
      return false
    }
    if ((cat?.castsToday ?? 0) >= FISH_DAILY_LIMIT) {
      set({ statusMessage: '今天已经钓够了，明天再来' })
      return false
    }
    const fish = inventory.fish ?? 0
    if (fish >= FISH_SOFT_CAP) {
      set({ statusMessage: '鱼肉已经囤了不少' })
      return false
    }
    const base = fishEventYield(FISH_YIELD, get().gameEvent.kind)
    const gained = scaledYield(base, cat?.roleLevel)
    const name = cat ? getBreed(cat.breedId)?.name ?? '小猫' : '小猫'
    const nextCasts = (cat?.castsToday ?? 0) + 1
    set({
      inventory: { ...inventory, fish: Math.min(FISH_SOFT_CAP, fish + gained) },
      cats: cats.map((c) =>
        c.id === catId ? { ...c, behavior: 'fish', castsToday: nextCasts } : c,
      ),
      statusMessage: `渔夫${name}钓到鱼肉 +${gained}（今日 ${nextCasts}/${FISH_DAILY_LIMIT}）`,
    })
    return true
  },

  catStudy: (catId) => {
    const { inventory, cats } = get()
    const cat = cats.find((c) => c.id === catId)
    if (isSickOffDuty(cat)) {
      set({ statusMessage: '病猫在歇着，治好再研读' })
      return false
    }
    if ((cat?.studiesToday ?? 0) >= STUDY_DAILY_LIMIT) {
      set({ statusMessage: '今天已经研读够了，明天再来' })
      return false
    }
    const knowledge = inventory.knowledge ?? 0
    if (knowledge >= KNOWLEDGE_SOFT_CAP) {
      set({ statusMessage: '知识已经囤了不少' })
      return false
    }
    const gained = studyYield(cat?.roleLevel)
    const name = cat ? getBreed(cat.breedId)?.name ?? '小猫' : '小猫'
    const nextStudies = (cat?.studiesToday ?? 0) + 1
    set({
      inventory: { ...inventory, knowledge: Math.min(KNOWLEDGE_SOFT_CAP, knowledge + gained) },
      cats: cats.map((c) =>
        c.id === catId ? { ...c, behavior: 'study', studiesToday: nextStudies } : c,
      ),
      statusMessage: `学者${name}研读获得知识 +${gained}（今日 ${nextStudies}/${STUDY_DAILY_LIMIT}）`,
    })
    return true
  },

  catCraftMedicine: (catId) => {
    const { inventory, cats, gameOver, seasonGoal, cottage, harbor, boat, coins, goalHistory } = get()
    if (gameOver) return false
    const cat = cats.find((c) => c.id === catId)
    // 医生生病仍可炼药；其他职业不可
    if (cat?.sick && (cat.role ?? 'farmer') !== 'doctor') {
      set({ statusMessage: '病猫在歇着' })
      return false
    }
    if ((cat?.craftsToday ?? 0) >= CRAFT_DAILY_LIMIT) {
      set({ statusMessage: '今天已经炼药够了，明天再来' })
      return false
    }
    const knowledge = inventory.knowledge ?? 0
    if (knowledge < KNOWLEDGE_PER_MEDICINE) {
      set({ statusMessage: `知识不够（需 ${KNOWLEDGE_PER_MEDICINE}），让学者研读` })
      return false
    }
    const medicine = inventory.medicine ?? 0
    if (medicine >= MEDICINE_SOFT_CAP) {
      set({ statusMessage: '药品已经囤了不少' })
      return false
    }
    const gained = medicineCraftYield(cat?.roleLevel)
    const name = cat ? getBreed(cat.breedId)?.name ?? '小猫' : '小猫'
    const nextCrafts = (cat?.craftsToday ?? 0) + 1
    const nextInv = {
      ...inventory,
      knowledge: knowledge - KNOWLEDGE_PER_MEDICINE,
      medicine: Math.min(MEDICINE_SOFT_CAP, medicine + gained),
    }
    const hit = bumpGoalProgress(
      seasonGoal,
      'craft_medicine',
      nextInv,
      coins,
      cottage,
      harbor,
      boat,
      cats,
      goalHistory,
    )
    set({
      inventory: hit.inventory,
      coins: hit.coins,
      seasonGoal: hit.goal,
      goalHistory: hit.goalHistory,
      cats: cats.map((c) =>
        c.id === catId ? { ...c, behavior: 'craft', craftsToday: nextCrafts } : c,
      ),
      statusMessage:
        hit.note ??
        `医生${name}炼成药品 +${gained}（-${KNOWLEDGE_PER_MEDICINE} 知识 · 今日 ${nextCrafts}/${CRAFT_DAILY_LIMIT}）`,
    })
    return true
  },

  catPlay: () => {
    const { inventory, cats } = get()
    if ((inventory.toy ?? 0) <= 0) return false
    set({
      inventory: { ...inventory, toy: (inventory.toy ?? 0) - 1 },
      statusMessage: `小猫玩了玩具（剩 ${cats.length} 猫更费玩具）`,
    })
    return true
  },

  catEat: () => {
    const { inventory } = get()
    if ((inventory.snack ?? 0) <= 0) return false
    set({
      inventory: { ...inventory, snack: (inventory.snack ?? 0) - 1 },
      statusMessage: '小猫吃了零食（零食 -1）',
    })
    return true
  },
}))

attachAutoSave(useGameStore)

export { getBreed }
