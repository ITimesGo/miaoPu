import { dailyFishNeed } from './careers'
import {
  applyCoinGain,
  applyInventoryGain,
  coinSoftCap,
  formatOverflowStatus,
  type SoftCapBuildings,
} from './economy'
import {
  DAYS_PER_SEASON,
  MINUTES_PER_DAY,
  type CatInstance,
  type LevelState,
} from '../types'

/** 真实倒计时：约半小时 */
export const PIRATE_DECIDE_MS = 30 * 60 * 1000
/** 对抗进度条时长（真实秒） */
export const PIRATE_FIGHT_MS = 5500

export const PIRATE_MIN_DAY = 22
/** 总富裕度阈值：金币 + 库存加权 */
export const PIRATE_WEALTH_THRESHOLD = 780
/** 纯库存加权阈值（不含金币）：避免「只有钱、仓库空」或早期轻囤就招贼 */
export const PIRATE_STOCK_THRESHOLD = 420
/** 触发后冷却（游戏分钟）≈ 1.5 季 */
export const PIRATE_COOLDOWN_MINUTES = Math.floor(DAYS_PER_SEASON * 1.5 * MINUTES_PER_DAY)

export type PiratePhase = 'idle' | 'threat' | 'fighting' | 'result'
export type PirateFightOutcome = 'crush' | 'draw' | 'win' | 'wipe'

export type PirateRaidState = {
  phase: PiratePhase
  /** 决策截止：Date.now() 墙钟 */
  decideBy: number
  /** 对抗演出结束：Date.now() */
  fightEndsAt: number
  /** 开打时已掷好、条满再揭晓 */
  pendingOutcome: PirateFightOutcome | null
  resultTitle: string
  resultBody: string
  /** 下次可触发：绝对游戏分钟 */
  nextEligibleAt: number
  /** 结果尚未点「知道了」（含挂机自动献贡） */
  needsAck: boolean
  autoResolved: boolean
}

export function emptyPirateRaid(nextEligibleAt = 0): PirateRaidState {
  return {
    phase: 'idle',
    decideBy: 0,
    fightEndsAt: 0,
    pendingOutcome: null,
    resultTitle: '',
    resultBody: '',
    nextEligibleAt,
    needsAck: false,
    autoResolved: false,
  }
}

/** 仓库物资加权（不含金币） */
export function stockScore(inventory: Record<string, number>): number {
  return (
    (inventory.fish ?? 0) * 3 +
    (inventory.ore ?? 0) * 4 +
    (inventory.wood ?? 0) * 3 +
    (inventory.wheat ?? 0) * 2 +
    (inventory.knowledge ?? 0) * 5 +
    (inventory.medicine ?? 0) * 8 +
    (inventory.toy ?? 0) * 2 +
    (inventory.snack ?? 0) * 2
  )
}

export function wealthScore(coins: number, inventory: Record<string, number>): number {
  return coins * 1 + stockScore(inventory)
}

export function canRollPirateRaid(input: {
  day: number
  nowAbs: number
  coins: number
  inventory: Record<string, number>
  gameOver: boolean
  pirate: PirateRaidState
  eventKind: string
}): boolean {
  const { day, nowAbs, coins, inventory, gameOver, pirate, eventKind } = input
  if (gameOver) return false
  if (pirate.phase !== 'idle' || pirate.needsAck) return false
  if (day < PIRATE_MIN_DAY) return false
  if (nowAbs < pirate.nextEligibleAt) return false
  if (eventKind !== 'none') return false
  if (stockScore(inventory) < PIRATE_STOCK_THRESHOLD) return false
  return wealthScore(coins, inventory) >= PIRATE_WEALTH_THRESHOLD
}

/** 日结时富裕越高越容易招海盗（刚过线偏低；斜率/封顶已压平，适配更高软帽） */
export function rollPirateChance(coins: number, inventory: Record<string, number>): number {
  const w = wealthScore(coins, inventory)
  const over = Math.max(0, w - PIRATE_WEALTH_THRESHOLD) / PIRATE_WEALTH_THRESHOLD
  return Math.min(0.14, 0.05 + over * 0.03)
}

export function startPirateThreat(now = Date.now()): PirateRaidState {
  return {
    ...emptyPirateRaid(),
    phase: 'threat',
    decideBy: now + PIRATE_DECIDE_MS,
    needsAck: false,
    autoResolved: false,
  }
}

