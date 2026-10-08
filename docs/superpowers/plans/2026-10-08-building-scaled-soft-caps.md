# 建筑缩放软帽 + 满级 8 + 逐级外观 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **本仓库约定：** 未经用户明确要求不要 `git commit`；跳过所有 Commit 步骤。

**Goal:** 软帽随建筑等级查表升高；四建筑满级 8；外观每级可辨加强；HUD/AI/说明书与动态帽一致。

**Architecture:** 在 `economy.ts` 增加 `SoftCapBuildings` + 查表/`coinSoftCap`；`applyInventoryGain` / `applyCoinGain` 必传建筑快照（或显式 coinCap）；types 拉高 MAX=8 并补 Lv6–8 价表与容量；场景模型夹到 8 并加细节。

**Tech Stack:** TypeScript、Zustand、现有 `edge-flows`。验证：`npx --yes tsx scripts/edge-flows.ts` + `npm run build`。

**Spec:** `docs/superpowers/specs/2026-10-08-building-scaled-soft-caps-design.md`

---

## 文件结构

| 文件 | 职责 |
|------|------|
| Modify `src/game/data/economy.ts` | 动态软帽表 + API；改 gain 签名 |
| Modify `scripts/edge-flows.ts` | 动态帽断言 |
| Modify `src/game/types.ts` | MAX=8；升级价；粮仓/船容量 Lv6–8 |
| Modify `src/game/state/saveGame.ts` | 建筑等级 sanitize ≤8 |
| Modify `src/game/state/gameStore.ts` | 所有 gain/buy/coin 传 buildings |
| Modify `src/game/data/voyage.ts` | settle 夹帽带建筑 |
| Modify `src/game/data/pirates.ts` | 战利品夹帽带建筑 |
| Modify `src/game/systems/catFarmAI.ts` | 休闲阈值用动态帽 |
| Modify `src/scenes/zones/CatActor.tsx` | pickCatTask 传建筑等级 |
| Modify `src/scenes/models/Cottage.tsx` / `Harbor.tsx` | 外观 1…8 |
| Modify `src/scenes/zones/GranaryZone.tsx` | 外观 1…8 |
| Modify `src/ui/Hud.tsx` / `ShopToolbar.tsx` / `DevToolbar.tsx` | 动态帽显示 |
| Modify `src/game/data/manual.ts` | 绑定与满级文案 |
| Modify `src/game/data/shop.ts` | 若有硬编码 MAX=5 提示则跟 MAX |

**约定：** Lv1 基线常量保留（`FISH_SOFT_CAP` 等 = 表 Lv1）；`COIN_SOFT_CAP`/`TOY_SOFT_CAP` 等同理作基线。查表前 `clamp` 等级。

---

### Task 1: economy 动态软帽 + edge-flows

**Files:**
- Modify: `src/game/data/economy.ts`
- Modify: `scripts/edge-flows.ts`

- [ ] **Step 1: 改 economy API**

在 `economy.ts` 增加（数值以 spec 表为准）：

```ts
export type SoftCapBuildings = {
  cottage: number
  harbor: number
  boat: number
  granary: number // 0 = 未建 → 矿木用 Lv1
}

const TOY_BY_LV = [0, 20, 24, 28, 32, 36, 40, 44, 48] as const
// knowledge, coin, fish, medicine, oreWood 同理按 spec 表

function clampLv(n: number, max = 8): number {
  return Math.max(1, Math.min(max, Math.floor(n || 1)))
}

export function coinSoftCap(b: SoftCapBuildings): number {
  const c = COIN_BY_LV[clampLv(b.cottage)]!
  const h = COIN_BY_LV[clampLv(b.harbor)]!
  return Math.max(c, h)
}

export function softCapFor(key: string, b: SoftCapBuildings): number | null {
  // fish→harbor, ore/wood→granary<=0? Lv1 : granary, knowledge/toy/snack→cottage,
  // medicine→boat, wheat→null
}

export function applyCoinGain(coins: number, delta: number, coinCap: number) { ... }

export function applyInventoryGain(
  inventory: Record<string, number>,
  coins: number,
  gains: Record<string, number>,
  buildings: SoftCapBuildings,
): InventoryGainResult {
  // softCapFor(key, buildings); overflow 金币用 coinSoftCap(buildings)
}

export function applyWheatHarvestGain(
  inventory, coins, yieldAmt, granaryCap, buildings: SoftCapBuildings,
) {
  // mid/overflow coin 均带 buildings / coinSoftCap
}
```

