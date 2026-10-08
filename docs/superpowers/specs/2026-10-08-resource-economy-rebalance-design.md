# 喵圃资源体系再平衡（方案 B）— 设计

日期：2026-10-08  
状态：已定稿（待实现）

## 目标

收紧资源规则，使上限、日限、日结消耗、卖出安全线、溢出处理与说明书/HUD 一致；溢出自动兑少量金币，金币设软上限。

## 非目标

- 不做口袋仓 / 粮仓双库存键  
- 不做「超帽衰减税」；软帽只限制库存堆积，干活可继续并溢出兑金  

- 不重做三层资源叙事（生存/成长/奢侈全环路）  
- 不大幅改海盗触发阈值（仅评分小补玩具零食）

## 已确认决策

| 项 | 选择 |
|----|------|
| 路线 | 方案 B（中度再平衡） |
| 溢出 | 超额部分按表兑金；金币满后丢弃 |
| 金币软帽 | **3000** |
| 玩具/零食软帽 | **20** |
| 兑金率 | 鱼/麦 4；矿/木 8；知识 12；药品 16；玩具/零食 8（每溢出 1 单位） |
| 商店购买 | 买到软帽为止，不因购买触发兑金 |
| 舒适日结 | snack+toy **合计**扣 `dailyComfortNeed`（先 snack 后 toy） |
| 矿工 | 日限 5，与伐木等对齐 |
| 卖鱼 | 商船与回收均预留明日口粮 |
| 知/药 | 商店回收可清仓（折价） |

## 软帽一览

| 资源 | 软帽 | 来源 |
|------|------|------|
| 鱼 / 矿 / 木 / 药 | 40 | 现有 |
| 知识 | 50 | 现有 |
| 玩具 / 零食 | 20 | 新建 |
| 金币 | 3000 | 新建 |
| 小麦 | 粮仓有效容量（硬） | 现有 `granaryCapacity` |
| 麦种 | 无帽 | 维持 |

## 溢出兑金

### 公式

对任意库存增益 `want`（键 `key`）：

```
room = max(0, softCap(key) - have)
add = min(want, room)
overflow = want - add
coinFromOverflow = floor(overflow * OVERFLOW_RATE[key])
```

再对 `coinFromOverflow`（及一切金币进账）应用：

```
coinRoom = max(0, COIN_SOFT_CAP - coins)
coinsAdded = min(delta, coinRoom)
discarded = delta - coinsAdded  // 丢弃，不再转化
```

### 兑金率 `OVERFLOW_RATE`

| key | rate |
|-----|------|
| fish, wheat | 4 |
| ore, wood | 8 |
| knowledge | 12 |
| medicine | 16 |
| toy, snack | 8 |

### 适用范围与「软停」含义

**取消「到顶则拒绝干活」**：鱼/矿/木/知/药等到软帽后，猫**仍可继续对应工作**；本次产量照常结算，经 `applyInventoryGain` 后库存不加（或只加满剩余空位），超额部分兑金。  
即：软帽限制的是**库存堆积**，不是**停工**。AI 也不再因 `have >= softCap` 而跳过该行为（可改为「优先其它工作」，但不强制停产）。

**走溢出兑金的路径（清单）**：
- 干活：收割（若调用方未先裁小麦）、采矿、伐木、钓鱼、研读、炼药  
- 季节目标发奖  
- 海盗缴获（小胜等）  
- 出海回港 / 船商贸易带回药品等  
- Dev `devSet` 增减资源（可选：Dev 精确写入可绕过，但一键满资源应夹到帽）

**不走兑金**：
- 商店购买（最多买到 softCap；已满拒绝并提示）  
- 玩家主动回收出售（正常扣库存加金币，受金库帽夹）

**小麦**：收割优先按 `granaryCapacity` 决定能收多少；收不下的部分不进库存、按麦兑金率兑金（与「满仓不收」同效且有金币反馈）。

**读档超帽**：若存档 `coins > 3000` 或 toy/snack > 20 等，**首次加载不强制夹**（保留玩家已有）；之后新进账仍受帽约束。

## 其它规则变更

### 矿工日限

- `MINE_DAILY_LIMIT = 5`（与 `CHOP/FISH/STUDY/CRAFT_DAILY_LIMIT` 一致）  
- `CatInstance` 增加 `minesToday`（日结清零）；`saveGame` sanitize；`canMineAtMinute` 对齐伐木时段模式  
- `catMine` / `catFarmAI` 尊重日限；到软帽仍可挖（溢出兑金）

