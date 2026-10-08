# 偶发大事（疫病潮 + 流浪猫）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **本仓库约定：** 未经用户明确要求不要 `git commit`；跳过所有 Commit 步骤。

**Goal:** 将海盗迁入统一 `majorEvent`，并新增偶发决策大事「疫病潮」「流浪猫投奔」（互斥弹窗、墙钟超时默认、共享冷却）。

**Architecture:** 新 `majorEvents.ts` 管门槛 / `p(kind)` 抽签 / 疫病与投奔结算；`pirates.ts` 保留献贡与战斗；`gameStore` 以 `majorEvent` 驱动日结与 action；`MajorEventPanel` 按 kind 渲染；存档兼容旧 `pirateRaid`。

**Tech Stack:** React 19、Zustand、TypeScript、Vite。验证：`npx tsx scripts/edge-flows.ts`（扩展断言）+ `npm run build`。无新依赖。

**Spec:** `docs/superpowers/specs/2026-10-08-major-events-plague-stray-design.md`

---

## 文件结构

| 文件 | 职责 |
|------|------|
| Create `src/game/data/majorEvents.ts` | `MajorEventState`、常量、`canRoll*`、`p*`、`pickMajorEventKind`、疫病/投奔结算纯函数 |
| Modify `src/game/data/pirates.ts` | 导出供 majorEvents 用的门槛/概率；`canRollPirateRaid` 可保留但日结改为走统一抽签 |
| Create `src/ui/MajorEventPanel.tsx` | 统一面板（自 `PirateRaidPanel` 扩展） |
| Delete or thin `src/ui/PirateRaidPanel.tsx` | 删除并改 App 引用，或 re-export `MajorEventPanel` |
| Modify `src/game/state/gameStore.ts` | `majorEvent` 字段、墙钟、日结 roll、action、`devSet`、生病倍率 |
| Modify `src/game/state/saveGame.ts` | 持久化 + 旧 `pirateRaid` 映射 |
| Modify `src/ui/DevToolbar.tsx` | 强制三类、清冷却、plagueUntil |
| Modify `src/game/data/manual.ts` | 偶发大事文案 |
| Modify `src/ui/Hud.tsx` | 可选：疫病残留 HUD 一行 |
| Modify `src/App.tsx` | 挂载 `MajorEventPanel` |
| Modify `scripts/edge-flows.ts` | 纯函数冒烟断言 |

---

### Task 1: `majorEvents.ts` 类型、门槛、抽签纯函数

**Files:**
- Create: `src/game/data/majorEvents.ts`
- Modify: `scripts/edge-flows.ts`

- [ ] **Step 1: 实现状态与工厂**

```ts
import { PIRATE_COOLDOWN_MINUTES, PIRATE_DECIDE_MS, rollPirateChance, type PirateFightOutcome } from './pirates'
import { dailyFishNeed, medicinePerCure } from './careers'
import { catCapForCottage, DAYS_PER_SEASON, MINUTES_PER_DAY, type CatInstance } from '../types'
import { nextRecruitBreed, CAT_BREEDS } from './breeds'

export const MAJOR_DECIDE_MS = PIRATE_DECIDE_MS
export const MAJOR_COOLDOWN_MINUTES = PIRATE_COOLDOWN_MINUTES
export const PIRATE_P_WEIGHT = 0.55

export const PLAGUE_MIN_DAY = 20
export const PLAGUE_MIN_CATS = 4
export const STRAY_MIN_DAY = 16
export const STRAY_MIN_EMPTY_SLOTS = 2

export type MajorEventKind = 'none' | 'pirate' | 'plague' | 'stray'
export type MajorEventPhase = 'idle' | 'threat' | 'fighting' | 'result'

export type MajorEventState = {
  kind: MajorEventKind
  phase: MajorEventPhase
  decideBy: number
  fightEndsAt: number
  pendingOutcome: PirateFightOutcome | null
  resultTitle: string
  resultBody: string
  nextEligibleAt: number
  needsAck: boolean
  autoResolved: boolean
  plagueUntil: number
  plagueSickMult: number
  strayBreedId: string
  strayCostFish: number
  strayCostCoins: number
}

export function emptyMajorEvent(nextEligibleAt = 0): MajorEventState {
  return {
    kind: 'none',
    phase: 'idle',
    decideBy: 0,
    fightEndsAt: 0,
    pendingOutcome: null,
    resultTitle: '',
    resultBody: '',
    nextEligibleAt,
    needsAck: false,
    autoResolved: false,
    plagueUntil: 0,
    plagueSickMult: 1,
    strayBreedId: '',
    strayCostFish: 0,
    strayCostCoins: 0,
  }
}

/** 保留 plague 残留字段，清空决策窗 */
export function clearDecisionWindow(
  prev: MajorEventState,
  nextEligibleAt: number,
): MajorEventState {
  return {
    ...emptyMajorEvent(nextEligibleAt),
    plagueUntil: prev.plagueUntil,
    plagueSickMult: prev.plagueSickMult,
  }
}
```