保留 `export const COIN_SOFT_CAP = 3000` 等作 **Lv1 基线**别名；HUD 勿再当唯一上限。  
`*_BY_LV[1]` 必须等于现有基线常量（`FISH_SOFT_CAP` / `TOY_SOFT_CAP` / `COIN_SOFT_CAP` 等），避免表与常量漂移。

- [ ] **Step 2: edge-flows 断言**

```ts
const b1 = { cottage: 1, harbor: 1, boat: 1, granary: 0 }
assert(coinSoftCap(b1) === 3000, '开局金库')
assert(softCapFor('ore', b1) === 40, '未建仓矿=40')
const b3 = { cottage: 3, harbor: 1, boat: 1, granary: 0 }
assert(coinSoftCap(b3) === 4200, '小屋3金库')
const bh3 = { cottage: 1, harbor: 3, boat: 1, granary: 0 }
assert(coinSoftCap(bh3) === 4200, '码头3金库')
assert(softCapFor('fish', bh3) === 56, '码头3鱼帽')
const g8 = { cottage: 1, harbor: 1, boat: 1, granary: 8 }
assert(softCapFor('ore', g8) === 96 && softCapFor('wood', g8) === 96, '仓8矿木')
const gain = applyInventoryGain({ fish: 56 }, 0, { fish: 2 }, bh3)
assert(gain.inventory.fish === 56 && gain.coinFromOverflow === 8, '动态帽溢出兑金')
```

更新既有 economy 断言：凡 `applyInventoryGain`/`applyCoinGain`/`applyWheatHarvestGain` 补 `buildings` 或 `coinCap` 参数。

Run: `npx --yes tsx scripts/edge-flows.ts`  
Expected: 新断言通过。

- [ ] **Step 3: Commit** — 跳过

---

### Task 2: types MAX=8 + 价表/容量

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/state/saveGame.ts`
- Modify: `src/game/data/shop.ts`（仅当文案/逻辑写死 5）

- [ ] **Step 1: MAX 与表**

```ts
export const GRANARY_MAX_LEVEL = 8
export const HARBOR_MAX_LEVEL = 8
export const BOAT_MAX_LEVEL = 8
export const COTTAGE_MAX_LEVEL = 8

