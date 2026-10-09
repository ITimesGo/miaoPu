export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type CatBehavior =
  | 'idle'
  | 'walk'
  | 'sleep'
  | 'hoe'
  | 'plant'
  | 'water'
  | 'harvest'
  | 'trade'
  | 'waitGrow'
  | 'play'
  | 'eat'
  | 'mine'
  | 'chop'
  | 'fish'
  | 'watchFish'
  | 'wander'
  | 'study'
  | 'craft'

export type CoatPattern = 'solid' | 'tabby' | 'tuxedo' | 'calico' | 'siamese' | 'smoke'

export interface CatPalette {
  fur: string
  furDark: string
  belly: string
  cheek: string
  earInner: string
  nose: string
  eye: string
  eyeHighlight: string
  collar: string
  pattern: CoatPattern
  accessory: 'bow' | 'strawhat' | 'scarf' | 'flower' | 'bandana' | 'bells'
  /** 体型倍率，区分胖瘦高矮 */
  bodyScale: number
  accent?: string
  accent2?: string
}

export interface CatBreed {
  id: string
  name: string
  title: string
  palette: CatPalette
  /** 基础招募价；实际价格随已有猫数递增 */
  recruitPrice: number
}

export type CatRole =
  | 'civilian'
  | 'farmer'
  | 'miner'
  | 'lumberjack'
  | 'fisher'
  | 'scholar'
  | 'sailor'
  | 'doctor'

export interface CatInstance {
  id: string
  breedId: string
  x: number
  z: number
  behavior: CatBehavior
  /** 散民 / 农夫 / 矿工 / 伐木 / 渔夫 / 学者 / 船商 / 医生 */
  role: CatRole
  /** 职业等级 1…ROLE_MAX_LEVEL，影响产能与日耗 */
  roleLevel: number
  /** 今日已砍树次数（跨日清零） */
  chopsToday: number
  /** 今日已采矿次数（跨日清零） */
  minesToday: number
  /** 今日已钓鱼次数（跨日清零） */
  castsToday: number
  /** 今日已研读次数（跨日清零） */
  studiesToday: number
  /** 今日已炼药次数（跨日清零） */
  craftsToday: number
  /** 是否生病：需药品治疗，未治翌日死亡；生病期间不能干活（医生除外） */
  sick: boolean
  /** 玩具/零食开心加成结束的绝对游戏分钟；0 = 无 */
  boostUntil: number
}

export interface PlotState {
  tilled: boolean
  cropId: string | null
  stage: number
  growProgress: number
  watered: boolean
}

/** 树林单棵：0 树桩 → 1 幼苗 → 2 小树 → 3 成材可砍 */
export interface TreeState {
  stage: number
  growProgress: number
}

export interface GranaryState {
  level: number
  condition: number
}

/** 港口 / 船等级（1 起步，可升级） */
export interface LevelState {
  level: number
}

export const FARM_SIZE = 6
export const MINUTES_PER_DAY = 24 * 60
export const DAYS_PER_SEASON = 10
export const GAME_MINUTES_PER_REAL_SECOND = MINUTES_PER_DAY / (6 * 60)

export const FARM_ORIGIN_X = 2
export const FARM_ORIGIN_Z = -1
export const FARM_CELL = 1.1

export const HARBOR_ORIGIN = { x: 11.4, z: -8.6 }
/** 猫咪走到码头摊位的落点 */
export const HARBOR_POS = { x: 10.6, z: -7.8 }
/** 小屋世界坐标（中心） */
export const COTTAGE_POS = { x: -6, z: 4 }
/** 小屋门口（朝向麦田）前的落点 — 日间活动 */
export const HOME_POS = { x: -3.6, z: 3.3 }
/** 粮仓：小屋东北侧，与小屋错开，门口朝麦田 */
export const GRANARY_POS = { x: -0.6, z: 6.4 }
export const MINE_POS = { x: -8.6, z: -5.8 }
/** 矿山东侧（右侧、靠岛内）树林伐木点 */
export const FOREST_POS = { x: -4.8, z: -7.0 }
/** 池塘中心（北侧看鱼） */
export const POND_POS = { x: 3.8, z: 8.2 }

