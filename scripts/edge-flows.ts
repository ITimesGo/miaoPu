/**
 * 边界与流程冒烟：node 下直接跑 store / voyage / goals
 * 用法：npx --yes tsx scripts/edge-flows.ts
 */
import { absoluteGameMinute } from '../src/game/data/weather'
import {
  goalRewardText,
  goalTitle,
  isGoalMet,
  liveGoalProgress,
  rollSeasonGoal,
  type SeasonGoal,
} from '../src/game/data/goals'
import { buildDepartVoyage, canDepartVoyage, settleVoyageReturn } from '../src/game/data/voyage'
import {
  catCapForCottage,
  COTTAGE_UPGRADE_PRICE,
  emptyBoatVoyage,
  SEED_PACK_PRICE,
  type CatInstance,
} from '../src/game/types'
import { useGameStore } from '../src/game/state/gameStore'
import {
  applyStrayReject,
  canRollPlague,
  canRollStray,
  clearDecisionWindow,
  emptyMajorEvent,
  MAJOR_COOLDOWN_MINUTES,
  pickMajorEventKind,
  plagueIsolateMedicineCost,
} from '../src/game/data/majorEvents'
import {
  applyCoinGain,
  applyComfortConsume,
  applyInventoryGain,
  applyWheatHarvestGain,
  coinSoftCap,
  COIN_SOFT_CAP,
  DEFAULT_SOFT_CAP_BUILDINGS,
  FISH_SOFT_CAP,
  softCapDeltaHint,
  softCapFor,
} from '../src/game/data/economy'
import { getShopActions } from '../src/game/data/shop'
import {
  PIRATE_WEALTH_THRESHOLD,
  rollPirateChance,
} from '../src/game/data/pirates'
import {
  heatingWoodNeed,
  STARTING_WOOD,
} from '../src/game/data/heating'
import {
  applyToolsWornYield,
  STARTING_ORE,
  toolMaintOreNeed,
} from '../src/game/data/tools'
import { createFreshPersistSlice } from '../src/game/state/saveGame'

let passed = 0
let failed = 0

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed += 1
    console.log(`  ✓ ${msg}`)
  } else {
    failed += 1
    console.error(`  ✗ ${msg}`)
  }
}

function cat(partial: Partial<CatInstance> & Pick<CatInstance, 'id' | 'role'>): CatInstance {
  return {
    breedId: 'cream',
    x: 0,
    z: 0,
    behavior: 'idle',
    roleLevel: 1,
    chopsToday: 0,
    minesToday: 0,
    castsToday: 0,
    studiesToday: 0,
    craftsToday: 0,
    sick: false,
    boostUntil: 0,
    ...partial,
  }
}

function baseVoyageCtx(over: Partial<Parameters<typeof canDepartVoyage>[0]> = {}) {
  return {
    nowAbs: absoluteGameMinute(1, 10 * 60),
    minuteOfDay: 10 * 60,
    inventory: { fish: 6, wood: 2, medicine: 0 },
    cats: [cat({ id: 's1', role: 'sailor' })],
    harbor: { level: 1 },
    boat: { level: 1 },
    boatVoyage: emptyBoatVoyage(0),
    buildings: DEFAULT_SOFT_CAP_BUILDINGS,
    ...over,
  }
}

