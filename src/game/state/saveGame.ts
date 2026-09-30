import { FOREST_LAYOUT, createInitialTrees } from '../data/forest'
import { emptyGameEvent, rollEventGap, type GameEvent } from '../data/events'
import {
  GOAL_HISTORY_LIMIT,
  type GoalKind,
  type SeasonGoal,
  rollSeasonGoal,
} from '../data/goals'
import {
  FARM_SIZE,
  emptyBoatVoyage,
  type BoatVoyage,
  type CatInstance,
  type CatRole,
  type GranaryState,
  type LevelState,
  type PlotState,
  type Season,
  type TreeState,
} from '../types'
import { absoluteGameMinute, rollClearGap, type WeatherKind } from '../data/weather'
import { createStarterCat } from '../data/breeds'

export const SAVE_VERSION = 1
export const SAVE_KEY = `miaopu.save.v${SAVE_VERSION}`

const GOAL_KINDS = new Set<GoalKind>([
  'stock_fish',
  'stock_wheat',
  'stock_ore',
  'stock_wood',
  'stock_coins',
  'stock_knowledge',
  'cottage_level',
  'harbor_level',
  'boat_level',
  'cat_count',
  'voyages',
  'craft_medicine',
  'harvests',
  'chops',
])

const SEASONS = new Set<Season>(['spring', 'summer', 'autumn', 'winter'])
const WEATHERS = new Set<WeatherKind>(['clear', 'rain', 'snow'])
const ROLES = new Set<CatRole>([
  'civilian',
  'farmer',
  'miner',
  'lumberjack',
  'fisher',
  'scholar',
  'sailor',
  'doctor',
])

/** 可写入 localStorage 的进度切片（不含 actions / 瞬时 UI） */
export type PersistSlice = {
  day: number
  minuteOfDay: number
  season: Season
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
  weather: WeatherKind
  weatherUntil: number
  nextWeatherAt: number
  rainbowUntil: number
  gameEvent: GameEvent
  cloudCount: number
  cloudSpeed: number
  celestialSize: number
  skyOrbit: number
  gameOver: boolean
  seasonGoal: SeasonGoal
  goalHistory: string[]
  lastIslandSpeechAt: number
  catSpeechAt: Record<string, number>
  catMorningOutDay: Record<string, number>
  recentLineIds: string[]
  catRecentLineIds: Record<string, string[]>
}

type SaveFile = {
  version: number
  savedAt: number
  data: PersistSlice
}

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

export function createFreshPersistSlice(): PersistSlice {
  return {
    day: 1,
    minuteOfDay: 8 * 60,
    season: 'spring',
    coins: 80,
    inventory: {
      wheat_seed: 8,
      wheat: 0,
      toy: 2,
      snack: 3,
      ore: 0,
      wood: 0,
      fish: 4,
      knowledge: 0,
      medicine: 0,
    },
    granary: { level: 0, condition: 100 },
    harbor: { level: 1 },
    boat: { level: 1 },
    cottage: { level: 1 },
    boatVoyage: emptyBoatVoyage(absoluteGameMinute(1, 8 * 60) + 3 * 60),
    plots: emptyPlots(),
    trees: createInitialTrees(),
    cats: [createStarterCat()],
    weather: 'clear',
    weatherUntil: 0,
    nextWeatherAt: absoluteGameMinute(1, 8 * 60) + rollClearGap('spring'),
    rainbowUntil: 0,
    gameEvent: emptyGameEvent(absoluteGameMinute(1, 8 * 60) + rollEventGap()),
    cloudCount: 7,
    cloudSpeed: 1,
    celestialSize: 1.15,
    skyOrbit: 52,
    gameOver: false,
    seasonGoal: rollSeasonGoal('spring', 1, []),
    goalHistory: [],
    lastIslandSpeechAt: 0,
    catSpeechAt: {},
    catMorningOutDay: {},
    recentLineIds: [],
    catRecentLineIds: {},
  }
}

export function pickPersistSlice(s: PersistSlice): PersistSlice {
  return {
    day: s.day,
    minuteOfDay: s.minuteOfDay,
    season: s.season,
    coins: s.coins,
    inventory: { ...s.inventory },
    granary: { ...s.granary },
    harbor: { ...s.harbor },
    boat: { ...s.boat },
    cottage: { ...s.cottage },
    boatVoyage: { ...s.boatVoyage },
    plots: s.plots.map((row) => row.map((p) => ({ ...p }))),
    trees: s.trees.map((t) => ({ ...t })),
    cats: s.cats.map((c) => ({ ...c })),
    weather: s.weather,
    weatherUntil: s.weatherUntil,
    nextWeatherAt: s.nextWeatherAt,
    rainbowUntil: s.rainbowUntil,
    gameEvent: { ...s.gameEvent },
    cloudCount: s.cloudCount,
    cloudSpeed: s.cloudSpeed,
    celestialSize: s.celestialSize,
    skyOrbit: s.skyOrbit,
    gameOver: s.gameOver,
    seasonGoal: { ...s.seasonGoal },
    goalHistory: [...s.goalHistory],
    lastIslandSpeechAt: s.lastIslandSpeechAt,
    catSpeechAt: { ...s.catSpeechAt },
    catMorningOutDay: { ...s.catMorningOutDay },
    recentLineIds: [...s.recentLineIds],
    catRecentLineIds: Object.fromEntries(
      Object.entries(s.catRecentLineIds).map(([k, v]) => [k, [...v]]),
    ),
  }
}

