import { getCrop } from '../data/crops'
import { FOREST_LAYOUT, isTreeMature } from '../data/forest'
import { granaryCapacity } from '../data/shop'
import {
  FARM_CELL,
  FARM_ORIGIN_X,
  FARM_ORIGIN_Z,
  FARM_SIZE,
  FOREST_POS,
  GRANARY_POS,
  HARBOR_POS,
  HOME_POS,
  MINE_POS,
  POND_POS,
  SEED_PACK_PRICE,
  sleepPosForCat,
  canChopAtMinute,
  canMineAtMinute,
  canFishAtMinute,
  canStudyAtMinute,
  canCraftAtMinute,
  fishStand,
  REEF_ORIGIN,
  STUDY_POS,
  type CatBehavior,
  type CatRole,
  type GranaryState,
  type PlotState,
  type Season,
  type TreeState,
  KNOWLEDGE_PER_MEDICINE,
} from '../types'
import { softCapFor, type SoftCapBuildings } from '../data/economy'
import { survivalLeisureChance } from '../data/workPressure'

export type CatTask =
  | { kind: 'sleep'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'trade'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'buySeed'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'mine'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'chop'; treeIndex: number; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'fish'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'study'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'craft'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'hoe'; plotX: number; plotZ: number; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'plant'; plotX: number; plotZ: number; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'water'; plotX: number; plotZ: number; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'harvest'; plotX: number; plotZ: number; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'waitGrow'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'play'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'eat'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'watchFish'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'wander'; worldX: number; worldZ: number; behavior: CatBehavior }
  | { kind: 'shelter'; worldX: number; worldZ: number; behavior: CatBehavior }

const claims = new Map<string, string>()

function plotKey(x: number, z: number) {
  return `${x},${z}`
}

export function releaseCatClaims(catId: string) {
  for (const [key, owner] of claims) {
    if (owner === catId) claims.delete(key)
  }
}

function claimPlot(catId: string, x: number, z: number) {
  releaseCatClaims(catId)
  claims.set(plotKey(x, z), catId)
}

function takenByOther(x: number, z: number, catId: string) {
  const owner = claims.get(plotKey(x, z))
  return owner != null && owner !== catId
}

function plotWorld(plotX: number, plotZ: number) {
  return {
    worldX: FARM_ORIGIN_X + plotX * FARM_CELL,
    worldZ: FARM_ORIGIN_Z + plotZ * FARM_CELL,
  }
}

/** 站在树旁，面向树做拉锯动作 */
function chopStand(spot: { x: number; z: number }, catIndex: number) {
  const ang = (catIndex % 4) * 0.9 + 0.4 + (Math.random() - 0.5) * 0.8
  const dist = 0.55 + Math.random() * 0.25
  return {
    worldX: spot.x + Math.cos(ang) * dist,
    worldZ: spot.z + Math.sin(ang) * dist,
  }
}

function findPlotForCat(
  plots: PlotState[][],
  catId: string,
  pred: (p: PlotState, x: number, z: number) => boolean,
): { x: number; z: number } | null {
  const hits: Array<{ x: number; z: number }> = []
  for (let z = 0; z < FARM_SIZE; z++) {
    for (let x = 0; x < FARM_SIZE; x++) {
      if (takenByOther(x, z, catId)) continue
      if (pred(plots[z]![x]!, x, z)) hits.push({ x, z })
    }
  }
  if (hits.length === 0) return null
  return hits[Math.floor(Math.random() * hits.length)]!
}

function countEmpty(plots: PlotState[][]) {
  let n = 0
  for (let z = 0; z < FARM_SIZE; z++) {
    for (let x = 0; x < FARM_SIZE; x++) {
      const p = plots[z]![x]!
      if (!p.cropId) n++
    }
  }
  return n
}

function claimTree(catId: string, index: number) {
  releaseCatClaims(catId)
  claims.set(`tree:${index}`, catId)
}

function treeTakenByOther(index: number, catId: string) {
  const owner = claims.get(`tree:${index}`)
  return owner != null && owner !== catId
}

/** 丢掉已不存在猫留下的树占用，避免伐木工永远找不到可砍树 */
export function pruneCatClaims(activeCatIds: string[]) {
  const alive = new Set(activeCatIds)
  for (const [key, owner] of claims) {
    if (!alive.has(owner)) claims.delete(key)
  }
}

