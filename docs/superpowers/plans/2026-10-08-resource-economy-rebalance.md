# 资源体系再平衡（方案 B）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **本仓库约定：** 未经用户明确要求不要 `git commit`；跳过所有 Commit 步骤。

**Goal:** 统一软帽与溢出兑金、金币上限 3000、矿工日限、舒适合计消耗、卖鱼预留、知/药回收，并同步 HUD/说明书。

**Architecture:** 新建 `economy.ts` 作为唯一进账夹帽/兑金入口；`gameStore` 所有库存增益与金币进账经此函数；AI 不再因到顶硬停工；小麦收割用 `granaryCapacity` 裁切后再兑金。

**Tech Stack:** TypeScript、Zustand、现有 `edge-flows` 冒烟。验证：`npx --yes tsx scripts/edge-flows.ts` + `npm run build`。

**Spec:** `docs/superpowers/specs/2026-10-08-resource-economy-rebalance-design.md`

---

## 文件结构

| 文件 | 职责 |
|------|------|
| Create `src/game/data/economy.ts` | 软帽、兑金率、`applyCoinGain` / `applyInventoryGain` |
| Modify `src/game/types.ts` | `MINE_DAILY_LIMIT`、`minesToday` on `CatInstance`；现有 `*_SOFT_CAP` 可保留并由 economy re-export 或 economy 从 types 引用 |
| Modify `scripts/edge-flows.ts` | 纯函数断言 |
| Modify `src/game/state/gameStore.ts` | 接线增益；舒适；矿工日限；商船卖鱼；商店买玩具零食夹帽；金币进账夹帽 |
| Modify `src/game/data/voyage.ts` | `settleVoyageReturn` 药品/金币走夹帽兑金（勿再 `min(loot, cap-have)` 静默丢） |
| Modify `src/game/state/saveGame.ts` | sanitize `minesToday` |
| Modify `src/game/systems/catFarmAI.ts` | 矿工日限；鱼/知/药/矿到顶改为低优先级而非禁工 |
| Modify `src/game/data/sell.ts` | knowledge / medicine |
| Modify `src/game/data/pirates.ts` | stockScore + toy/snack；战利品可改为返回 delta |
| Modify `src/ui/Hud.tsx` / `ShopToolbar.tsx` | 金/玩具/零食上限显示 |
| Modify `src/game/data/manual.ts` | 文案 |
| Modify `src/ui/DevToolbar.tsx` | 一键触顶可选 |

**约定：** Dev 精确数字框可写入超帽（读档同理不夹）；「一键满资源」类按钮夹到 softCap / COIN_SOFT_CAP。

---

### Task 1: `economy.ts` + edge-flows

**Files:**
- Create: `src/game/data/economy.ts`
- Modify: `scripts/edge-flows.ts`

- [ ] **Step 1: 实现 economy 模块**