function asNum(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function sanitizePlots(raw: unknown): PlotState[][] {
  const fresh = emptyPlots()
  if (!Array.isArray(raw) || raw.length !== FARM_SIZE) return fresh
  return fresh.map((row, z) =>
    row.map((cell, x) => {
      const p = (raw as unknown[][])[z]?.[x] as Partial<PlotState> | undefined
      if (!p || typeof p !== 'object') return cell
      return {
        tilled: Boolean(p.tilled),
        cropId: typeof p.cropId === 'string' ? p.cropId : null,
        stage: Math.max(0, Math.floor(asNum(p.stage, 0))),
        growProgress: Math.max(0, asNum(p.growProgress, 0)),
        watered: Boolean(p.watered),
      }
    }),
  )
}

function sanitizeTrees(raw: unknown): TreeState[] {
  const base = createInitialTrees()
  if (!Array.isArray(raw)) return base
  return FOREST_LAYOUT.map((_, i) => {
    const t = raw[i] as Partial<TreeState> | undefined
    if (!t || typeof t !== 'object') return base[i]!
    return {
      stage: Math.max(0, Math.min(3, Math.floor(asNum(t.stage, 3)))),
      growProgress: Math.max(0, asNum(t.growProgress, 0)),
    }
  })
}

function sanitizeCats(raw: unknown): CatInstance[] {
  if (!Array.isArray(raw) || raw.length === 0) return [createStarterCat()]
  const out: CatInstance[] = []
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue
    const o = c as Partial<CatInstance>
    if (typeof o.id !== 'string' || typeof o.breedId !== 'string') continue
    const role = ROLES.has(o.role as CatRole) ? (o.role as CatRole) : 'farmer'
    out.push({
      id: o.id,
      breedId: o.breedId,
      x: asNum(o.x, 0),
      z: asNum(o.z, 0),
      behavior: typeof o.behavior === 'string' ? o.behavior : 'idle',
      role,
      roleLevel: Math.max(1, Math.floor(asNum(o.roleLevel, 1))),
      chopsToday: Math.max(0, Math.floor(asNum(o.chopsToday, 0))),
      castsToday: Math.max(0, Math.floor(asNum(o.castsToday, 0))),
      studiesToday: Math.max(0, Math.floor(asNum(o.studiesToday, 0))),
      craftsToday: Math.max(0, Math.floor(asNum(o.craftsToday, 0))),
      sick: Boolean(o.sick),
    })
  }
  return out.length > 0 ? out : [createStarterCat()]
}

function sanitizeGoal(raw: unknown, season: Season, day: number, history: string[]): SeasonGoal {
  if (!raw || typeof raw !== 'object') return rollSeasonGoal(season, day, history)
  const g = raw as Partial<SeasonGoal>
  if (!GOAL_KINDS.has(g.kind as GoalKind)) return rollSeasonGoal(season, day, history)
  return {
    kind: g.kind as GoalKind,
    target: Math.max(1, Math.floor(asNum(g.target, 1))),
    progress: Math.max(0, Math.floor(asNum(g.progress, 0))),
    season: SEASONS.has(g.season as Season) ? (g.season as Season) : season,
    completed: Boolean(g.completed),
    rewardLabel: typeof g.rewardLabel === 'string' ? g.rewardLabel : '奖励',
    rewardCoins: Math.max(0, Math.floor(asNum(g.rewardCoins, 0))),
    rewardMedicine: Math.max(0, Math.floor(asNum(g.rewardMedicine, 0))),
    rewardKnowledge: Math.max(0, Math.floor(asNum(g.rewardKnowledge, 0))),
  }
}