- [ ] **Step 2: 实现门槛与 `p(kind)`、抽签**

```ts
export function decisionWindowBusy(ev: MajorEventState): boolean {
  return ev.phase !== 'idle' || ev.needsAck
}

export function canRollPlague(input: {
  day: number
  cats: CatInstance[]
  inventory: Record<string, number>
}): boolean {
  const { day, cats, inventory } = input
  if (day < PLAGUE_MIN_DAY || cats.length < PLAGUE_MIN_CATS) return false
  const cost = medicinePerCure(cats)
  const med = inventory.medicine ?? 0
  const sickCount = cats.filter((c) => c.sick).length
  return med <= cats.length * cost * 0.5 || sickCount >= 2
}

export function plagueChance(input: {
  cats: CatInstance[]
  inventory: Record<string, number>
}): number {
  const cost = medicinePerCure(input.cats)
  const med = input.inventory.medicine ?? 0
  const need = input.cats.length * cost
  const tight = need > 0 ? Math.max(0, 1 - med / need) : 0
  const medicineTightBonus = tight * 0.04
  const noDoctorBonus = input.cats.some((c) => c.role === 'doctor') ? 0 : 0.02
  return Math.min(0.1, Math.max(0.04, 0.04 + medicineTightBonus + noDoctorBonus))
}

export function canRollStray(input: {
  day: number
  cats: CatInstance[]
  cottageLevel: number
  inventory: Record<string, number>
}): boolean {
  const { day, cats, cottageLevel, inventory } = input
  if (day < STRAY_MIN_DAY) return false
  const empty = catCapForCottage(cottageLevel) - cats.length
  if (empty < STRAY_MIN_EMPTY_SLOTS) return false
  const fishNeed = dailyFishNeed(cats)
  if ((inventory.fish ?? 0) < fishNeed * 2) return false
  const comfort = (inventory.toy ?? 0) + (inventory.snack ?? 0)
  return comfort >= 2
}

export function strayChance(input: {
  cats: CatInstance[]
  cottageLevel: number
}): number {
  const empty = catCapForCottage(input.cottageLevel) - input.cats.length
  const emptySlotBonus = Math.max(0, empty - STRAY_MIN_EMPTY_SLOTS) * 0.015
  return Math.min(0.08, Math.max(0.03, 0.03 + emptySlotBonus))
}

调用方组装权重（store 日结）：

```ts
const pirateP = canPirate ? rollPirateChance(coins, inv) * PIRATE_P_WEIGHT : 0
const plagueP = canPlague ? plagueChance(...) : 0
const strayP = canStray ? strayChance(...) : 0
const kind = pickMajorEventKind({ pirate: pirateP, plague: plagueP, stray: strayP })
```

抽签（规格严格版：两次 rng——先是否出，再按比例选）：

```ts
export function pickMajorEventKind(
  weights: { pirate: number; plague: number; stray: number },
  rng = Math.random,
): MajorEventKind | null {
  const entries = (['pirate', 'plague', 'stray'] as const)
    .map((kind) => ({ kind, p: Math.max(0, weights[kind]) }))
    .filter((e) => e.p > 0)
  const total = entries.reduce((s, e) => s + e.p, 0)
  if (total <= 0) return null
  if (rng() >= Math.min(1, total)) return null
  let r = rng() * total
  for (const e of entries) {
    r -= e.p
    if (r < 0) return e.kind
  }
  return entries[entries.length - 1]!.kind
}
```

- [ ] **Step 3: 在 `edge-flows.ts` 加抽签断言**

```ts
import { pickMajorEventKind, canRollPlague, canRollStray } from '../src/game/data/majorEvents'