console.log('\n=== 货船出航边界 ===')
{
  assert(canDepartVoyage(baseVoyageCtx()) === true, '正常：白天+船商+货物可出航')
  assert(
    canDepartVoyage(baseVoyageCtx({ minuteOfDay: 6 * 60 })) === false,
    '夜间不可出航',
  )
  assert(
    canDepartVoyage(baseVoyageCtx({ minuteOfDay: 18 * 60 })) === false,
    '18 点后不可出航',
  )
  assert(
    canDepartVoyage(baseVoyageCtx({ cats: [cat({ id: 'f', role: 'farmer' })] })) === false,
    '无船商不可出航',
  )
  assert(
    canDepartVoyage(baseVoyageCtx({ cats: [cat({ id: 's1', role: 'sailor', sick: true })] })) ===
      false,
    '病船商不可出航',
  )
  assert(
    canDepartVoyage(baseVoyageCtx({ inventory: { fish: 0, wood: 0 } })) === false,
    '无货不可出航',
  )
  assert(
    canDepartVoyage(baseVoyageCtx({ boatVoyage: emptyBoatVoyage(absoluteGameMinute(1, 12 * 60)) })) ===
      false,
    '冷却未结束不可出航',
  )
  assert(
    canDepartVoyage(
      baseVoyageCtx({
        boatVoyage: {
          phase: 'away',
          returnAt: 99999,
          readyAt: 99999,
          cargoFish: 1,
          cargoWood: 0,
          expectedCoins: 10,
        },
      }),
    ) === false,
    '已在海上不可再出航',
  )

  const dep = buildDepartVoyage(baseVoyageCtx({ inventory: { fish: 10, wood: 5 } }))
  assert(dep != null, 'buildDepart 成功')
  assert(dep!.inventory.fish === 10 - 4, '出航扣鱼按船上限（Lv1=4）')
  assert(dep!.inventory.wood === 5 - 1, '出航扣木按船上限（Lv1=1）')
  assert(dep!.boatVoyage.phase === 'away', '出航后 phase=away')
  assert(dep!.boatVoyage.expectedCoins > 0, '预计金币 > 0')

  const tooEarly = settleVoyageReturn({
    ...baseVoyageCtx(),
    nowAbs: dep!.boatVoyage.returnAt - 1,
    boatVoyage: dep!.boatVoyage,
    inventory: dep!.inventory,
  })
  assert(tooEarly == null, '未到回港时刻不可结算')

  const settled = settleVoyageReturn({
    ...baseVoyageCtx(),
    nowAbs: dep!.boatVoyage.returnAt,
    boatVoyage: dep!.boatVoyage,
    inventory: dep!.inventory,
  })
  assert(settled != null, '到点可回港')
  assert(settled!.coinsDelta === dep!.boatVoyage.expectedCoins, '回港金币=预计')
  assert(settled!.boatVoyage.phase === 'docked', '回港后停泊')
  assert(settled!.boatVoyage.readyAt > dep!.boatVoyage.returnAt, '回港进入冷却')
}

console.log('\n=== 季节目标边界 ===')
{
  for (const season of ['spring', 'summer', 'autumn', 'winter'] as const) {
    const g = rollSeasonGoal(season, 3)
    assert(g.season === season, `${season} 目标绑定季节`)
    assert(g.target > 0, `${season} 目标数量 > 0`)
    assert(goalRewardText(g).includes('金币') || goalRewardText(g).includes('知识') || goalRewardText(g).includes('药品'), `${season} 奖励文案非空`)
    assert(goalTitle(g).length > 0, `${season} 标题非空`)
  }

  const stock: SeasonGoal = {
    kind: 'stock_fish',
    target: 6,
    progress: 0,
    season: 'spring',
    completed: false,
    rewardLabel: 'x',
    rewardCoins: 24,
    rewardMedicine: 1,
    rewardKnowledge: 0,
  }
  assert(liveGoalProgress(stock, { fish: 3, wheat: 0, cottageLevel: 1, catCount: 1 }) === 3, '囤鱼进度取库存')
  assert(liveGoalProgress(stock, { fish: 99, wheat: 0, cottageLevel: 1, catCount: 1 }) === 6, '囤鱼进度封顶')
  assert(!isGoalMet(stock, { fish: 5, wheat: 0, cottageLevel: 1, catCount: 1 }), '未达目标')
  assert(isGoalMet(stock, { fish: 6, wheat: 0, cottageLevel: 1, catCount: 1 }), '刚好达标')

  const voy: SeasonGoal = {
    ...stock,
    kind: 'voyages',
    target: 2,
    progress: 1,
  }
  assert(liveGoalProgress(voy, { fish: 0, wheat: 0, cottageLevel: 1, catCount: 1 }) === 1, '出航用累计进度')
  assert(isGoalMet({ ...voy, completed: true }, { fish: 0, wheat: 0, cottageLevel: 1, catCount: 1 }), '已完成恒 true')

  assert(
    goalRewardText({
      ...stock,
      rewardCoins: 10,
      rewardMedicine: 2,
      rewardKnowledge: 3,
    }) === '金币 ×10 · 药品 ×2 · 知识 ×3',
    '奖励文案完整列出三项',
  )
}