/** 小屋朝向麦田中心的偏航角 */
export function cottageYaw(): number {
  const farmCx = FARM_ORIGIN_X + (FARM_SIZE * FARM_CELL) / 2 - FARM_CELL / 2
  const farmCz = FARM_ORIGIN_Z + (FARM_SIZE * FARM_CELL) / 2 - FARM_CELL / 2
  return Math.atan2(farmCx - COTTAGE_POS.x, farmCz - COTTAGE_POS.z)
}

/** 粮仓门口朝向麦田中心 */
export function granaryYaw(): number {
  const farmCx = FARM_ORIGIN_X + (FARM_SIZE * FARM_CELL) / 2 - FARM_CELL / 2
  const farmCz = FARM_ORIGIN_Z + (FARM_SIZE * FARM_CELL) / 2 - FARM_CELL / 2
  return Math.atan2(farmCx - GRANARY_POS.x, farmCz - GRANARY_POS.z)
}

/** 粮仓局部坐标 → 世界 XZ（门口在局部 +Z） */
export function granaryLocalToWorld(lx: number, lz: number) {
  const yaw = granaryYaw()
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return {
    x: GRANARY_POS.x + lx * c + lz * s,
    z: GRANARY_POS.z - lx * s + lz * c,
  }
}

/** 粮仓门前落点（多猫错开） */
export function granaryDoorPos(catIndex = 0) {
  return granaryLocalToWorld((catIndex % 3) * 0.45 - 0.45, 1.55)
}

/** 小屋局部坐标 → 世界 XZ */
export function cottageLocalToWorld(lx: number, lz: number) {
  const yaw = cottageYaw()
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  return {
    x: COTTAGE_POS.x + lx * c + lz * s,
    z: COTTAGE_POS.z - lx * s + lz * c,
  }
}

/** 夜间睡在屋内的落点（多猫错开） */
export function sleepPosForCat(catIndex: number) {
  const slots: [number, number][] = [
    [-0.55, -0.25],
    [0.55, -0.25],
    [0, 0.2],
    [-0.5, 0.35],
    [0.5, 0.35],
    [0, -0.5],
    [-0.7, 0.05],
    [0.7, 0.05],
  ]
  const [lx, lz] = slots[catIndex % slots.length]!
  return cottageLocalToWorld(lx, lz)
}

/** 门廊外（进门经过点 / 出门落点）— 局部门口在 +Z */
export function cottageDoorOutside() {
  return cottageLocalToWorld(0, 2.6)
}

/** 门框门槛（必须经过） */
export function cottageDoorThreshold() {
  return cottageLocalToWorld(0, 1.52)
}

/** 日夜切换：6 点起、20 点睡；进出门错开间隔（游戏分钟） */
export const DAY_START_MINUTE = 6 * 60
export const NIGHT_START_MINUTE = 20 * 60
export const DOOR_STAGGER_MINUTES = 18

export function exitTurnMinute(catIndex: number) {
  return DAY_START_MINUTE + catIndex * DOOR_STAGGER_MINUTES
}