export type TributeResult = {
  inventory: Record<string, number>
  coins: number
  taken: Array<{ label: string; amount: number }>
  summary: string
}

export function applyPirateTribute(input: {
  coins: number
  inventory: Record<string, number>
  cats: CatInstance[]
}): TributeResult {
  const inv = { ...input.inventory }
  const taken: Array<{ label: string; amount: number }> = []
  let coins = input.coins

  const fishNeed = Math.max(2, dailyFishNeed(input.cats) * 2)
  const fishHave = inv.fish ?? 0
  const fishTake = Math.max(0, Math.min(Math.floor(fishHave * 0.28), fishHave - fishNeed))
  if (fishTake > 0) {
    inv.fish = fishHave - fishTake
    taken.push({ label: '鱼肉', amount: fishTake })
  }

  const coinKeep = 25
  const coinTake = Math.max(0, Math.min(Math.floor(coins * 0.22), coins - coinKeep))
  if (coinTake > 0) {
    coins -= coinTake
    taken.push({ label: '金币', amount: coinTake })
  }

  for (const [key, label, rate] of [
    ['ore', '矿石', 0.22],
    ['wood', '木材', 0.22],
    ['wheat', '小麦', 0.18],
  ] as const) {
    const have = inv[key] ?? 0
    const n = Math.floor(have * rate)
    if (n > 0) {
      inv[key] = have - n
      taken.push({ label, amount: n })
    }
  }

  if (taken.length === 0) {
    const crumb = Math.min(8, coins)
    if (crumb > 0) {
      coins -= crumb
      taken.push({ label: '金币', amount: crumb })
    }
  }

  const summary =
    taken.length > 0
      ? `海盗收走：${taken.map((t) => `${t.label}×${t.amount}`).join('、')}，然后离去。`
      : '海盗翻了翻库房，嫌油水不够，骂骂咧咧走了。'

  return { inventory: inv, coins, taken, summary }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function rollFightOutcome(input: {
  cats: CatInstance[]
  cottage: LevelState
}): PirateFightOutcome {
  const healthy = input.cats.filter((c) => !c.sick)
  const sailors = healthy.filter((c) => c.role === 'sailor').length
  const miners = healthy.filter((c) => c.role === 'miner').length
  const doctors = healthy.filter((c) => c.role === 'doctor').length
  const cottageBonus = Math.max(0, input.cottage.level - 1)

  // 基准：惨败 35 / 胶着 40 / 小胜 22 / 全灭 3
  let crush = 35
  let draw = 40
  let win = 22
  let wipe = 3
  const shift = Math.min(14, sailors * 2 + miners + doctors + cottageBonus)
  crush = Math.max(18, crush - shift)
  win += Math.floor(shift * 0.65)
  draw += shift - Math.floor(shift * 0.65)
  wipe = Math.max(1, wipe - Math.floor(shift / 8))

  const total = crush + draw + win + wipe
  let r = Math.random() * total
  if (r < crush) return 'crush'
  r -= crush
  if (r < draw) return 'draw'
  r -= draw
  if (r < win) return 'win'
  return 'wipe'
}

export type FightApplyResult = {
  cats: CatInstance[]
  inventory: Record<string, number>
  coins: number
  gameOver: boolean
  title: string
  body: string
}

function loseCats(cats: CatInstance[], fraction: number, atLeast: number): {
  remaining: CatInstance[]
  lostNames: string[]
} {
  if (cats.length === 0) return { remaining: [], lostNames: [] }
  const n = Math.min(
    cats.length,
    Math.max(atLeast, Math.round(cats.length * clamp01(fraction))),
  )
  if (n <= 0) return { remaining: cats, lostNames: [] }
  const idxs = cats.map((_, i) => i)
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idxs[i], idxs[j]] = [idxs[j]!, idxs[i]!]
  }
  const loseSet = new Set(idxs.slice(0, n))
  const lostNames: string[] = []
  const remaining = cats.filter((c, i) => {
    if (!loseSet.has(i)) return true
    lostNames.push(c.id)
    return false
  })
  return { remaining, lostNames }
}

