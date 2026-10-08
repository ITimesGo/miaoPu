# 建筑缩放软帽 + 建筑满级 8 + 逐级外观 — 设计

日期：2026-10-08  
状态：已定稿（待实现）  
前置：`2026-10-08-resource-economy-rebalance-design.md`（溢出兑金、金库帽、日限等仍有效）

## 目标

1. 鱼/矿/木/知/药/金/玩/零等**软帽随对应建筑等级提高**（温和查表；以数值表为准，Lv8 约 ×2～2.4）。  
2. 小屋 / 码头 / 货船 / 粮仓 **最高等级 5 → 8**，并补齐升级价与产能相关表。  
3. 四座建筑 **每一级外观略加强**（做到 Lv8，禁止高档完全复用低档）。

## 非目标

- 不新建「仓库」建筑。  
- 不改溢出兑金率、舒适日结、矿工日限、商船口粮预留。  
- 小麦硬容量仍只由 `granaryCapacity`（等级 + 完好度）决定。  
- 不为 Lv6–8 做全新高模；在现有程序化构件上逐级加细节即可。

## 已确认决策

| 项 | 选择 |
|----|------|
| 路线 | 分建筑查表（方案 A） |
| 涨幅 | 温和：Lv1=现基线，Lv8 ≈ ×2～2.2 |
| 金库 | `max(小屋等级帽, 码头等级帽)` |
| 满级 | 四建筑均为 8 |
| 外观 | 每级至少 1 处可见增量 |

## 软帽绑定

| 资源 | 决定建筑 |
|------|----------|
| 玩具、零食、知识 | 小屋 |
| 金库 | max(小屋, 码头) 对应档位的金库值 |
| 鱼 | 码头 |
| 药品 | 货船 |
| 矿石、木材 | 粮仓（level≤0 时用 Lv1 基线 40） |
| 小麦 | 不变（粮仓硬容量） |
| 麦种 | 无帽 |

## 软帽数值表

等级列：建筑对该资源生效的等级（小屋/码头/船/仓各自 1…8；粮仓未建视为矿木用基线）。

| Lv | 玩/零 | 知识 | 金库 | 鱼 | 药 | 矿/木 |
|----|-------|------|------|----|----|-------|
| 1 | 20 | 50 | 3000 | 40 | 40 | 40 |
| 2 | 24 | 58 | 3600 | 48 | 48 | 48 |
| 3 | 28 | 66 | 4200 | 56 | 56 | 56 |
| 4 | 32 | 74 | 4800 | 64 | 64 | 64 |
| 5 | 36 | 80 | 5400 | 72 | 72 | 72 |
| 6 | 40 | 88 | 6000 | 80 | 80 | 80 |
| 7 | 44 | 94 | 6600 | 88 | 88 | 88 |
| 8 | 48 | 100 | 7200 | 96 | 96 | 96 |

金库解析：`coinCap = max(COIN_BY_LV[cottage], COIN_BY_LV[harbor])`。

## 建筑满级 8 — 连带表

所有 `*_MAX_LEVEL = 8`。下列为 **Lv6–8 新增**（1–5 保持现有数值）。

### 升级价（目标等级 → 消耗）

趋势：相对 Lv5 约 +35%～45%/级（金）、材料与知识同步抬高。

| 建筑 | Lv→ | 金 | 矿 | 木 | 知 |
|------|-----|----|----|----|----|
| 小屋 | 6 | 900 | 30 | 32 | 48 |
| | 7 | 1300 | 40 | 42 | 64 |
| | 8 | 1900 | 52 | 54 | 84 |
| 码头 | 6 | 1200 | 42 | 32 | 44 |
| | 7 | 1700 | 54 | 42 | 58 |
| | 8 | 2400 | 70 | 54 | 76 |
| 货船 | 6 | 1000 | 34 | 36 | 42 |
| | 7 | 1450 | 44 | 46 | 56 |
| | 8 | 2100 | 58 | 58 | 74 |
| 粮仓 | 6 | 1100 | 32 | 24 | 38 |
| | 7 | 1600 | 42 | 32 | 50 |
| | 8 | 2300 | 54 | 42 | 66 |

### 产能相关（Lv6–8）

| 表 | 6 | 7 | 8 | 备注 |
|----|---|---|---|------|
| `catCapForCottage` | 9 | 10 | 11 | 现公式 `3+lv` 在 MAX=8 时自然成立，**改 MAX 即可** |
| `GRANARY_CAPACITY` | 340 | 460 | 600 | 小麦硬容量基线 |
| `BOAT_FISH_CAP` | 18 | 22 | 28 | |
| `BOAT_WOOD_CAP` | 5 | 6 | 8 | |
| 出航时长/冷却 | 现公式已按 level 线性，确认 Lv8 仍有下限夹紧即可 | | | |