export const WHEAT_SELL_PRICE = 8
export const POCKET_WHEAT_CAP = 8
export const GRANARY_CAPACITY: Record<number, number> = {
  1: 30,
  2: 60,
  3: 100,
  4: 160,
  5: 240,
  6: 340,
  7: 460,
  8: 600,
}
export const GRANARY_MAX_LEVEL = 8
export const GRANARY_BUY_PRICE = 105
export const GRANARY_BUY_ORE = 3
export const GRANARY_BUY_WOOD = 5
/** 升级目标等级 → 金币（前期轻度抬高；Lv4+ 再叠陡坡） */
export const GRANARY_UPGRADE_PRICE: Record<number, number> = {
  2: 190,
  3: 350,
  4: 690,
  5: 1130,
  6: 1720,
  7: 2600,
  8: 3880,
}
export const GRANARY_UPGRADE_ORE: Record<number, number> = {
  2: 6,
  3: 11,
  4: 21,
  5: 35,
  6: 49,
  7: 67,
  8: 88,
}
export const GRANARY_UPGRADE_WOOD: Record<number, number> = {
  2: 5,
  3: 9,
  4: 18,
  5: 27,
  6: 37,
  7: 51,
  8: 69,
}
export const GRANARY_UPGRADE_KNOWLEDGE: Record<number, number> = {
  2: 8,
  3: 15,
  4: 26,
  5: 41,
  6: 58,
  7: 78,
  8: 108,
}
export const GRANARY_REPAIR_COST = 45
export const GRANARY_REPAIR_AMOUNT = 45
export const GRANARY_DAILY_DECAY = 8

export const HARBOR_MAX_LEVEL = 8
export const HARBOR_UPGRADE_PRICE: Record<number, number> = {
  2: 225,
  3: 400,
  4: 745,
  5: 1230,
  6: 1875,
  7: 2765,
  8: 4050,
}
export const HARBOR_UPGRADE_ORE: Record<number, number> = {
  2: 10,
  3: 17,
  4: 32,
  5: 47,
  6: 64,
  7: 85,
  8: 114,
}
export const HARBOR_UPGRADE_WOOD: Record<number, number> = {
  2: 8,
  3: 12,
  4: 23,
  5: 35,
  6: 49,
  7: 67,
  8: 88,
}
export const HARBOR_UPGRADE_KNOWLEDGE: Record<number, number> = {
  2: 10,
  3: 17,
  4: 32,
  5: 47,
  6: 67,
  7: 91,
  8: 125,
}

export const BOAT_MAX_LEVEL = 8
export const BOAT_UPGRADE_PRICE: Record<number, number> = {
  2: 175,
  3: 325,
  4: 605,
  5: 1020,
  6: 1565,
  7: 2360,
  8: 3545,
}
export const BOAT_UPGRADE_ORE: Record<number, number> = {
  2: 6,
  3: 12,
  4: 23,
  5: 39,
  6: 52,
  7: 69,
  8: 95,
}
export const BOAT_UPGRADE_WOOD: Record<number, number> = {
  2: 8,
  3: 14,
  4: 26,
  5: 41,
  6: 55,
  7: 73,
  8: 95,
}
export const BOAT_UPGRADE_KNOWLEDGE: Record<number, number> = {
  2: 8,
  3: 15,
  4: 28,
  5: 44,
  6: 64,
  7: 89,
  8: 121,
}

/** 小屋：扩容猫口 + 升级耗知识 */
export const COTTAGE_MAX_LEVEL = 8
export const COTTAGE_UPGRADE_PRICE: Record<number, number> = {
  2: 150,
  3: 275,
  4: 545,
  5: 900,
  6: 1405,
  7: 2115,
  8: 3205,
}
export const COTTAGE_UPGRADE_ORE: Record<number, number> = {
  2: 5,
  3: 10,
  4: 20,
  5: 33,
  6: 45,
  7: 63,
  8: 86,
}
export const COTTAGE_UPGRADE_WOOD: Record<number, number> = {
  2: 6,
  3: 12,
  4: 23,
  5: 35,
  6: 49,
  7: 67,
  8: 88,
}
export const COTTAGE_UPGRADE_KNOWLEDGE: Record<number, number> = {
  2: 10,
  3: 17,
  4: 32,
  5: 50,
  6: 73,
  7: 101,
  8: 137,
}

/** 小屋等级 → 猫口上限（Lv1=5 … Lv8=12） */
export function catCapForCottage(cottageLevel: number): number {
  const lv = Math.max(1, Math.min(COTTAGE_MAX_LEVEL, Math.floor(cottageLevel || 1)))
  return 4 + lv
}