function sanitizeSlice(raw: unknown): PersistSlice | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<PersistSlice>
  const day = Math.max(1, Math.floor(asNum(d.day, 1)))
  const season = SEASONS.has(d.season as Season) ? (d.season as Season) : 'spring'
  const history = Array.isArray(d.goalHistory)
    ? d.goalHistory.filter((k): k is string => typeof k === 'string').slice(-GOAL_HISTORY_LIMIT)
    : []
  const fresh = createFreshPersistSlice()
  return {
    day,
    minuteOfDay: Math.max(0, asNum(d.minuteOfDay, 8 * 60) % (24 * 60)),
    season,
    coins: Math.max(0, Math.floor(asNum(d.coins, fresh.coins))),
    inventory:
      d.inventory && typeof d.inventory === 'object'
        ? Object.fromEntries(
            Object.entries(d.inventory).map(([k, v]) => [k, Math.max(0, Math.floor(asNum(v, 0)))]),
          )
        : fresh.inventory,
    granary: {
      level: Math.max(0, Math.floor(asNum(d.granary?.level, 0))),
      condition: Math.max(0, Math.min(100, asNum(d.granary?.condition, 100))),
    },
    harbor: { level: Math.max(1, Math.floor(asNum(d.harbor?.level, 1))) },
    boat: { level: Math.max(1, Math.floor(asNum(d.boat?.level, 1))) },
    cottage: { level: Math.max(1, Math.floor(asNum(d.cottage?.level, 1))) },
    boatVoyage:
      d.boatVoyage && typeof d.boatVoyage === 'object'
        ? {
            phase: d.boatVoyage.phase === 'away' ? 'away' : 'docked',
            returnAt: asNum(d.boatVoyage.returnAt, 0),
            readyAt: asNum(d.boatVoyage.readyAt, 0),
            cargoFish: Math.max(0, Math.floor(asNum(d.boatVoyage.cargoFish, 0))),
            cargoWood: Math.max(0, Math.floor(asNum(d.boatVoyage.cargoWood, 0))),
            expectedCoins: Math.max(0, Math.floor(asNum(d.boatVoyage.expectedCoins, 0))),
          }
        : fresh.boatVoyage,
    plots: sanitizePlots(d.plots),
    trees: sanitizeTrees(d.trees),
    cats: sanitizeCats(d.cats),
    weather: WEATHERS.has(d.weather as WeatherKind) ? (d.weather as WeatherKind) : 'clear',
    weatherUntil: asNum(d.weatherUntil, 0),
    nextWeatherAt: asNum(d.nextWeatherAt, fresh.nextWeatherAt),
    rainbowUntil: asNum(d.rainbowUntil, 0),
    gameEvent:
      d.gameEvent && typeof d.gameEvent === 'object'
        ? {
            kind:
              d.gameEvent.kind === 'merchant' ||
              d.gameEvent.kind === 'bountiful' ||
              d.gameEvent.kind === 'lean'
                ? d.gameEvent.kind
                : 'none',
            until: asNum(d.gameEvent.until, 0),
            nextAt: asNum(d.gameEvent.nextAt, fresh.gameEvent.nextAt),
          }
        : fresh.gameEvent,
    cloudCount: Math.max(0, Math.floor(asNum(d.cloudCount, 7))),
    cloudSpeed: Math.max(0.1, asNum(d.cloudSpeed, 1)),
    celestialSize: Math.max(0.5, asNum(d.celestialSize, 1.15)),
    skyOrbit: Math.max(20, asNum(d.skyOrbit, 52)),
    gameOver: asBool(d.gameOver, false),
    seasonGoal: sanitizeGoal(d.seasonGoal, season, day, history),
    goalHistory: history,
    lastIslandSpeechAt: asNum(d.lastIslandSpeechAt, 0),
    catSpeechAt:
      d.catSpeechAt && typeof d.catSpeechAt === 'object'
        ? Object.fromEntries(
            Object.entries(d.catSpeechAt).map(([k, v]) => [k, asNum(v, 0)]),
          )
        : {},
    catMorningOutDay:
      d.catMorningOutDay && typeof d.catMorningOutDay === 'object'
        ? Object.fromEntries(
            Object.entries(d.catMorningOutDay).map(([k, v]) => [k, Math.floor(asNum(v, 0))]),
          )
        : {},
    recentLineIds: Array.isArray(d.recentLineIds)
      ? d.recentLineIds.filter((x): x is string => typeof x === 'string').slice(-20)
      : [],
    catRecentLineIds:
      d.catRecentLineIds && typeof d.catRecentLineIds === 'object'
        ? Object.fromEntries(
            Object.entries(d.catRecentLineIds).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(-8) : [],
            ]),
          )
        : {},
  }
}

export function loadSavedGame(): PersistSlice | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SaveFile>
    if (parsed.version !== SAVE_VERSION) return null
    return sanitizeSlice(parsed.data)
  } catch {
    return null
  }
}

export function writeSavedGame(slice: PersistSlice): void {
  try {
    const file: SaveFile = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      data: pickPersistSlice(slice),
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(file))
  } catch {
    // quota / private mode — ignore
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // ignore
  }
}

type AutoSaveStore = {
  getState: () => PersistSlice
  subscribe: (listener: () => void) => () => void
}

/** 订阅 store：防抖写入；页面关闭前再刷一次 */
export function attachAutoSave(store: AutoSaveStore, debounceMs = 1200): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    writeSavedGame(store.getState())
  }

  const unsub = store.subscribe(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      writeSavedGame(store.getState())
    }, debounceMs)
  })

  const onHide = () => flush()
  window.addEventListener('pagehide', onHide)
  window.addEventListener('beforeunload', onHide)

  return () => {
    unsub()
    window.removeEventListener('pagehide', onHide)
    window.removeEventListener('beforeunload', onHide)
    if (timer) clearTimeout(timer)
  }
}