console.log('\n=== 大事抽签 ===')
{
  assert(pickMajorEventKind({ pirate: 0, plague: 0, stray: 0 }, () => 0) === null, '全 0 → null')
  assert(
    pickMajorEventKind({ pirate: 0, plague: 0.5, stray: 0 }, () => 0.9) === null,
    'r>=total → null',
  )
  // 固定 rng：第一次 0.0 过门槛，第二次落在 plague
  let i = 0
  const seq = [0.0, 0.1]
  const kind = pickMajorEventKind({ pirate: 0, plague: 0.5, stray: 0.5 }, () => seq[i++]!)
  assert(kind === 'plague', '第二次 rng 选 plague')
}
```

Run: `npm run test:flows`  
Expected: 新断言通过。

- [ ] **Step 4: Commit** — 跳过（除非用户要求）

---

### Task 2: 疫病 / 投奔结算纯函数 + 开局 threat 工厂

**Files:**
- Modify: `src/game/data/majorEvents.ts`
- Modify: `scripts/edge-flows.ts`

- [ ] **Step 1: 实现耗药、隔离/硬扛、收留/婉拒**

```ts
export function plagueIsolateMedicineCost(cats: CatInstance[]): number {
  const base = Math.max(2, cats.length * medicinePerCure(cats))
  const hasDoc = cats.some((c) => c.role === 'doctor')
  return Math.max(1, hasDoc ? base - 1 : base)
}

export function applyPlagueIsolate(input: {
  nowAbs: number
  cats: CatInstance[]
  inventory: Record<string, number>
  prev: MajorEventState
}): {
  inventory: Record<string, number>
  cats: CatInstance[]
  majorEvent: MajorEventState
  title: string
  body: string
} {
  const cost = plagueIsolateMedicineCost(input.cats)
  const inv = { ...input.inventory }
  inv.medicine = Math.max(0, (inv.medicine ?? 0) - cost)
  // 治愈：有药则按 medicinePerCure 继续扣（与日间治愈同思路）；实现时调用方也可复用 store 的 tryCure
  // 规格：立刻尝试用药治愈 —— 在 store action 里调现有 cure 逻辑更稳；此处至少写 plague 字段
  const nextEligible = input.nowAbs + MAJOR_COOLDOWN_MINUTES
  const base = clearDecisionWindow(input.prev, nextEligible)
  return {
    inventory: inv,
    cats: input.cats, // store 内再跑治愈
    majorEvent: {
      ...base,
      phase: 'result',
      needsAck: true,
      resultTitle: '隔离防疫',
      resultBody: `消耗药品 ×${cost}。未来两日生病风险降低。`,
      plagueUntil: input.nowAbs + 2 * MINUTES_PER_DAY,
      plagueSickMult: 0.5,
    },
    title: '隔离防疫',
    body: `消耗药品 ×${cost}。未来两日生病风险降低。`,
  }
}

export function applyPlagueEndure(input: {
  nowAbs: number
  cats: CatInstance[]
  prev: MajorEventState
  auto: boolean
}): MajorEventState {
  const hasDoc = input.cats.some((c) => c.role === 'doctor')
  const nextEligible = input.nowAbs + MAJOR_COOLDOWN_MINUTES
  const base = clearDecisionWindow(input.prev, nextEligible)
  return {
    ...base,
    phase: 'result',
    needsAck: true,
    autoResolved: input.auto,
    resultTitle: input.auto ? '疫病潮：已硬扛' : '选择硬扛',
    resultBody: input.auto
      ? '你不在时岛民只能硬扛疫病。未来三日生病风险升高。'
      : `未来三日生病风险升高（倍率 ×${hasDoc ? 1.7 : 2.2}）。`,
    plagueUntil: input.nowAbs + 3 * MINUTES_PER_DAY,
    plagueSickMult: hasDoc ? 1.7 : 2.2,
  }
}

export function rollStrayOffer(ownedBreedIds: string[]): {
  strayBreedId: string
  strayCostFish: number
  strayCostCoins: number
} {
  const next = nextRecruitBreed(ownedBreedIds)
  const pool = CAT_BREEDS.filter((b) => b.recruitPrice > 0)
  const breed = next ?? pool[Math.floor(Math.random() * pool.length)]!
  return {
    strayBreedId: breed.id,
    strayCostFish: 5 + Math.floor(Math.random() * 4), // 5..8
    strayCostCoins: 20 + Math.floor(Math.random() * 21), // 20..40
  }
}