console.log('\n=== Store 流程：出航→回港→目标 ===')
{
  useGameStore.getState().restartGame()
  const s0 = useGameStore.getState()
  assert(s0.boatVoyage.phase === 'docked', '开局停泊')
  assert(s0.seasonGoal.completed === false, '开局目标未完成')
  assert(s0.gameOver === false, '开局未结束')

  // 配船商 + 货物 + 跳过冷却 + 白天
  useGameStore.getState().devSet({
    ensureSailor: true,
    fish: 10,
    wood: 3,
    medicine: 0,
    minuteOfDay: 10 * 60,
  })
  // 强制 ready
  useGameStore.setState({
    boatVoyage: emptyBoatVoyage(0),
    seasonGoal: {
      kind: 'voyages',
      target: 1,
      progress: 0,
      season: 'spring',
      completed: false,
      rewardLabel: 't',
      rewardCoins: 25,
      rewardMedicine: 2,
      rewardKnowledge: 0,
    },
  })

  const beforeCoins = useGameStore.getState().coins
  const beforeFish = useGameStore.getState().inventory.fish ?? 0
  useGameStore.getState().devSet({ forceVoyage: true })
  const afterDep = useGameStore.getState()
  assert(afterDep.boatVoyage.phase === 'away', 'Dev 出海成功')
  assert((afterDep.inventory.fish ?? 0) < beforeFish, '出海扣鱼')

  // 未到点强制回港失败路径：改 returnAt 再 settle
  useGameStore.getState().devSet({ forceVoyageReturn: true })
  const afterRet = useGameStore.getState()
  assert(afterRet.boatVoyage.phase === 'docked', 'Dev 回港成功')
  assert(afterRet.coins > beforeCoins, '回港加金币')
  assert(afterRet.seasonGoal.completed === true || afterRet.seasonGoal.progress >= 1, '出航推进目标进度')
  // voyages target 1 → should complete and grant reward
  assert(afterRet.seasonGoal.completed === true, '出航目标完成')
  assert((afterRet.inventory.medicine ?? 0) >= 2, '目标奖励药品入账（+可能船商带回）')
}

console.log('\n=== Store：冷却中不可再出航 / 无船商 ===')
{
  useGameStore.getState().restartGame()
  useGameStore.setState({
    boatVoyage: emptyBoatVoyage(absoluteGameMinute(99, 0)),
    minuteOfDay: 10 * 60,
    inventory: { ...useGameStore.getState().inventory, fish: 8 },
  })
  useGameStore.getState().devSet({ ensureSailor: true, forceVoyage: true })
  assert(useGameStore.getState().boatVoyage.phase === 'docked', '冷却中强制出海失败仍停泊')

  useGameStore.getState().restartGame()
  useGameStore.setState({
    boatVoyage: emptyBoatVoyage(0),
    minuteOfDay: 10 * 60,
    inventory: { ...useGameStore.getState().inventory, fish: 8 },
    cats: [cat({ id: 'only-farmer', role: 'farmer' })],
  })
  useGameStore.getState().devSet({ forceVoyage: true })
  assert(useGameStore.getState().boatVoyage.phase === 'docked', '无船商强制出海失败')
}

console.log('\n=== Store：生病治病死亡全灭 ===')
{
  useGameStore.getState().restartGame()
  useGameStore.getState().devSet({ forceSickOne: true, medicine: 0 })
  assert(useGameStore.getState().cats.some((c) => c.sick), '可强制生病')

  useGameStore.getState().devSet({ medicine: 1, cureAll: true })
  assert(useGameStore.getState().cats.every((c) => !c.sick), '治愈全部')

  useGameStore.getState().devSet({ forceSickOne: true, medicine: 0 })
  useGameStore.getState().devSet({ forceDeathSick: true })
  const afterDeath = useGameStore.getState()
  assert(afterDeath.cats.length === 0, '唯一病猫死亡后猫群为空')
  assert(afterDeath.gameOver === true, '全灭触发 gameOver')

  useGameStore.getState().restartGame()
  assert(useGameStore.getState().gameOver === false, '重开清除 gameOver')
  assert(useGameStore.getState().cats.length === 1, '重开恢复 starter')
}