/** 绝对上限（出门错峰等；与满级猫口对齐） */
export const MAX_CATS = 12

/** 职业等级 */
export const ROLE_MAX_LEVEL = 5
export const ROLE_YIELD_PER_LEVEL = 0.35
export const ROLE_CONSUME_PER_LEVEL = 0.25
/** 职业升级目标等级 → 知识 */
export const ROLE_UPGRADE_KNOWLEDGE: Record<number, number> = {
  2: 5,
  3: 10,
  4: 17,
  5: 27,
}

/** 货船出海：装鱼肉 + 少量木材，换金币 */
export type BoatVoyagePhase = 'docked' | 'away'

export interface BoatVoyage {
  phase: BoatVoyagePhase
  /** 绝对游戏分钟：回港时刻 */
  returnAt: number
  /** 绝对游戏分钟：下次可出海 */
  readyAt: number
  cargoFish: number
  cargoWood: number
  expectedCoins: number
}

export const BOAT_FISH_CAP: Record<number, number> = {
  1: 4,
  2: 6,
  3: 8,
  4: 10,
  5: 14,
  6: 18,
  7: 22,
  8: 28,
}
export const BOAT_WOOD_CAP: Record<number, number> = {
  1: 1,
  2: 2,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 8,
}

/** 鱼肉出海单价（港口越高越贵） */
export function voyageFishPrice(harborLevel: number): number {
  return 5 + Math.max(1, harborLevel)
}
/** 木材出海单价（船越大越贵） */
export function voyageWoodPrice(boatLevel: number): number {
  return 4 + Math.max(1, boatLevel)
}

export function voyageDurationMinutes(boatLevel: number): number {
  return Math.max(2 * 60, 5 * 60 - (boatLevel - 1) * 35)
}

export function voyageCooldownMinutes(harborLevel: number): number {
  return Math.max(3 * 60, 8 * 60 - (harborLevel - 1) * 50)
}

export function emptyBoatVoyage(readyAt = 0): BoatVoyage {
  return {
    phase: 'docked',
    returnAt: 0,
    readyAt,
    cargoFish: 0,
    cargoWood: 0,
    expectedCoins: 0,
  }
}

/** 物品价固定 */
export const SEED_PACK_PRICE = 15
export const SEED_PACK_AMOUNT = 6
export const TOY_PRICE = 50
export const SNACK_PRICE = 40

export const MINE_ORE_YIELD = 3
export const ORE_SOFT_CAP = 40
/** 每只猫每天最多采矿次数 */
export const MINE_DAILY_LIMIT = 5
export const CHOP_WOOD_YIELD = 3
export const WOOD_SOFT_CAP = 40
/** 每只猫每天最多砍几棵树 */
export const CHOP_DAILY_LIMIT = 5
/** 白天砍树时段（游戏分钟）：把 5 次大致摊开，中间穿插休闲 */
export const CHOP_DAY_START_MINUTE = 7 * 60
export const CHOP_DAY_END_MINUTE = 18 * 60
export const CHOP_SLOT_MINUTES = Math.floor(
  (CHOP_DAY_END_MINUTE - CHOP_DAY_START_MINUTE) / CHOP_DAILY_LIMIT,
)

export const FISH_YIELD = 3
export const FISH_SOFT_CAP = 48
export const FISH_DAILY_LIMIT = 5
/** 每只猫每天日结消耗的鱼肉（再乘职业日耗倍率） */
export const FISH_DAILY_PER_CAT = 1

/** 生存库存「约 N 日储备」：低于此线户外工少摸鱼 */
export const WORK_RESERVE_DAYS = 2
/** 储备不足时的休闲概率 */
export const LEISURE_WHEN_TIGHT = 0.05
export const LEISURE_WHEN_LOW = 0.22
export const LEISURE_WHEN_HALF = 0.42
export const LEISURE_WHEN_FULL = 0.78