```ts
import {
  FISH_SOFT_CAP,
  KNOWLEDGE_SOFT_CAP,
  MEDICINE_SOFT_CAP,
  ORE_SOFT_CAP,
  WOOD_SOFT_CAP,
} from '../types'

export const COIN_SOFT_CAP = 3000
export const TOY_SOFT_CAP = 20
export const SNACK_SOFT_CAP = 20

export const OVERFLOW_COIN_RATE: Record<string, number> = {
  fish: 4,
  wheat: 4,
  ore: 8,
  wood: 8,
  knowledge: 12,
  medicine: 16,
  toy: 8,
  snack: 8,
}

export function softCapFor(key: string): number | null {
  switch (key) {
    case 'fish': return FISH_SOFT_CAP
    case 'ore': return ORE_SOFT_CAP
    case 'wood': return WOOD_SOFT_CAP
    case 'knowledge': return KNOWLEDGE_SOFT_CAP
    case 'medicine': return MEDICINE_SOFT_CAP
    case 'toy': return TOY_SOFT_CAP
    case 'snack': return SNACK_SOFT_CAP
    case 'wheat': return null // 硬容量由调用方裁切；收割用 applyWheatHarvestGain
    default: return null
  }
}

// 便于测试与 UI：re-export
export { FISH_SOFT_CAP, ORE_SOFT_CAP, WOOD_SOFT_CAP, KNOWLEDGE_SOFT_CAP, MEDICINE_SOFT_CAP }

export function applyCoinGain(coins: number, delta: number): {
  coins: number
  added: number
  discarded: number
} {
  if (delta <= 0) return { coins, added: 0, discarded: 0 }
  const room = Math.max(0, COIN_SOFT_CAP - coins)
  const added = Math.min(delta, room)
  return { coins: coins + added, added, discarded: delta - added }
}

export function applyInventoryGain(
  inventory: Record<string, number>,
  coins: number,
  gains: Record<string, number>,
): {
  inventory: Record<string, number>
  coins: number
  added: Record<string, number>
  overflow: Record<string, number>
  coinFromOverflow: number
  coinDiscarded: number
} {
  const inv = { ...inventory }
  const added: Record<string, number> = {}
  const overflow: Record<string, number> = {}
  let overflowCoins = 0
  for (const [key, wantRaw] of Object.entries(gains)) {
    const want = Math.max(0, Math.floor(wantRaw))
    if (want <= 0) continue
    const have = inv[key] ?? 0
    const cap = softCapFor(key)
    const room = cap == null ? want : Math.max(0, cap - have)
    const add = Math.min(want, room)
    const over = want - add
    if (add > 0) {
      inv[key] = have + add
      added[key] = add
    }
    if (over > 0) {
      overflow[key] = over
      overflowCoins += over * (OVERFLOW_COIN_RATE[key] ?? 0)
    }
  }
  // wheat 无 softCap：若 caller 传入超额，room=want 全加入；故收割必须先按粮仓裁切 want，
  // 超额部分单独用 gains 或先算 over 再 apply：推荐收割侧：
  //   space = cap - wheat; add=min(yield,space); over=yield-add;
  //   applyInventoryGain(..., { wheat: add }) + applyCoinGain(..., over * 4)
  const coin = applyCoinGain(coins, overflowCoins)
  return {
    inventory: inv,
    coins: coin.coins,
    added,
    overflow,
    coinFromOverflow: coin.added,
    coinDiscarded: coin.discarded,
  }
}

/** 小麦：硬容量裁切 + 超额兑金（唯一收割入口辅助） */
export function applyWheatHarvestGain(
  inventory: Record<string, number>,
  coins: number,
  yieldAmt: number,
  granaryCap: number,
): ReturnType<typeof applyInventoryGain> {
  const have = inventory.wheat ?? 0
  const space = Math.max(0, granaryCap - have)
  const add = Math.min(Math.max(0, yieldAmt), space)
  const over = Math.max(0, yieldAmt) - add
  const mid = applyInventoryGain(inventory, coins, { wheat: add })
  const coin = applyCoinGain(mid.coins, over * (OVERFLOW_COIN_RATE.wheat ?? 4))
  return {
    ...mid,
    coins: coin.coins,
    overflow: over > 0 ? { ...mid.overflow, wheat: (mid.overflow.wheat ?? 0) + over } : mid.overflow,
    coinFromOverflow: mid.coinFromOverflow + coin.added,
    coinDiscarded: mid.coinDiscarded + coin.discarded,
  }
}
```

注意：`softCapFor('wheat')===null` 时 `applyInventoryGain` 会把全部 wheat 加入——**收割必须用 `applyWheatHarvestGain`**，其它路径勿对 wheat 传超额。

- [ ] **Step 2: edge-flows 断言**

```ts
import {
  applyCoinGain,
  applyInventoryGain,
  applyWheatHarvestGain,
  COIN_SOFT_CAP,
  FISH_SOFT_CAP,
} from '../src/game/data/economy'

console.log('\n=== 经济夹帽与溢出 ===')
{
  const a = applyInventoryGain({ fish: FISH_SOFT_CAP }, 100, { fish: 3 })
  assert(a.inventory.fish === FISH_SOFT_CAP, '鱼不加超帽')
  assert(a.coinFromOverflow === 12, '3鱼溢出兑金 12')
  const b = applyCoinGain(COIN_SOFT_CAP, 50)
  assert(b.coins === COIN_SOFT_CAP && b.discarded === 50, '金库满丢弃')
  const w = applyWheatHarvestGain({ wheat: 8 }, 0, 5, 8)
  assert(w.inventory.wheat === 8 && w.coinFromOverflow === 20, '满仓麦兑金')
}
```