export function applyStrayReject(input: {
  nowAbs: number
  prev: MajorEventState
  auto: boolean
}): MajorEventState {
  const nextEligible = input.nowAbs + MAJOR_COOLDOWN_MINUTES
  return {
    ...clearDecisionWindow(input.prev, nextEligible),
    phase: 'result',
    needsAck: true,
    autoResolved: input.auto,
    resultTitle: input.auto ? '流浪猫：已婉拒' : '婉拒投奔',
    resultBody: '它们去了别的岛。',
  }
}
```

收留的猫实例生成放在 store（需 `createCat` / 招募路径）；纯函数只校验代价：

```ts
export function canAffordStray(
  coins: number,
  inventory: Record<string, number>,
  offer: { strayCostFish: number; strayCostCoins: number },
): boolean {
  return (
    coins >= offer.strayCostCoins &&
    (inventory.fish ?? 0) >= offer.strayCostFish
  )
}

export function startMajorThreat(
  kind: Exclude<MajorEventKind, 'none'>,
  prev: MajorEventState,
  extras: Partial<MajorEventState> = {},
  now = Date.now(),
): MajorEventState {
  return {
    ...prev,
    kind,
    phase: 'threat',
    decideBy: now + MAJOR_DECIDE_MS,
    fightEndsAt: 0,
    pendingOutcome: null,
    needsAck: false,
    autoResolved: false,
    resultTitle: '',
    resultBody: '',
    ...extras,
  }
}
```

- [ ] **Step 2: edge-flows 断言耗药与婉拒冷却**

```ts
assert(plagueIsolateMedicineCost([/*4 cats no doctor*/]) >= 2, '隔离药量至少 2')
assert(applyStrayReject({ nowAbs: 100, prev: emptyMajorEvent(), auto: true }).nextEligibleAt === 100 + MAJOR_COOLDOWN_MINUTES, '婉拒写冷却')
```

Run: `npm run test:flows`

- [ ] **Step 3: Commit** — 跳过

---

### Task 3: 存档兼容 + store 字段迁入海盗

**Files:**
- Modify: `src/game/state/saveGame.ts`
- Modify: `src/game/state/gameStore.ts`（类型、初始态、墙钟、献贡/战斗 action 改读 `majorEvent`）

- [ ] **Step 1: `sanitizeMajorEvent`（完整规则，对齐现有 `sanitizePirate`）**

```ts
const KINDS = new Set(['none', 'pirate', 'plague', 'stray'])
const PHASES = new Set(['idle', 'threat', 'fighting', 'result'])
const OUTCOMES = new Set(['crush', 'draw', 'win', 'wipe'])

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function sanitizeMajorEvent(raw: unknown, legacyPirate?: unknown): MajorEventState {
  const fresh = emptyMajorEvent()
  const src =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
  const pirate =
    !src && legacyPirate && typeof legacyPirate === 'object'
      ? (legacyPirate as Record<string, unknown>)
      : null
  const o = src ?? pirate
  if (!o) return fresh

  const phase = PHASES.has(String(o.phase)) ? (o.phase as MajorEventPhase) : 'idle'
  const needsAck = !!o.needsAck
  let kind: MajorEventKind = KINDS.has(String(o.kind))
    ? (o.kind as MajorEventKind)
    : 'none'
  // 旧档无 kind：有决策窗则视为 pirate
  if (!src && pirate) {
    kind = phase === 'idle' && !needsAck ? 'none' : 'pirate'
  }
  if (kind === 'none' && (phase !== 'idle' || needsAck)) {
    kind = 'pirate' // 防御：有窗无 kind
  }

  const pending = o.pendingOutcome
  return {
    kind,
    phase,
    decideBy: num(o.decideBy),
    fightEndsAt: num(o.fightEndsAt),
    pendingOutcome:
      typeof pending === 'string' && OUTCOMES.has(pending)
        ? (pending as PirateFightOutcome)
        : null,
    resultTitle: typeof o.resultTitle === 'string' ? o.resultTitle : '',
    resultBody: typeof o.resultBody === 'string' ? o.resultBody : '',
    nextEligibleAt: num(o.nextEligibleAt),
    needsAck,
    autoResolved: !!o.autoResolved,
    plagueUntil: num(o.plagueUntil),
    plagueSickMult:
      typeof o.plagueSickMult === 'number' && o.plagueSickMult > 0
        ? o.plagueSickMult
        : 1,
    strayBreedId: typeof o.strayBreedId === 'string' ? o.strayBreedId : '',
    strayCostFish: Math.max(0, Math.floor(num(o.strayCostFish))),
    strayCostCoins: Math.max(0, Math.floor(num(o.strayCostCoins))),
  }
}
```

`PersistSlice` / `toPersist` / `fromPersist`：读写 `majorEvent`；`fromPersist` 调用 `sanitizeMajorEvent(d.majorEvent, d.pirateRaid)`。

- [ ] **Step 2: GameState 用 `majorEvent` 替换 `pirateRaid`**

全局替换引用：`resolvePirateWallClock` → `resolveMajorWallClock`：

- `kind==='pirate' && threat` 超时 → 献贡（现 `buildTributePatch`，写回 `majorEvent`）
- `kind==='plague' && threat` 超时 → `applyPlagueEndure(..., auto:true)`
- `kind==='stray' && threat` 超时 → `applyStrayReject(..., auto:true)`
- pirate fighting 揭晓逻辑保留

**强制：** 凡海盗献贡 / 战斗揭晓 / ack 结算，禁止 `emptyMajorEvent(...)` 直接覆盖整个状态。必须：

```ts
const settled = clearDecisionWindow(s.majorEvent, nowAbs + MAJOR_COOLDOWN_MINUTES)
// 再设 phase:'result', needsAck, resultTitle/Body…
majorEvent: { ...settled, phase: 'result', needsAck: true, resultTitle, resultBody, autoResolved }
```

这样 `plagueUntil` / `plagueSickMult` 在海盗结算后仍保留（spec 验收 #2）。收留/婉拒/隔离/硬扛同理（Task 2 的 `clearDecisionWindow` 已覆盖）。

**日结 `rollMajorEvent` 门禁（必须全部满足才抽签）：**

1. `!gameOver`
2. `!decisionWindowBusy(majorEvent)`
3. `nowAbs >= majorEvent.nextEligibleAt`
4. `gameEvent.kind === 'none'`

门禁通过后：分别算海盗财富门槛（可继续调用 `canRollPirateRaid` 的富裕/天数部分，或其拆出的 `pirateWealthEligible`——**不要**在 `canRollPirateRaid` 里再查 idle/冷却/`gameEvent`，以免双重门禁；若暂不拆函数，则传入「已满足门禁」的假 pirate idle 态）、`canRollPlague`、`canRollStray` → 组装 `p` → `pickMajorEventKind`。抽中后 `startMajorThreat`。

- [ ] **Step 3: `npm run build`**  
Expected: tsc 通过。手动：旧逻辑海盗仍可 Dev 强制（若 Dev 尚未改，可暂留 `forcePirateRaid` 写 `majorEvent`）。

- [ ] **Step 4: Commit** — 跳过

---

### Task 4: 疫病潮接入（日结倍率 + action + 面板分支）

**Files:**
- Modify: `src/game/state/gameStore.ts`（日结生病处乘 `plagueSickMult`；到期清理；`majorPlagueIsolate` / `majorPlagueEndure`）
- Create: `src/ui/MajorEventPanel.tsx`（先支持 pirate + plague）
- Modify: `src/App.tsx`

- [ ] **Step 1: 日结生病**

在现有 `sickChanceForRole` 掷骰处：

```ts
let chance = sickChanceForRole(c.role)
const ev = majorEvent // 当前态
if (ev.plagueUntil > nowAbs && ev.plagueSickMult !== 1) {
  chance *= ev.plagueSickMult
}
```

跨日且 `nowAbs >= plagueUntil` 时清 `plagueUntil=0`、`plagueSickMult=1`。

- [ ] **Step 2: action**

```ts
majorPlagueIsolate: () => boolean  // 检查药量、apply、再跑治愈
majorPlagueEndure: () => boolean
majorAck: () => void  // 通用：result → clearDecisionWindow 保留 plague 字段但 phase idle kind none（若 result 已写过 nextEligibleAt，ack 只清 needsAck/phase）
```

注意与海盗 ack 行为对齐：海盗 `emptyPirateRaid` 在揭晓时已带冷却；ack 只把 phase 置 idle。疫病在 settle 时已 `clearDecisionWindow` 进 result——ack 时应：

```ts
majorEvent: {
  ...s.majorEvent,
  phase: 'idle',
  kind: 'none',
  needsAck: false,
  // 保留 plagueUntil / plagueSickMult / nextEligibleAt
}
```

- [ ] **Step 3: MajorEventPanel**

从 `PirateRaidPanel` 复制结构；`useGameStore(s => s.majorEvent)`；`kind==='plague'` 时双按钮隔离/硬扛；药不够禁用隔离。

- [ ] **Step 4: App 改挂载；删除或 re-export 旧面板**

- [ ] **Step 5: `npm run build`**

- [ ] **Step 6: Commit** — 跳过

---

### Task 5: 流浪猫投奔接入

**Files:**
- Modify: `src/game/state/gameStore.ts`（`majorStrayAccept` / `majorStrayReject`；日结抽中 stray 时 `rollStrayOffer`）
- Modify: `src/ui/MajorEventPanel.tsx`
- Modify: `src/game/data/breeds.ts`（若需 `createCatInstance(breedId, role)` 抽取，避免复制粘贴）

- [ ] **Step 1: 收留 action**

```ts
majorStrayAccept: () => {
  const s = get()
  if (s.majorEvent.kind !== 'stray' || s.majorEvent.phase !== 'threat') return false
  const cap = catCapForCottage(s.cottage.level)
  if (s.cats.length >= cap) return false
  if (!canAffordStray(s.coins, s.inventory, s.majorEvent)) return false
  // 扣鱼金；push civilian cat；result + cooldown
}
```

生成猫：`role: 'civilian'`，`roleLevel: 1`，复用现有招募字段默认值（`boostUntil: 0` 等）。

- [ ] **Step 2: 面板展示品种名（`getBreed`）与代价；婉拒/收留**

- [ ] **Step 3: `npm run build` + Dev 强制投奔手测路径写在 Dev 任务**

- [ ] **Step 4: Commit** — 跳过

---

### Task 6: DevToolbar + HUD + 说明书

**Files:**
- Modify: `src/ui/DevToolbar.tsx`
- Modify: `src/game/state/gameStore.ts`（`DevPatch`）
- Modify: `src/ui/Hud.tsx`（疫病残留一行）
- Modify: `src/game/data/manual.ts`

- [ ] **Step 1: DevPatch**

```ts
forcePirateRaid?: boolean
forcePlagueTide?: boolean
forceStrayCats?: boolean
clearMajorCooldown?: boolean
clearPlague?: boolean
```

强制时：把当前决策窗清掉（保留 plague debuff 与否：强制新 threat 时建议保留 `plagueUntil`），`startMajorThreat` + 对应 extras（stray 要 `rollStrayOffer`）。

- [ ] **Step 2: Hud**

若 `plagueUntil > nowAbs`：显示 `疫病潮 · 约剩 N 日`（`Math.ceil((plagueUntil-nowAbs)/MINUTES_PER_DAY)`）。

- [ ] **Step 3: manual「时间与季节」**

用常量拼接：`PLAGUE_MIN_DAY`、`STRAY_MIN_DAY`、`MAJOR_DECIDE_MS`、`MAJOR_COOLDOWN_MINUTES`、隔离/硬扛天数、超时默认。替换仅海盗一段为三类大事说明。

- [ ] **Step 4: `npm run build` && `npm run test:flows`**

- [ ] **Step 5: Commit** — 跳过

---

## 验收对照（spec）

| # | 检查 |
|---|------|
| 1 | 旧 `pirateRaid` 存档可读 |
| 2 | 决策窗不叠；plague 残留不挡新大事（冷却外） |
| 3 | `pickMajorEventKind` 双 rng 公式 |
| 4 | 超时：硬扛 / 婉拒 / 献贡 |
| 5 | 倍率只乘生病 chance |
| 6 | 空位 &lt; 2 不触发投奔 |
| 7 | 说明书常量一致；Dev 仅 DEV |
| 8 | 长结果 `miaopu-scroll` |

---

## 执行注意

- 日结抽签放在口粮/生病结算**之后**（与现海盗位置相同即可）。  
- 门禁四件套：`!gameOver`、决策窗空闲、冷却到期、`gameEvent.kind === 'none'`（见 Task 3）。  
- 面板按 `kind` 换威胁文案与 `autoResolved` 横幅，勿写死「海盗」。  
- 勿在说明书写 Dev。  
- 跳过 git commit，除非用户明确要求。