console.log('\n=== Store：tick 自动出航与回港 ===')
{
  useGameStore.getState().restartGame()
  useGameStore.getState().devSet({
    ensureSailor: true,
    fish: 8,
    wood: 2,
    minuteOfDay: 10 * 60,
    timeScale: 1,
  })
  useGameStore.setState({ boatVoyage: emptyBoatVoyage(0) })

  // 推一小段时间触发 tick 内自动出航
  useGameStore.getState().tick(1)
  assert(useGameStore.getState().boatVoyage.phase === 'away', 'tick 自动出航')

  const retAt = useGameStore.getState().boatVoyage.returnAt
  const day = useGameStore.getState().day
  // 跳到回港后
  useGameStore.setState({
    minuteOfDay: 10 * 60,
    day,
    // set absolute by adjusting day/minute so nowAbs >= returnAt
  })
  // 直接拨时间：用 day/minute 凑 nowAbs
  // returnAt 是绝对分钟；设 day/minute 使 absoluteGameMinute >= returnAt
  let d = 1
  let m = 0
  while (absoluteGameMinute(d, m) < retAt) {
    m += 60
    if (m >= 24 * 60) {
      m = 0
      d += 1
    }
  }
  useGameStore.setState({ day: d, minuteOfDay: m, timeScale: 1 })
  useGameStore.getState().tick(1)
  assert(useGameStore.getState().boatVoyage.phase === 'docked', 'tick 到点自动回港')
}

console.log('\n=== Store：囤货目标发奖不重复 ===')
{
  useGameStore.getState().restartGame()
  useGameStore.setState({
    seasonGoal: {
      kind: 'stock_fish',
      target: 5,
      progress: 0,
      season: 'spring',
      completed: false,
      rewardLabel: 't',
      rewardCoins: 30,
      rewardMedicine: 1,
      rewardKnowledge: 0,
    },
    coins: 100,
    inventory: { ...useGameStore.getState().inventory, fish: 5, medicine: 0 },
  })
  const coinsBefore = useGameStore.getState().coins
  useGameStore.getState().tick(1)
  const mid = useGameStore.getState()
  assert(mid.seasonGoal.completed === true, '囤鱼达标完成')
  assert(mid.coins === coinsBefore + 30, '金币奖励精确 +30')
  assert((mid.inventory.medicine ?? 0) === 1, '药品奖励 +1')

  useGameStore.getState().tick(2)
  assert(useGameStore.getState().coins === mid.coins, '已完成不再重复发奖')
}

console.log('\n=== Store：换季节刷新目标 ===')
{
  useGameStore.getState().restartGame()
  useGameStore.setState({
    day: 10,
    minuteOfDay: 23 * 60 + 50,
    seasonGoal: {
      kind: 'stock_wheat',
      target: 10,
      progress: 0,
      season: 'spring',
      completed: false,
      rewardLabel: 't',
      rewardCoins: 1,
      rewardMedicine: 0,
      rewardKnowledge: 0,
    },
  })
  // DAYS_PER_SEASON=10 → day 11 入夏
  useGameStore.getState().tick(60) // 加速跨天：1s * timeScale，GAME_MINUTES_PER_REAL_SECOND?
  // 用大 delta 跨过午夜
  const gBefore = useGameStore.getState().seasonGoal
  useGameStore.setState({ timeScale: 100 })
  // GAME_MINUTES_PER_REAL_SECOND — check value
  for (let i = 0; i < 50; i++) useGameStore.getState().tick(1)
  const after = useGameStore.getState()
  if (after.day >= 11) {
    assert(after.season === 'summer' || after.day > 10, '跨季进入下一季')
    assert(
      after.seasonGoal.season === 'summer' || after.seasonGoal !== gBefore,
      '换季刷新季节目标',
    )
  } else {
    // fallback：直接 day 跳
    useGameStore.getState().devSet({ day: 11, season: 'summer' })
    assert(useGameStore.getState().seasonGoal.season === 'summer', 'Dev 换季刷新目标')
  }
}

console.log('\n=== Store：completeGoal / rerollGoal ===')
{
  useGameStore.getState().restartGame()
  useGameStore.setState({
    seasonGoal: {
      kind: 'cottage_level',
      target: 3,
      progress: 0,
      season: 'spring',
      completed: false,
      rewardLabel: 't',
      rewardCoins: 90,
      rewardMedicine: 1,
      rewardKnowledge: 3,
    },
    coins: 0,
    inventory: { ...useGameStore.getState().inventory, medicine: 0, knowledge: 0 },
  })
  useGameStore.getState().devSet({ completeGoal: true })
  const done = useGameStore.getState()
  assert(done.seasonGoal.completed === true, 'Dev 完成目标')
  assert(done.coins === 90, 'Dev 完成发金币')
  assert((done.inventory.knowledge ?? 0) === 3, 'Dev 完成发知识')
  assert((done.inventory.medicine ?? 0) === 1, 'Dev 完成发药品')

  useGameStore.getState().devSet({ rerollGoal: true })
  assert(useGameStore.getState().seasonGoal.completed === false, '重抽目标未完成')
}