Run: `npx --yes tsx scripts/edge-flows.ts`  
Expected: 新断言通过。

- [ ] **Step 3: Commit** — 跳过

---

### Task 2: gameStore 增益路径接线

**Files:**
- Modify: `src/game/state/gameStore.ts`
- Modify: `src/game/data/voyage.ts`
- Modify: `src/game/data/pirates.ts`（若改 loot 为 delta）

对下列路径改为 `applyInventoryGain` / `applyCoinGain` / `applyWheatHarvestGain`，**去掉** `if (x >= SOFT_CAP) return false` 的停工逻辑（日限不足仍可失败）：

| 函数/位置 | 改法 |
|-----------|------|
| `catMine` | 产量 → `applyInventoryGain({ ore })`；有溢出则 status 提示 |
| `catChop` | 同上 wood |
| `catFish` | 同上 fish |
| `catStudy` | knowledge |
| `catCraftMedicine` | medicine（耗知识逻辑不变） |
| `catHarvest` | **删除** `space <= 0` 早退；产量整笔交给 `applyWheatHarvestGain`（满仓则全兑金） |
| `applyGoalIfMet` / 目标发奖 | 奖励资源走 gain；金币走 `applyCoinGain` |
| 海盗 win loot | 优先改 `applyFightOutcome` 返回 loot delta，store 用 gain 合并；避免先写入再夹 |
| `voyage.settleVoyageReturn` | 药品/金币经 `applyInventoryGain` / `applyCoinGain`；去掉静默 `min(loot, cap-have)` |
| `catSellWheat` 商船 | 卖鱼可卖 = `min(MERCHANT_FISH_BUY_CAP, max(0, fish - dailyFishNeed))`；卖麦/鱼金币 `applyCoinGain`；水手带回药品走 `applyInventoryGain`（删除 `medNow < MEDICINE_SOFT_CAP` 静默裁切） |
| Dev `completeGoal` | 与 `applyGoalIfMet` 同一套 gain，勿两套发奖 |
| 商店 `buy_toy` / `buy_snack` | 若已满 softCap → 拒绝；否则只买 1 且不兑金 |
| 一切 `coins + n` | 改为 `applyCoinGain`（卖货、回收、出航） |

辅助：

```ts
function statusOverflow(r: { overflow: Record<string, number>; coinFromOverflow: number }): string {
  const parts = Object.entries(r.overflow).filter(([, n]) => n > 0)
  if (parts.length === 0) return ''
  return parts.map(([k, n]) => `${k}×${n}`).join('、') +
    (r.coinFromOverflow > 0 ? ` → 兑金 +${r.coinFromOverflow}` : '（金库已满）')
}
```

- [ ] **Step 1: 改产线函数（含去掉满仓收割早退）**  
- [ ] **Step 2: 改发奖 / voyage 回港 / 商船卖鱼（保留 BUY_CAP）/ 金币**  
- [ ] **Step 3: `npm run build`**  
- [ ] **Step 4: Commit** — 跳过

---

### Task 3: 矿工日限 + AI

**Files:**
- Modify: `src/game/types.ts`（`minesToday`、`MINE_DAILY_LIMIT=5`、`canMineAtMinute` 仿 `canChopAtMinute`）
- Modify: `src/game/state/saveGame.ts`（sanitize + starter 默认 0）
- Modify: `src/game/state/gameStore.ts`（日结清零；`catMine` 检查日限）
- Modify: `src/game/systems/catFarmAI.ts`（日限；`softCap` 分支改为提高休闲概率但 **仍允许** `stock >= softCap` 时小概率继续干）
- Modify: `src/game/data/breeds.ts` `createStarterCat`
- Modify: `src/game/state/gameStore.ts` 招募 / `majorStrayAccept` 等新建猫