## API / 架构

### `economy.ts`

- 保留 `FISH_SOFT_CAP` 等 **Lv1 基线**常量（及 re-export），供文档与默认值。  
- 新增查表与解析：

```ts
export type SoftCapBuildings = {
  cottage: number
  harbor: number
  boat: number
  granary: number // 0 = 未建
}

export function softCapFor(key: string, b: SoftCapBuildings): number | null
export function coinSoftCap(b: SoftCapBuildings): number
```

- `applyInventoryGain(inventory, coins, gains, buildings)`  
- `applyCoinGain(coins, delta, coinCap)` 或内部读 `coinSoftCap(buildings)`  
- `applyWheatHarvestGain` 仍用调用方传入的 `granaryCap`；小麦无软帽。

### 调用约定

凡库存/金币**进账**夹帽处，传入当前建筑等级快照（store / voyage settle / pirates loot / goal 奖励 / shop 买玩具零食判断）。  
HUD / ShopToolbar / Dev「满资源」读同一套动态帽。  
Dev **精确数字框**仍可写入超帽；一键满资源夹到**当前**动态帽。

### AI（必改）

`catFarmAI.ts` 中渔夫/学者/医生/矿工的「到顶提高休闲权重」目前对比的是固定 `*_SOFT_CAP`（Lv1 基线）。  
实现时必须改为对比 **动态软帽**（`pickCatTask` 传入建筑等级或已解析的 caps），否则升仓/升港后猫仍按 40/50 当满仓摸鱼，与 HUD 不一致。

### 读档

`saveGame.ts` sanitize：小屋/码头/货船/粮仓等级 **夹到 `1…*_MAX_LEVEL`（8）**（粮仓允许 0=未建）。  
查表与 `softCapFor` 对越界等级也必须安全（`clamp` 后再取表），避免 `undefined`/NaN。  
等级合法则软帽自动升高，**不强制下调**已超旧帽的库存。

## 外观（Cottage / Harbor+Boat / Granary）

- 货船外观在 `Harbor.tsx` 内（非独立 Boat 文件）；小屋 `Cottage.tsx`；粮仓 `GranaryZone.tsx`。  
- 将 `Math.min(5, level)` 改为 `Math.min(*_MAX_LEVEL, level)`。  
- **每一级**相对上一级至少增加 1 处玩家可辨差异（构件、装饰、体量、旗帜、灯、坡道、窗扇、桅杆附件等）。  
- Lv6–8 在 Lv5 基础上继续加，不得与 Lv5 外观完全相同。  
- 粮仓完好度发暗逻辑保持，与等级增量独立。

## UI / 说明书 / Dev

- HUD、商店顶栏：`当前/动态上限`。  
- 商店建筑升级项：最高显示到 Lv8；desc 可带「软帽」提示（可选一句）。  
- 说明书「资源」「建筑升级」：绑定表 + 满级数字从常量/函数拼接；删「软帽固定」表述。  
- Dev：建筑等级 NumField max=8；展示当前动态帽。

## 验证

- `edge-flows`：小屋 Lv1 金库 3000；小屋或码头升到 3 后金库 4200；粮仓 0 与 Lv1 矿帽均为 40；粮仓 Lv8 矿帽 96。  
- `npm run build`。  
- 目视：Dev 将四建筑从 1 拉到 8，每级外观有变化。

## 文件（预期）

| 文件 | 改动 |
|------|------|
| `src/game/data/economy.ts` | 动态软帽 API |
| `src/game/types.ts` | MAX=8、升级价、粮仓/船容量表 |
| `src/game/state/gameStore.ts` | gain/buy 传 buildings |
| `src/game/state/saveGame.ts` | 建筑等级 sanitize 到 ≤8 |
| `src/game/data/voyage.ts` / `pirates.ts` | 回港/战利品夹帽带建筑 |
| `src/game/systems/catFarmAI.ts` | 休闲阈值用动态软帽 |
| `src/scenes/models/Cottage.tsx` / `Harbor.tsx` + `GranaryZone.tsx` | 外观 1…8（船在 Harbor 内） |
| `src/ui/Hud.tsx` / `ShopToolbar.tsx` / `DevToolbar.tsx` | 动态帽 |
| `src/game/data/manual.ts` | 文案 |
| `scripts/edge-flows.ts` | 断言 |

## 验收对照

| # | 检查 |
|---|------|
| 1 | 开局软帽=现基线 |
| 2 | 升码头鱼帽升高；升小屋玩/零/知升高 |
| 3 | 金库取小屋与码头较大档 |
| 4 | 升粮仓矿/木帽升高；未建仓矿木=40 |
| 5 | 四建筑可升到 8，价表有 Lv6–8 |
| 6 | 每级外观可辨差异 |
| 7 | edge-flows + build 通过 |