export function applyFightOutcome(input: {
  outcome: PirateFightOutcome
  cats: CatInstance[]
  inventory: Record<string, number>
  coins: number
  buildings: SoftCapBuildings
  nameOf: (breedId: string) => string
}): FightApplyResult {
  const { outcome, inventory, coins, buildings, nameOf } = input
  let cats = [...input.cats]

  if (outcome === 'wipe') {
    return {
      cats: [],
      inventory,
      coins,
      gameOver: true,
      title: '全岛陷落',
      body: '海盗势不可挡，喵圃的猫都失散了…资源还在，只是再无守岛的猫。',
    }
  }

  if (outcome === 'crush') {
    const { remaining, lostNames } = loseCats(cats, 0.4, 1)
    cats = remaining
    const names = lostNames
      .map((id) => {
        const c = input.cats.find((x) => x.id === id)
        return c ? nameOf(c.breedId) : '小猫'
      })
      .join('、')
    const gameOver = cats.length === 0
    return {
      cats,
      inventory,
      coins,
      gameOver,
      title: gameOver ? '全岛陷落' : '苦战败退',
      body: gameOver
        ? '抵抗失败，猫猫们都离开了喵圃…'
        : `海盗攻势凶猛，${names} 失散离岛。库存未被洗劫，但岛上安静了许多。`,
    }
  }

  if (outcome === 'draw') {
    const { remaining, lostNames } = loseCats(cats, 0.15, cats.length >= 3 ? 1 : 0)
    cats = remaining
    if (lostNames.length === 0) {
      return {
        cats,
        inventory,
        coins,
        gameOver: false,
        title: '险险挡住',
        body: '双方僵持到潮水退去。没有猫离开，也没有缴获——算是撑过来了。',
      }
    }
    const names = lostNames
      .map((id) => {
        const c = input.cats.find((x) => x.id === id)
        return c ? nameOf(c.breedId) : '小猫'
      })
      .join('、')
    return {
      cats,
      inventory,
      coins,
      gameOver: cats.length === 0,
      title: '两败俱伤',
      body: `混战中 ${names} 失散。海盗没能抢走物资，潮水把他们冲走了。`,
    }
  }

  // win：战利品经夹帽/溢出兑金
  const gains: Record<string, number> = {
    ore: 2 + Math.floor(Math.random() * 3),
    wood: 2 + Math.floor(Math.random() * 3),
  }
  const medLoot = Math.random() < 0.55 ? 1 + Math.floor(Math.random() * 2) : 0
  if (medLoot > 0) gains.medicine = medLoot
  const stock = applyInventoryGain(inventory, coins, gains, buildings)
  const coinGain = 18 + Math.floor(Math.random() * 25)
  const coin = applyCoinGain(stock.coins, coinGain, coinSoftCap(buildings))
  const loot: string[] = []
  if ((stock.added.ore ?? 0) > 0) loot.push(`矿石×${stock.added.ore}`)
  if ((stock.added.wood ?? 0) > 0) loot.push(`木材×${stock.added.wood}`)
  if ((stock.added.medicine ?? 0) > 0) loot.push(`药品×${stock.added.medicine}`)
  if (coin.added > 0) loot.push(`金币×${coin.added}`)
  const overflowNote = formatOverflowStatus(stock)
  if (overflowNote) loot.push(overflowNote)
  if (coin.discarded > 0) loot.push('金库已满')

  const maybeLose = Math.random() < 0.22 && cats.length > 2
  let bodyExtra = ''
  if (maybeLose) {
    const { remaining, lostNames } = loseCats(cats, 0, 1)
    cats = remaining
    const nm = lostNames[0]
      ? nameOf(input.cats.find((c) => c.id === lostNames[0])!.breedId)
      : '小猫'
    bodyExtra = `激战中 ${nm} 受了惊吓跑丢了。`
  }

  return {
    cats,
    inventory: stock.inventory,
    coins: coin.coins,
    gameOver: cats.length === 0,
    title: '击退海盗',
    body: `猫群守住了码头！搜刮到 ${loot.join('、')}。${bodyExtra}`.trim(),
  }
}

export const PIRATE_FIGHT_BEATS = [
  '海平线上出现黑帆…',
  '海盗正在靠岸…',
  '猫群在码头列阵…',
  '矿工扛起镐子冲上前…',
  '刀光火光搅作一团…',
  '胜负即将揭晓…',
]

export function fightBeatAt(progress01: number): string {
  const i = Math.min(
    PIRATE_FIGHT_BEATS.length - 1,
    Math.floor(clamp01(progress01) * PIRATE_FIGHT_BEATS.length),
  )
  return PIRATE_FIGHT_BEATS[i]!
}