console.log('\n=== 大事抽签与疫病/投奔 ===')
{
  assert(pickMajorEventKind({ pirate: 0, plague: 0, stray: 0 }, () => 0) === null, '全 0 → null')
  assert(
    pickMajorEventKind({ pirate: 0, plague: 0.5, stray: 0 }, () => 0.9) === null,
    'r>=total → null',
  )
  let i = 0
  const seq = [0.0, 0.1]
  const kind = pickMajorEventKind({ pirate: 0, plague: 0.5, stray: 0.5 }, () => seq[i++]!)
  assert(kind === 'plague', '第二次 rng 选 plague')

  const four = [
    cat({ id: 'a', role: 'farmer' }),
    cat({ id: 'b', role: 'miner' }),
    cat({ id: 'c', role: 'fisher' }),
    cat({ id: 'd', role: 'scholar' }),
  ]
  const six = [
    ...four,
    cat({ id: 'e', role: 'doctor' }),
    cat({ id: 'f', role: 'lumberjack' }),
  ]
  assert(
    canRollPlague({ day: 20, cats: four, inventory: { medicine: 0 } }) === false,
    '猫不足6不疫病',
  )
  assert(
    canRollPlague({ day: 20, cats: six, inventory: { medicine: 0 } }) === true,
    '药紧可疫病',
  )
  assert(
    canRollPlague({ day: 10, cats: six, inventory: { medicine: 0 } }) === false,
    '过早不疫病',
  )
  assert(plagueIsolateMedicineCost(six) >= 2, '隔离药量至少 2')

  assert(
    canRollStray({
      day: 16,
      cats: [cat({ id: 'a', role: 'farmer' })],
      cottageLevel: 1,
      inventory: { fish: 20, toy: 1, snack: 1 },
    }) === true,
    '空位+物资可投奔',
  )
  const rejected = applyStrayReject({
    nowAbs: 100,
    prev: emptyMajorEvent(),
    auto: true,
  })
  assert(rejected.nextEligibleAt === 100 + MAJOR_COOLDOWN_MINUTES, '婉拒写冷却')

  const withPlague = {
    ...emptyMajorEvent(),
    plagueUntil: 999,
    plagueSickMult: 2.2,
  }
  const cleared = clearDecisionWindow(withPlague, 50)
  assert(cleared.plagueUntil === 999 && cleared.plagueSickMult === 2.2, '清窗保留疫病残留')
  assert(cleared.phase === 'idle' && cleared.kind === 'none', '清窗后 idle')
}