- [ ] **Step 1: types + save + 所有创建猫补 `minesToday: 0`**  
- [ ] **Step 2: catMine 日限 + 日结清零**  
- [ ] **Step 3: AI — 去掉所有「库存 < softCap 才允许工作」硬条件（鱼/知/药/矿 `specialistIdle`）；改为到顶提高休闲权重，仍保留小概率继续干活**  
- [ ] **Step 4: build**  
- [ ] **Step 5: Commit** — 跳过

---

### Task 4: 舒适日结

**Files:**
- Modify: `src/game/state/gameStore.ts` 日结舒适段

替换现逻辑为：

```ts
const comfortNeed = dailyComfortNeed(living)
let left = comfortNeed
const snackHave = inv.snack ?? 0
const snackUsed = Math.min(left, snackHave)
if (snackUsed > 0) {
  inv.snack = snackHave - snackUsed
  left -= snackUsed
}
const toyHave = inv.toy ?? 0
const toyUsed = Math.min(left, toyHave)
if (toyUsed > 0) inv.toy = toyHave - toyUsed
```

- [ ] **Step 1: 改日结**  
- [ ] **Step 2: edge-flows 必做：驱动一次日结或抽纯函数测「snack+toy 合计只扣 need」**（若难驱动日结，可把扣减抽成 `applyComfortConsume(inv, need)` 放 careers/economy 再测）  
- [ ] **Step 3: Commit** — 跳过

---

### Task 5: sell 知/药 + pirates score

**Files:**
- Modify: `src/game/data/sell.ts`
- Modify: `src/game/data/pirates.ts`
- Modify: `src/ui/ShopToolbar.tsx`（若 SellPanel 遍历 `SELL_RESOURCES`，扩展类型即可）

```ts
export type SellResourceId = 'wheat' | 'ore' | 'wood' | 'fish' | 'knowledge' | 'medicine'
export const SELL_RESOURCES: SellResourceId[] = [..., 'knowledge', 'medicine']
SELL_BASE_PRICE.knowledge = 10
SELL_BASE_PRICE.medicine = 20
SELL_LABEL / SELL_HINT 补中文
```

`stockScore`：

```ts
(inventory.toy ?? 0) * 2 + (inventory.snack ?? 0) * 2
```

回收卖金走 `applyCoinGain`（在 `shopSell` 内）。

- [ ] **Step 1–3: 实现 + build**  
- [ ] **Step 4: Commit** — 跳过

---

### Task 6: HUD / 说明书 / Dev

**Files:**
- Modify: `src/ui/Hud.tsx` — 金币 `coins/COIN_SOFT_CAP`；玩具/零食 `/20`；到顶 warn  
- Modify: `src/ui/ShopToolbar.tsx` — 顶栏金/玩具/零食带帽  
- Modify: `src/game/data/manual.ts` — 完好度、单键小麦、软帽表、溢出兑金率、金库 3000、到顶不停工  
- Modify: `src/ui/DevToolbar.tsx` — 满资源按钮夹帽；可显示当前帽常量  

Manual 必须 `import` 自 `economy.ts` / `types` 拼接数字，禁止手写 3000/兑金率。

- [ ] **Step 1: UI**  
- [ ] **Step 2: manual**  
- [ ] **Step 3: `npx --yes tsx scripts/edge-flows.ts` && `npm run build`**  
- [ ] **Step 4: Commit** — 跳过

---

## 验收对照

| # | 检查 |
|---|------|
| 1 | 鱼满仍可钓，溢出兑金 |
| 2 | 金=3000 溢出丢弃 |
| 3 | 玩具=20 无法购买 |
| 4 | 矿工日限 5 |
| 5 | 舒适合计扣 |
| 6 | 商船卖鱼留口粮 |
| 7 | 知/药可回收 |
| 8 | build + edge-flows |

## 执行注意

- 小麦只用 `applyWheatHarvestGain`，勿让 `applyInventoryGain` 无帽直接加满超额麦。  
- 商船卖鱼必须同时保留 `MERCHANT_FISH_BUY_CAP` 与口粮预留。  
- `voyage.ts` 与 `gameStore` 产线同等重要，勿漏回港药品。  
- 跳过 git commit，除非用户要求。  