// GRANARY_CAPACITY 补 6:340, 7:460, 8:600
// BOAT_FISH_CAP 补 6:18, 7:22, 8:28
// BOAT_WOOD_CAP 补 6:5, 7:6, 8:8
// 各 UPGRADE_PRICE/ORE/WOOD/KNOWLEDGE 按 spec 补 6/7/8
```

`catCapForCottage` 已用 `3+lv` + `COTTAGE_MAX_LEVEL`，改 MAX 即可（Lv8→11）。

- [ ] **Step 2: saveGame sanitize**

读档时：  
`cottage/harbor/boat.level` → `clamp(1, MAX)`  
`granary.level` → `clamp(0, GRANARY_MAX_LEVEL)`  
**不要**因软帽变化而夹低库存/金币。

确认 `voyageDurationMinutes` / `voyageCooldownMinutes` 在 Lv8 仍被现有 `Math.max` 下限夹住（通常无需改公式）。

- [ ] **Step 3: `npm run build`**（可能暂因 economy 签名未全接线而失败——若失败先完成 Task 3）

- [ ] **Step 4: Commit** — 跳过

---

### Task 3: 全链路传 SoftCapBuildings

**Files:**
- Modify: `src/game/state/gameStore.ts`
- Modify: `src/game/data/voyage.ts`
- Modify: `src/game/data/pirates.ts`

辅助（store 内）：

```ts
function softCapBuildings(s: {
  cottage: LevelState
  harbor: LevelState
  boat: LevelState
  granary: GranaryState
}): SoftCapBuildings {
  return {
    cottage: s.cottage.level,
    harbor: s.harbor.level,
    boat: s.boat.level,
    granary: s.granary.level,
  }
}
```

- [ ] **Step 1: store 所有 `applyInventoryGain` / `applyCoinGain` / `applyWheatHarvestGain`**

含：`applyGoalIfMet`、`completeGoal`、`forceChopOne`、voyage settle（dev+tick）、`shopSell`、`catSellWheat`、`catMine/Chop/Fish/Study/Craft`、`catHarvest`、买玩具零食拒绝用 `softCapFor('toy'|'snack', b)`。

`applyCoinGain(..., coinSoftCap(b))`。

- [ ] **Step 2: voyage**

`VoyageContext` 增加建筑等级（或整份 SoftCapBuildings）；`settleVoyageReturn` 内 gain/文案用动态帽。  
注意：voyage 若只返回 `coinsDelta`，store 侧 `applyCoinGain` 仍须传当前 `coinSoftCap`。

- [ ] **Step 3: pirates `applyFightOutcome`**

签名增加 `buildings: SoftCapBuildings`；win 路径 gain 带入。`buildFightRevealPatch` 从 state 传入。

- [ ] **Step 4: `npm run build`**

- [ ] **Step 5: Commit** — 跳过

---

### Task 4: AI + CatActor

**Files:**
- Modify: `src/game/systems/catFarmAI.ts`
- Modify: `src/scenes/zones/CatActor.tsx`

- [ ] **Step 1: pickCatTask 增加 SoftCapBuildings（或已解析 caps）**

`specialistIdle` / fisher / scholar / doctor 的 leisure 阈值用：

```ts
const fishCap = softCapFor('fish', buildings)! 
// 同理 knowledge / medicine / ore
```

去掉对固定 `FISH_SOFT_CAP` 等作为「满仓」判断的依赖（import 可删或仅作注释）。

- [ ] **Step 2: CatActor 传入**

```ts
buildings: {
  cottage: store.cottage.level,
  harbor: store.harbor.level,
  boat: store.boat.level,
  granary: store.granary.level,
}
```

- [ ] **Step 3: build**

- [ ] **Step 4: Commit** — 跳过

---

### Task 5: 外观 1…8

**Files:**
- Modify: `src/scenes/models/Cottage.tsx`
- Modify: `src/scenes/models/Harbor.tsx`（含货船）
- Modify: `src/scenes/zones/GranaryZone.tsx`

- [ ] **Step 1: 夹紧改为 MAX_LEVEL**

`Math.min(5, level)` → `Math.min(COTTAGE_MAX_LEVEL|HARBOR_MAX_LEVEL|GRANARY_MAX_LEVEL|BOAT_MAX_LEVEL, level)`。  
注意：`Harbor.tsx` 内 **Harbor 与 Boat 两处**都有 `Math.min(5, …)`，勿只改码头漏改货船。

- [ ] **Step 2: 每级可见增量**

在现有 tier 逻辑上扩展：Lv6/7/8 相对 Lv5 **不得外观相同**；1→2→…→5 若已有分级则保留并核对每级至少 1 处差异。建议每级加一类小构件（旗/灯/箱/栏杆段/窗/烟囱帽等），体量可微增。

- [ ] **Step 3: Commit** — 跳过

---

### Task 6: HUD / 商店 / Dev / 说明书

**Files:**
- Modify: `src/ui/Hud.tsx`
- Modify: `src/ui/ShopToolbar.tsx`
- Modify: `src/ui/DevToolbar.tsx`
- Modify: `src/game/data/manual.ts`

- [ ] **Step 1: UI 读动态帽**

```ts
const b = { cottage: cottage.level, harbor: harbor.level, boat: boat.level, granary: granary.level }
const coinCap = coinSoftCap(b)
const fishCap = softCapFor('fish', b)!
// ...
```

Pill / 顶栏用动态值；warn 用 `>= 动态帽`。

- [ ] **Step 2: Dev**

建筑 NumField max=8；「满资源」夹到当前动态帽；底部展示当前动态帽（非仅基线常量）。

- [ ] **Step 3: manual**

资源章：软帽绑定建筑 + `softCapFor`/`coinSoftCap` 拼接 Lv1 与 Lv8（或「随建筑升高」+ 举例满级）。建筑章：最高 Lv.8。删「软上限固定」类表述。

- [ ] **Step 4: `npx --yes tsx scripts/edge-flows.ts` && `npm run build`**

- [ ] **Step 5: Commit** — 跳过

---

## 验收对照

| # | 检查 |
|---|------|
| 1 | 开局软帽=基线 |
| 2 | 码头↑鱼帽；小屋↑玩/零/知；金库取 max(屋,港) |
| 3 | 粮仓 0 与 Lv1 矿木=40；仓 8→96 |
| 4 | 四建筑可升到 8 |
| 5 | 外观每级有差异 |
| 6 | AI 按动态帽摸鱼 |
| 7 | edge-flows + build |

## 执行注意

- 改 `apply*` 签名后 **一次扫清所有调用方**，勿留旧两参/三参调用。  
- voyage 回港金币可能在 store 侧二次 `applyCoinGain`——两侧 coinCap 必须一致。  
- 外观 Task 可与 Task 3 并行，但勿在签名未稳时改 AI。  
- 跳过 git commit，除非用户要求。