### 舒适日结

- `need = dailyComfortNeed(living)`  
- 从 snack 扣 `min(need, snack)`，余量从 toy 扣  
- **不再**对 snack、toy 各扣满 `need` 一次

### 卖鱼预留

- 商船卖鱼与 `sell.maxSellable('fish')` 均预留 `dailyFishNeed(cats)`

### 商店回收

- 新增可回收：`knowledge`、`medicine`  
- 在 `sell.ts` 增加基价（与其它资源同一折价公式，约 60% 回收）：  
  - `SELL_BASE_PRICE.knowledge = 10` → 回收单价约 **6** 金  
  - `SELL_BASE_PRICE.medicine = 20` → 回收单价约 **12** 金  
  （若现网回收系数不是 0.6，则跟小麦等同一系数，说明书用常量拼接实际单价）

### 海盗评分

- `stockScore` 增加：`(toy??0)*2 + (snack??0)*2`

## 架构

### 文件

| 路径 | 职责 |
|------|------|
| Create `src/game/data/economy.ts` | 软帽、兑金率、`applyInventoryGain` / `applyCoinGain` |
| Modify `src/game/types.ts` | `MINE_DAILY_LIMIT`；可 re-export 或迁出部分 cap 到 economy（避免重复） |
| Modify `src/game/state/gameStore.ts` | 全增益路径接线；舒适日结；矿工日限；商船卖鱼 |
| Modify `src/game/systems/catFarmAI.ts` | 矿工日限 / softCap |
| Modify `src/game/data/sell.ts` | 知识、药品回收 |
| Modify `src/game/data/pirates.ts` | stockScore |
| Modify `src/ui/Hud.tsx` / `ShopToolbar.tsx` | 金/玩具/零食 `当前/上限` |
| Modify `src/game/data/manual.ts` | 完好度、小麦单键、软帽表、溢出兑金、金库 |
| Modify `src/ui/DevToolbar.tsx` | 如需标明帽或一键触顶 |
| Modify `scripts/edge-flows.ts` | 溢出兑金、金币夹帽、舒适合计 |

### 建议 API（economy.ts）

```ts
export const COIN_SOFT_CAP = 3000
export const TOY_SOFT_CAP = 20
export const SNACK_SOFT_CAP = 20
export const OVERFLOW_COIN_RATE: Record<string, number> = { ... }

export function softCapFor(key: string): number | null  // null = 无软帽

export function applyCoinGain(coins: number, delta: number): {
  coins: number
  added: number
  discarded: number
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
}
```

小麦硬容量仍由调用方用 `granaryCapacity` 决定 `want` 上限；`applyInventoryGain` 对 wheat 若设置 softCap 为 null，则仅处理调用方已裁切后的增益；若调用方传入超额，可用 rate 兑金作为兜底。

## UI / 文案

- HUD：金币、玩具、零食显示 `n/cap`；到顶高亮  
- 溢出兑金时 `statusMessage` 可简短提示，例如「鱼已满，溢出兑金 +12」  
- 说明书「资源」：改正「库存损耗」→完好度；说明单键小麦与口袋 8；列出软帽与兑金率（常量拼接）；金库 3000；**到顶后不停工，溢出兑金**（替换旧「到顶停产」表述）

## 验收

1. 鱼=40 时仍可钓鱼；再获得 3 鱼 → 鱼仍 40，金币 +12（金未满时）  

2. 金=3000 时再溢出兑金 → 金不变  
3. 玩具=20 时商店无法再买玩具  
4. 矿工当日第 6 次采矿失败/停工  
5. 日结 3 猫舒适 need=N 时，snack+toy 合计只减 N  
6. 商船卖鱼后鱼 ≥ 明日口粮（有足够鱼时）  
7. 知识/药品可在回收页出售  
8. `npm run build` 与 `npx tsx scripts/edge-flows.ts` 通过  

## 实现顺序建议

1. `economy.ts` + edge-flows 纯函数测试  
2. gameStore 增益路径与金币夹帽  
3. 矿工日限 + AI  
4. 舒适日结 + 卖鱼预留  
5. sell 知/药 + pirates score  
6. HUD / 商店 / 说明书 / Dev  