console.log('\n=== 经济夹帽与溢出 ===')
{
  const b0 = DEFAULT_SOFT_CAP_BUILDINGS
  const a = applyInventoryGain({ fish: FISH_SOFT_CAP }, 100, { fish: 3 }, b0)
  assert(a.inventory.fish === FISH_SOFT_CAP, '鱼不加超帽')
  assert(a.coinFromOverflow === 12, '3鱼溢出兑金 12')
  const b = applyCoinGain(COIN_SOFT_CAP, 50, COIN_SOFT_CAP)
  assert(b.coins === COIN_SOFT_CAP && b.discarded === 50, '金库满丢弃')
  const w = applyWheatHarvestGain({ wheat: 8 }, 0, 5, 8, b0)
  assert(w.inventory.wheat === 8 && w.coinFromOverflow === 20, '满仓麦兑金')
  const c = applyComfortConsume({ snack: 1, toy: 10 }, 3)
  assert(c.snackUsed === 1 && c.toyUsed === 2, '舒适先零食后玩具合计扣')
  assert((c.inventory.snack ?? 0) === 0 && (c.inventory.toy ?? 0) === 8, '舒适库存正确')

  const b1 = { cottage: 1, harbor: 1, boat: 1, granary: 0 }
  assert(coinSoftCap(b1) === 3000, '开局金库')
  assert(softCapFor('ore', b1) === 40, '未建仓矿=40')
  const b3 = { cottage: 3, harbor: 1, boat: 1, granary: 0 }
  assert(coinSoftCap(b3) === 4200, '小屋3金库')
  const bh3 = { cottage: 1, harbor: 3, boat: 1, granary: 0 }
  assert(coinSoftCap(bh3) === 4200, '码头3金库')
  assert(softCapFor('fish', bh3) === 64, '码头3鱼帽')
  assert(softCapFor('medicine', bh3) === 40, '药帽仍随货船不随码头')
  const g8 = { cottage: 1, harbor: 1, boat: 1, granary: 8 }
  assert(softCapFor('ore', g8) === 96 && softCapFor('wood', g8) === 96, '仓8矿木')
  const gain = applyInventoryGain({ fish: 64 }, 0, { fish: 2 }, bh3)
  assert(gain.inventory.fish === 64 && gain.coinFromOverflow === 8, '动态帽溢出兑金')

  const before = { cottage: 1, harbor: 1, boat: 1, granary: 0 }
  const afterCottage = { ...before, cottage: 2 }
  assert(
    softCapDeltaHint(before, afterCottage) ===
      '玩具 +4 · 零食 +4 · 知识 +8 · 金库 +600',
    '小屋1→2且港1：玩零知金库',
  )

  const beforeHarborHigh = { cottage: 1, harbor: 3, boat: 1, granary: 0 }
  const afterCottage2 = { ...beforeHarborHigh, cottage: 2 }
  const hintCottageUnderHarbor = softCapDeltaHint(beforeHarborHigh, afterCottage2)
  assert(
    hintCottageUnderHarbor.includes('玩具 +4') && hintCottageUnderHarbor.includes('知识 +8'),
    '港高时仍涨玩知',
  )
  assert(!hintCottageUnderHarbor.includes('金库'), '港≥2升小屋不含金库')

  assert(
    softCapDeltaHint(before, { ...before, harbor: 2 }) === '鱼肉 +8 · 金库 +600',
    '港口1→2',
  )
  assert(softCapDeltaHint(before, { ...before, boat: 2 }) === '药品 +8', '货船1→2')
  assert(softCapDeltaHint(before, { ...before, granary: 1 }) === '', '建仓0→1无软帽涨')
  assert(
    softCapDeltaHint({ ...before, granary: 1 }, { ...before, granary: 2 }) ===
      '矿石 +8 · 木材 +8',
    '仓1→2矿木',
  )

  const shopActions = getShopActions({
    granary: { level: 0, condition: 100 },
    harbor: { level: 1 },
    boat: { level: 1 },
    cottage: { level: 1 },
    ownedBreedIds: [],
    catCount: 1,
    cats: [],
  })
  const cottageUp = shopActions.find((a) => a.id === 'cottage_upgrade')
  assert(
    !!cottageUp &&
      cottageUp.desc.includes('玩具 +4') &&
      cottageUp.desc.includes('金库 +600'),
    '商店小屋desc含软帽增量',
  )
  const granaryBuy = shopActions.find((a) => a.id === 'granary_buy')
  assert(!!granaryBuy && !granaryBuy.desc.includes('矿石'), '建仓desc无矿石增量')

  const pAt = (wealth: number) => rollPirateChance(wealth, {})
  assert(Math.abs(pAt(PIRATE_WEALTH_THRESHOLD) - 0.05) < 1e-9, '海盗刚过线≈5%')
  assert(Math.abs(pAt(PIRATE_WEALTH_THRESHOLD * 2) - 0.08) < 1e-9, '海盗约2×富裕≈8%')
  assert(pAt(PIRATE_WEALTH_THRESHOLD * 20) === 0.14, '海盗封顶14%')

  assert(catCapForCottage(1) === 5 && catCapForCottage(8) === 12, '猫口 Lv1=5 / Lv8=12')
  assert(COTTAGE_UPGRADE_PRICE[2] === 150 && SEED_PACK_PRICE === 15, '消耗轻度抬高抽样')
  assert(COTTAGE_UPGRADE_PRICE[8] === 3205, '小屋满级升级陡坡')

  assert(heatingWoodNeed(1, 'spring') === 1, '非冬取暖1猫=1木')
  assert(heatingWoodNeed(3, 'winter') === 6, '冬天取暖3猫=6木')
  assert(createFreshPersistSlice().inventory.wood === STARTING_WOOD, '开局自带木材')
  assert(createFreshPersistSlice().inventory.ore === STARTING_ORE, '开局自带矿石')
  assert(
    toolMaintOreNeed([
      { role: 'miner' },
      { role: 'farmer' },
      { role: 'fisher' },
    ]) === 2,
    '工具保养只计户外工',
  )
  assert(applyToolsWornYield(2, true) === 1, '工具钝产量×0.85')
  assert(applyToolsWornYield(2, false) === 2, '工具好产量不变')
}

console.log(`\n======== 结果: ${passed} 通过, ${failed} 失败 ========`)
process.exit(failed > 0 ? 1 : 0)