function findMatureTree(trees: TreeState[], catId: string): number | null {
  const hits: number[] = []
  for (let i = 0; i < trees.length; i++) {
    if (treeTakenByOther(i, catId)) continue
    if (isTreeMature(trees[i]!)) hits.push(i)
  }
  if (hits.length === 0) return null
  return hits[Math.floor(Math.random() * hits.length)]!
}

/** 休闲：看鱼 / 闲逛（真正随机，偏爱闲逛） */
function pondWatchPos() {
  const a = Math.random() * Math.PI * 2
  const rx = 2.0 + Math.random() * 0.7
  const rz = 1.5 + Math.random() * 0.55
  return {
    worldX: POND_POS.x + Math.cos(a) * rx,
    worldZ: POND_POS.z + Math.sin(a) * rz,
  }
}

function wanderPos() {
  const spots = [
    { x: 0.2, z: 2.4 },
    { x: -2.2, z: 0.5 },
    { x: 5.2, z: 2.8 },
    { x: 1.4, z: 5.6 },
    { x: -4.2, z: 1.2 },
    { x: 7.0, z: -1.5 },
    { x: HOME_POS.x + 0.8, z: HOME_POS.z - 0.6 },
    { x: GRANARY_POS.x + 0.5, z: GRANARY_POS.z - 1.6 },
    { x: FOREST_POS.x - 1.5, z: FOREST_POS.z - 1.2 },
    { x: 3.0, z: -3.5 },
    { x: -1.0, z: -4.0 },
    { x: HARBOR_POS.x - 1.2, z: HARBOR_POS.z + 1.0 },
    { x: POND_POS.x + 3.2, z: POND_POS.z - 0.8 },
    { x: MINE_POS.x - 1.6, z: MINE_POS.z + 1.2 },
  ]
  const spot = spots[Math.floor(Math.random() * spots.length)]!
  const jitter = 0.55
  return {
    worldX: spot.x + (Math.random() - 0.5) * 2 * jitter,
    worldZ: spot.z + (Math.random() - 0.5) * 2 * jitter,
  }
}

function makeLeisureTask(kind: 'watchFish' | 'wander'): CatTask {
  if (kind === 'watchFish') {
    const p = pondWatchPos()
    return { kind: 'watchFish', ...p, behavior: 'watchFish' }
  }
  const p = wanderPos()
  return { kind: 'wander', ...p, behavior: 'wander' }
}

/** 空闲时在吃/玩/闲逛里再抽一次，避免总站岗 */
function pickSoftIdle(input: {
  inventory: Record<string, number>
  campX: number
  campZ: number
}): CatTask {
  const { inventory, campX, campZ } = input
  const options: CatTask[] = [makeLeisureTask('wander')]
  if (Math.random() < 0.55) options.push(makeLeisureTask('watchFish'))
  if ((inventory.snack ?? 0) > 0) {
    options.push({
      kind: 'eat',
      worldX: campX + (Math.random() - 0.5) * 0.8,
      worldZ: campZ + (Math.random() - 0.5) * 0.8,
      behavior: 'eat',
    })
  }
  if ((inventory.toy ?? 0) > 0) {
    options.push({
      kind: 'play',
      worldX: campX + (Math.random() - 0.5) * 0.8,
      worldZ: campZ + (Math.random() - 0.5) * 0.8,
      behavior: 'play',
    })
  }
  return options[Math.floor(Math.random() * options.length)]!
}