export const STUDY_YIELD = 1
export const KNOWLEDGE_SOFT_CAP = 50
export const STUDY_DAILY_LIMIT = 5
/** 学者研读落点（小屋门廊旁） */
export const STUDY_POS = { x: -4.8, z: 4.8 }

/** 医生炼药：每剂耗知识 */
export const KNOWLEDGE_PER_MEDICINE = 2
export const MEDICINE_CRAFT_YIELD = 1
export const MEDICINE_SOFT_CAP = 40
export const CRAFT_DAILY_LIMIT = 5
/** 船商贸易归来基础带回药品 */
export const SAILOR_MEDICINE_BASE = 1

export function canCraftAtMinute(minuteOfDay: number, craftsToday: number): boolean {
  if (craftsToday >= CRAFT_DAILY_LIMIT) return false
  const hour = minuteOfDay / 60
  if (hour < 6 || hour >= 20) return false
  return minuteOfDay >= workReadyAtMinute(craftsToday)
}

/** 船商单次贸易带回药品量 */
export function sailorMedicineLoot(roleLevel: number | undefined): number {
  const lv = Math.max(1, Math.floor(roleLevel ?? 1))
  return SAILOR_MEDICINE_BASE + Math.floor((lv - 1) / 2)
}

/** 今日第 N 次砍树 / 钓鱼 / 研读最早可开始的时刻（0-based） */
export function workReadyAtMinute(doneToday: number): number {
  return CHOP_DAY_START_MINUTE + doneToday * CHOP_SLOT_MINUTES
}

export function canChopAtMinute(minuteOfDay: number, chopsToday: number): boolean {
  if (chopsToday >= CHOP_DAILY_LIMIT) return false
  const hour = minuteOfDay / 60
  if (hour < 6 || hour >= 20) return false
  return minuteOfDay >= workReadyAtMinute(chopsToday)
}

export function canMineAtMinute(minuteOfDay: number, minesToday: number): boolean {
  if (minesToday >= MINE_DAILY_LIMIT) return false
  const hour = minuteOfDay / 60
  if (hour < 6 || hour >= 20) return false
  return minuteOfDay >= workReadyAtMinute(minesToday)
}

export function canFishAtMinute(minuteOfDay: number, castsToday: number): boolean {
  if (castsToday >= FISH_DAILY_LIMIT) return false
  const hour = minuteOfDay / 60
  if (hour < 6 || hour >= 20) return false
  return minuteOfDay >= workReadyAtMinute(castsToday)
}

export function canStudyAtMinute(minuteOfDay: number, studiesToday: number): boolean {
  if (studiesToday >= STUDY_DAILY_LIMIT) return false
  const hour = minuteOfDay / 60
  if (hour < 6 || hour >= 20) return false
  return minuteOfDay >= workReadyAtMinute(studiesToday)
}

/** 礁石钓点（岛东北岸，远离港口） */
export const REEF_ORIGIN = { x: 9.6, z: 10.2 }

const FISH_STANDS: Array<{ worldX: number; worldZ: number }> = [
  { worldX: 8.8, worldZ: 10.8 },
  { worldX: 9.6, worldZ: 10.2 },
  { worldX: 10.4, worldZ: 9.5 },
  { worldX: 8.2, worldZ: 10.0 },
  { worldX: 10.2, worldZ: 10.9 },
  { worldX: 9.0, worldZ: 9.4 },
]

/** 礁石岸边钓鱼落点 */
export function fishStand(catIndex: number) {
  return FISH_STANDS[catIndex % FISH_STANDS.length]!
}

/** 每多一只猫，产量 +50%（相对基础） */
export const YIELD_BONUS_PER_CAT = 0.5
/** 每多一只猫，生长速度 +25% */
export const GROW_BONUS_PER_CAT = 0.25
/** 招募价复合倍率：实际价 = 基础价 × GROWTH^当前猫数 */
export const RECRUIT_PRICE_GROWTH = 1.35