function specialistIdle(input: {
  minuteOfDay: number
  inventory: Record<string, number>
  catId: string
  catIndex: number
  stock: number
  softCap: number
  reserveNeed: number
  minesToday: number
  workKind: 'mine'
  workPos: { x: number; z: number }
  campOffset: { x: number; z: number }
}): CatTask {
  const {
    minuteOfDay,
    inventory,
    catId,
    catIndex,
    stock,
    softCap,
    reserveNeed,
    minesToday,
    workKind,
    workPos,
    campOffset,
  } = input
  const hour = minuteOfDay / 60
  const isNight = hour < 6 || hour >= 20
  const workX = workPos.x + (catIndex % 3) * 0.55 + (Math.random() - 0.5) * 0.35
  const workZ = workPos.z + Math.floor(catIndex / 3) * 0.45 + (Math.random() - 0.5) * 0.35
  const campX = workPos.x + campOffset.x + (catIndex % 2) * 0.5
  const campZ = workPos.z + campOffset.z

  releaseCatClaims(catId)

  if (isNight) {
    const bed = sleepPosForCat(catIndex)
    return { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
  }

  // 储备不足少摸鱼；到顶仍多闲逛（溢出兑金）
  const leisureChance = survivalLeisureChance(stock, softCap, reserveNeed)
  if (Math.random() < leisureChance) {
    return pickSoftIdle({ inventory, campX, campZ })
  }

  if (canMineAtMinute(minuteOfDay, minesToday)) {
    return { kind: workKind, worldX: workX, worldZ: workZ, behavior: workKind }
  }

  return pickSoftIdle({ inventory, campX, campZ })
}

function lumberjackIdle(input: {
  minuteOfDay: number
  inventory: Record<string, number>
  trees: TreeState[]
  catId: string
  catIndex: number
  chopsToday: number
  buildings: SoftCapBuildings
  reserveNeed: number
}): CatTask {
  const {
    minuteOfDay,
    inventory,
    trees,
    catId,
    catIndex,
    chopsToday,
    buildings,
    reserveNeed,
  } = input
  const hour = minuteOfDay / 60
  const isNight = hour < 6 || hour >= 20
  const campX = FOREST_POS.x + 1.2 + (catIndex % 2) * 0.5
  const campZ = FOREST_POS.z + 1.0

  if (isNight) {
    releaseCatClaims(catId)
    const bed = sleepPosForCat(catIndex)
    return { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
  }

  const wood = inventory.wood ?? 0
  const woodCap = softCapFor('wood', buildings)!
  const leisureChance = survivalLeisureChance(wood, woodCap, reserveNeed)
  if (canChopAtMinute(minuteOfDay, chopsToday) && Math.random() >= leisureChance) {
    const idx = findMatureTree(trees, catId)
    if (idx != null) {
      claimTree(catId, idx)
      const spot = FOREST_LAYOUT[idx]!
      return {
        kind: 'chop',
        treeIndex: idx,
        ...chopStand(spot, catIndex),
        behavior: 'chop',
      }
    }
  }

  releaseCatClaims(catId)
  return pickSoftIdle({ inventory, campX, campZ })
}

function fisherIdle(input: {
  minuteOfDay: number
  inventory: Record<string, number>
  catId: string
  catIndex: number
  castsToday: number
  buildings: SoftCapBuildings
  reserveNeed: number
}): CatTask {
  const { minuteOfDay, inventory, catId, catIndex, castsToday, buildings, reserveNeed } =
    input
  const hour = minuteOfDay / 60
  const isNight = hour < 6 || hour >= 20
  const stand = fishStand(catIndex)
  const campX = REEF_ORIGIN.x - 1.2 - (catIndex % 2) * 0.5
  const campZ = REEF_ORIGIN.z - 1.4 - Math.floor(catIndex / 2) * 0.35

  releaseCatClaims(catId)

  if (isNight) {
    const bed = sleepPosForCat(catIndex)
    return { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
  }

  const fish = inventory.fish ?? 0
  const fishCap = softCapFor('fish', buildings)!
  const leisureChance = survivalLeisureChance(fish, fishCap, reserveNeed)
  if (canFishAtMinute(minuteOfDay, castsToday) && Math.random() >= leisureChance) {
    return {
      kind: 'fish',
      worldX: stand.worldX + (Math.random() - 0.5) * 0.25,
      worldZ: stand.worldZ + (Math.random() - 0.5) * 0.25,
      behavior: 'fish',
    }
  }

  return pickSoftIdle({ inventory, campX, campZ })
}

function scholarIdle(input: {
  minuteOfDay: number
  inventory: Record<string, number>
  catId: string
  catIndex: number
  studiesToday: number
  buildings: SoftCapBuildings
}): CatTask {
  const { minuteOfDay, inventory, catId, catIndex, studiesToday, buildings } = input
  const hour = minuteOfDay / 60
  const isNight = hour < 6 || hour >= 20
  const campX = STUDY_POS.x + (catIndex % 2) * 0.45
  const campZ = STUDY_POS.z + Math.floor(catIndex / 2) * 0.4

  releaseCatClaims(catId)

  if (isNight) {
    const bed = sleepPosForCat(catIndex)
    return { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
  }

  const knowledge = inventory.knowledge ?? 0
  const knowCap = softCapFor('knowledge', buildings)!
  const leisureChance =
    knowledge >= knowCap ? 0.78 : knowledge >= knowCap * 0.5 ? 0.32 : 0.15
  if (canStudyAtMinute(minuteOfDay, studiesToday) && Math.random() >= leisureChance) {
    return {
      kind: 'study',
      worldX: campX + (Math.random() - 0.5) * 0.3,
      worldZ: campZ + (Math.random() - 0.5) * 0.3,
      behavior: 'study',
    }
  }

  return pickSoftIdle({ inventory, campX, campZ })
}

function sailorIdle(input: {
  minuteOfDay: number
  inventory: Record<string, number>
  catId: string
  catIndex: number
  merchantHere: boolean
}): CatTask {
  const { minuteOfDay, inventory, catId, catIndex, merchantHere } = input
  const hour = minuteOfDay / 60
  const isNight = hour < 6 || hour >= 20
  const pierX = HARBOR_POS.x + (catIndex % 2) * 0.45
  const pierZ = HARBOR_POS.z + Math.floor(catIndex / 2) * 0.35

  releaseCatClaims(catId)

  if (isNight) {
    const bed = sleepPosForCat(catIndex)
    return { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
  }

  const wheat = inventory.wheat ?? 0
  const fish = inventory.fish ?? 0
  const canTrade = wheat > 0 || (merchantHere && fish > 0)
  if (canTrade && Math.random() >= 0.12) {
    return {
      kind: 'trade',
      worldX: pierX + (Math.random() - 0.5) * 0.3,
      worldZ: pierZ + (Math.random() - 0.5) * 0.3,
      behavior: 'trade',
    }
  }

  return pickSoftIdle({ inventory, campX: pierX, campZ: pierZ })
}

function doctorIdle(input: {
  minuteOfDay: number
  inventory: Record<string, number>
  catId: string
  catIndex: number
  craftsToday: number
  buildings: SoftCapBuildings
}): CatTask {
  const { minuteOfDay, inventory, catId, catIndex, craftsToday, buildings } = input
  const hour = minuteOfDay / 60
  const isNight = hour < 6 || hour >= 20
  const campX = STUDY_POS.x - 0.8 - (catIndex % 2) * 0.35
  const campZ = STUDY_POS.z + 0.6 + Math.floor(catIndex / 2) * 0.35

  releaseCatClaims(catId)

  if (isNight) {
    const bed = sleepPosForCat(catIndex)
    return { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
  }

  const knowledge = inventory.knowledge ?? 0
  const medicine = inventory.medicine ?? 0
  const medCap = softCapFor('medicine', buildings)!
  const leisureChance =
    medicine >= medCap ? 0.78 : medicine >= medCap * 0.5 ? 0.32 : 0.15
  if (
    canCraftAtMinute(minuteOfDay, craftsToday) &&
    knowledge >= KNOWLEDGE_PER_MEDICINE &&
    Math.random() >= leisureChance
  ) {
    return {
      kind: 'craft',
      worldX: campX + (Math.random() - 0.5) * 0.25,
      worldZ: campZ + (Math.random() - 0.5) * 0.25,
      behavior: 'craft',
    }
  }

  return pickSoftIdle({ inventory, campX, campZ })
}

/** 散民：无职闲逛，不参与劳作 */
function civilianIdle(input: {
  minuteOfDay: number
  inventory: Record<string, number>
  catId: string
  catIndex: number
}): CatTask {
  const { minuteOfDay, inventory, catId, catIndex } = input
  const hour = minuteOfDay / 60
  const isNight = hour < 6 || hour >= 20
  releaseCatClaims(catId)
  if (isNight) {
    const bed = sleepPosForCat(catIndex)
    return { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
  }
  const campX = HOME_POS.x + (catIndex % 3) * 0.85
  const campZ = HOME_POS.z + Math.floor(catIndex / 3) * 0.85
  // 白天几乎只闲逛 / 看鱼 / 玩零食
  if ((inventory.toy ?? 0) > 0 && Math.random() < 0.12) {
    return {
      kind: 'play',
      worldX: campX + (Math.random() - 0.5) * 1.2,
      worldZ: campZ + (Math.random() - 0.5) * 1.2,
      behavior: 'play',
    }
  }
  if ((inventory.snack ?? 0) > 0 && Math.random() < 0.1) {
    return {
      kind: 'eat',
      worldX: campX + (Math.random() - 0.5) * 0.8,
      worldZ: campZ + (Math.random() - 0.5) * 0.8,
      behavior: 'eat',
    }
  }
  return pickSoftIdle({ inventory, campX, campZ })
}

export function pickCatTask(input: {
  minuteOfDay: number
  season: Season
  plots: PlotState[][]
  trees: TreeState[]
  inventory: Record<string, number>
  granary: GranaryState
  catId: string
  catIndex: number
  coins: number
  role: CatRole
  farmerCount: number
  chopsToday: number
  minesToday: number
  castsToday: number
  studiesToday: number
  craftsToday: number
  buildings: SoftCapBuildings
  /** 约 2 日矿保养储备线 */
  oreReserveNeed: number
  /** 约 2 日取暖木储备线 */
  woodReserveNeed: number
  /** 约 2 日口粮储备线 */
  fishReserveNeed: number
  merchantHere?: boolean
}): CatTask {
  const {
    minuteOfDay,
    season,
    plots,
    trees,
    inventory,
    granary,
    catId,
    catIndex,
    coins,
    role,
    farmerCount,
    chopsToday,
    minesToday,
    castsToday,
    studiesToday,
    craftsToday,
    buildings,
    oreReserveNeed,
    woodReserveNeed,
    fishReserveNeed,
    merchantHere = false,
  } = input
  const ore = inventory.ore ?? 0
  const wood = inventory.wood ?? 0
  const fishStock = inventory.fish ?? 0

  if (role === 'miner') {
    return specialistIdle({
      minuteOfDay,
      inventory,
      catId,
      catIndex,
      stock: ore,
      softCap: softCapFor('ore', buildings)!,
      reserveNeed: oreReserveNeed,
      minesToday,
      workKind: 'mine',
      workPos: MINE_POS,
      campOffset: { x: 1.2, z: 1.4 },
    })
  }

  if (role === 'lumberjack') {
    return lumberjackIdle({
      minuteOfDay,
      inventory,
      trees,
      catId,
      catIndex,
      chopsToday,
      buildings,
      reserveNeed: woodReserveNeed,
    })
  }

  if (role === 'fisher') {
    return fisherIdle({
      minuteOfDay,
      inventory,
      catId,
      catIndex,
      castsToday,
      buildings,
      reserveNeed: fishReserveNeed,
    })
  }

  if (role === 'scholar') {
    return scholarIdle({ minuteOfDay, inventory, catId, catIndex, studiesToday, buildings })
  }

  if (role === 'sailor') {
    return sailorIdle({ minuteOfDay, inventory, catId, catIndex, merchantHere })
  }

  if (role === 'doctor') {
    return doctorIdle({ minuteOfDay, inventory, catId, catIndex, craftsToday, buildings })
  }

  if (role === 'civilian') {
    return civilianIdle({ minuteOfDay, inventory, catId, catIndex })
  }

  const hour = minuteOfDay / 60
  const isNight = hour < 6 || hour >= 20
  const seeds = inventory.wheat_seed ?? 0
  const wheat = inventory.wheat ?? 0
  const cap = granaryCapacity(granary)
  const crop = getCrop('wheat')
  const canPlantSeason = crop ? crop.seasons.includes(season) : false
  const emptyPlots = countEmpty(plots)
  const homeX = HOME_POS.x + (catIndex % 3) * 0.9
  const homeZ = HOME_POS.z + Math.floor(catIndex / 3) * 0.9
  const mineX = MINE_POS.x + (catIndex % 3) * 0.55
  const mineZ = MINE_POS.z + Math.floor(catIndex / 3) * 0.45

  if (isNight) {
    releaseCatClaims(catId)
    const bed = sleepPosForCat(catIndex)
    return { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
  }

  const mature = findPlotForCat(plots, catId, (p) => {
    if (!p.cropId) return false
    const c = getCrop(p.cropId)
    return !!c && p.stage >= c.maxStage
  })
  if (mature && wheat < cap) {
    claimPlot(catId, mature.x, mature.z)
    const w = plotWorld(mature.x, mature.z)
    return { kind: 'harvest', plotX: mature.x, plotZ: mature.z, ...w, behavior: 'harvest' }
  }

  if (wheat >= cap && catIndex === 0) {
    releaseCatClaims(catId)
    return { kind: 'trade', worldX: HARBOR_POS.x, worldZ: HARBOR_POS.z, behavior: 'trade' }
  }

  if (merchantHere && catIndex === 0 && (wheat > 0 || fishStock >= 3)) {
    releaseCatClaims(catId)
    return { kind: 'trade', worldX: HARBOR_POS.x, worldZ: HARBOR_POS.z, behavior: 'trade' }
  }

  const needWater = findPlotForCat(plots, catId, (p) => !!p.cropId && !p.watered)
  if (needWater) {
    claimPlot(catId, needWater.x, needWater.z)
    const w = plotWorld(needWater.x, needWater.z)
    return { kind: 'water', plotX: needWater.x, plotZ: needWater.z, ...w, behavior: 'water' }
  }

  if (canPlantSeason && emptyPlots > 0 && seeds <= 0 && catIndex === 0 && coins >= SEED_PACK_PRICE) {
    releaseCatClaims(catId)
    return { kind: 'buySeed', worldX: HARBOR_POS.x, worldZ: HARBOR_POS.z, behavior: 'trade' }
  }

  if (canPlantSeason && seeds > 0 && emptyPlots > 0) {
    const emptyTilled = findPlotForCat(plots, catId, (p) => p.tilled && !p.cropId)
    if (emptyTilled) {
      claimPlot(catId, emptyTilled.x, emptyTilled.z)
      const w = plotWorld(emptyTilled.x, emptyTilled.z)
      return { kind: 'plant', plotX: emptyTilled.x, plotZ: emptyTilled.z, ...w, behavior: 'plant' }
    }
    const untilled = findPlotForCat(plots, catId, (p) => !p.tilled && !p.cropId)
    if (untilled) {
      claimPlot(catId, untilled.x, untilled.z)
      const w = plotWorld(untilled.x, untilled.z)
      return { kind: 'hoe', plotX: untilled.x, plotZ: untilled.z, ...w, behavior: 'hoe' }
    }
  }

  releaseCatClaims(catId)

  // 田间没事时：多数去闲逛，偶尔才去次要工种
  if (Math.random() < 0.55) {
    return pickSoftIdle({ inventory, campX: homeX, campZ: homeZ })
  }

  // 木材紧缺时也可砍，但仍按白天时段摊开
  if (wood < 6 && canChopAtMinute(minuteOfDay, chopsToday) && Math.random() < 0.7) {
    const canLeaveFarm = farmerCount >= 2 ? catIndex > 0 : true
    if (canLeaveFarm) {
      const idx = findMatureTree(trees, catId)
      if (idx != null) {
        claimTree(catId, idx)
        const spot = FOREST_LAYOUT[idx]!
        return {
          kind: 'chop',
          treeIndex: idx,
          ...chopStand(spot, catIndex),
          behavior: 'chop',
        }
      }
    }
  }

  if (ore < 6 && farmerCount >= 2 && catIndex > 0 && wood >= 6 && Math.random() < 0.55) {
    return { kind: 'mine', worldX: mineX, worldZ: mineZ, behavior: 'mine' }
  }

  const growing = plots.some((row) =>
    row.some((p) => {
      if (!p.cropId) return false
      const c = getCrop(p.cropId)
      return !!c && p.stage < c.maxStage
    }),
  )

  if (ore < 6 && farmerCount >= 2 && catIndex > 0 && Math.random() < 0.4) {
    return { kind: 'mine', worldX: mineX, worldZ: mineZ, behavior: 'mine' }
  }

  if (growing && Math.random() < 0.35) {
    return {
      kind: 'waitGrow',
      worldX: FARM_ORIGIN_X + 1.2 + (catIndex % 3) * 1.3 + (Math.random() - 0.5),
      worldZ: FARM_ORIGIN_Z + 1.2 + Math.floor(catIndex / 3) * 1.3 + (Math.random() - 0.5),
      behavior: 'waitGrow',
    }
  }

  if (wheat > 0 && catIndex === 0 && Math.random() < 0.45) {
    return { kind: 'trade', worldX: HARBOR_POS.x, worldZ: HARBOR_POS.z, behavior: 'trade' }
  }

  return pickSoftIdle({ inventory, campX: homeX, campZ: homeZ })
}

export const CAT_BEHAVIOR_LABEL: Record<CatBehavior, string> = {
  idle: '休息',
  walk: '走路',
  sleep: '睡觉',
  hoe: '翻地',
  plant: '播种',
  water: '浇水',
  harvest: '收割',
  trade: '贸易',
  waitGrow: '等待生长',
  play: '玩玩具',
  eat: '吃零食',
  mine: '挖矿',
  chop: '伐木',
  fish: '钓鱼',
  watchFish: '看鱼',
  wander: '闲逛',
  study: '研读',
  craft: '炼药',
}
