# 建筑升级软帽增量提示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **本仓库约定：** 未经用户明确要求不要 `git commit`；跳过所有 Commit 步骤。

**Goal:** 商店建筑项 `desc` 追加真正上涨的库存软帽增量（全称 +N）。

**Architecture:** 在 `economy.ts` 用现有 `softCapFor` / `coinSoftCap` 对比前后 `SoftCapBuildings`，生成 hint 字符串；`getShopActions` 浅拷贝后改一项等级并拼进 `desc`；说明书补一句。

**Tech Stack:** TypeScript；验证 `npm run test:flows` + `npm run build`。

**Spec:** `docs/superpowers/specs/2026-10-08-building-upgrade-softcap-hint-design.md`

---

## 文件结构

| 文件 | 职责 |
|------|------|
| Modify `src/game/data/economy.ts` | 新增 `softCapDeltaHint(before, after)` |
| Modify `scripts/edge-flows.ts` | hint 与商店 desc 断言 |
| Modify `src/game/data/shop.ts` | 建筑项 `desc` 追加 hint |
| Modify `src/game/data/manual.ts` | 「建筑升级」或「商店」补一句 |

---

### Task 1: `softCapDeltaHint` + edge-flows（TDD）

**Files:**
- Modify: `scripts/edge-flows.ts`
- Modify: `src/game/data/economy.ts`

- [x] **Step 1: 写失败断言**

在 `edge-flows.ts` 的软帽相关块旁新增（先 import `softCapDeltaHint`）：

```ts
{
  const before = { cottage: 1, harbor: 1, boat: 1, granary: 0 }
  const afterCottage = { ...before, cottage: 2 }
  assert(
    softCapDeltaHint(before, afterCottage) ===
      '玩具 +4 · 零食 +4 · 知识 +8 · 金库 +600',
    '小屋1→2且港1：玩零知金库',
  )

  const beforeHarborHigh = { cottage: 1, harbor: 3, boat: 1, granary: 0 }
  const afterCottage2 = { ...beforeHarborHigh, cottage: 2 }
  const h = softCapDeltaHint(beforeHarborHigh, afterCottage2)
  assert(h.includes('玩具 +4') && h.includes('知识 +8'), '港高时仍涨玩知')
  assert(!h.includes('金库'), '港≥2升小屋不含金库')

  const afterHarbor = { ...before, harbor: 2 }
  assert(
    softCapDeltaHint(before, afterHarbor) === '鱼肉 +8 · 金库 +600',
    '港口1→2',
  )

  const afterBoat = { ...before, boat: 2 }
  assert(softCapDeltaHint(before, afterBoat) === '药品 +8', '货船1→2')

  assert(
    softCapDeltaHint(before, { ...before, granary: 1 }) === '',
    '建仓0→1无软帽涨',
  )
  assert(
    softCapDeltaHint({ ...before, granary: 1 }, { ...before, granary: 2 }) ===
      '矿石 +8 · 木材 +8',
    '仓1→2矿木',
  )
}
```

数值依据现表：Lv1→2 玩/零 20→24、知 50→58、金/鱼/药/矿/木 3000→3600 / 40→48。

- [x] **Step 2: 跑测确认失败**

Run: `npm run test:flows`  
Expected: FAIL（`softCapDeltaHint` 未导出或断言失败）

- [x] **Step 3: 实现 `softCapDeltaHint`**

在 `economy.ts`（`softCapFor` / `coinSoftCap` 附近）新增：

```ts
const SOFT_CAP_HINT_KEYS: { key: string; label: string }[] = [
  { key: 'toy', label: '玩具' },
  { key: 'snack', label: '零食' },
  { key: 'knowledge', label: '知识' },
  { key: 'fish', label: '鱼肉' },
  { key: 'medicine', label: '药品' },
  { key: 'ore', label: '矿石' },
  { key: 'wood', label: '木材' },
]

export function softCapDeltaHint(
  before: SoftCapBuildings,
  after: SoftCapBuildings,
): string {
  const parts: string[] = []
  for (const { key, label } of SOFT_CAP_HINT_KEYS) {
    const a = softCapFor(key, before)
    const b = softCapFor(key, after)
    if (a == null || b == null) continue
    const d = b - a
    if (d > 0) parts.push(`${label} +${d}`)
  }
  const coinD = coinSoftCap(after) - coinSoftCap(before)
  if (coinD > 0) parts.push(`金库 +${coinD}`)
  return parts.join(' · ')
}
```

禁止手写等级表；只走现有 API。

- [x] **Step 4: 再跑测**

Run: `npm run test:flows`  
Expected: 上述 hint 断言 PASS（整体脚本其余断言也保持绿）

---

### Task 2: `getShopActions` 拼接 desc

**Files:**
- Modify: `src/game/data/shop.ts`
- Modify: `scripts/edge-flows.ts`

- [x] **Step 1: 接线商店**

`import { softCapDeltaHint, type SoftCapBuildings } from './economy'`（路径按现有 import 习惯）。

在 `getShopActions` 内、推建筑项之前：

```ts
const softBefore: SoftCapBuildings = {
  cottage: cottage.level,
  harbor: harbor.level,
  boat: boat.level,
  granary: granary.level,
}
const appendSoftHint = (desc: string, after: SoftCapBuildings) => {
  const hint = softCapDeltaHint(softBefore, after)
  return hint ? `${desc} · ${hint}` : desc
}
```

各建筑项改 `desc`：

```ts
// cottage_upgrade
desc: appendSoftHint(
  `Lv.${cottage.level}→${lv} · 猫口 ${catCapForCottage(lv)}`,
  { ...softBefore, cottage: lv },
)

// granary_buy — 通常 hint 空，仅容量
desc: appendSoftHint(`容量 ${GRANARY_CAPACITY[1]}`, { ...softBefore, granary: 1 })

// granary_upgrade
desc: appendSoftHint(
  `Lv.${granary.level}→${lv} · 容量 ${GRANARY_CAPACITY[lv]}`,
  { ...softBefore, granary: lv },
)

// harbor_upgrade
desc: appendSoftHint(
  `Lv.${harbor.level}→${lv} · 码头扩大 · 商船更常来`,
  { ...softBefore, harbor: lv },
)

// boat_upgrade
desc: appendSoftHint(
  `Lv.${boat.level}→${lv} · 船只变大`,
  { ...softBefore, boat: lv },
)

// granary_repair — 不调用 appendSoftHint
```

- [x] **Step 2: edge-flows 覆盖商店 desc**

```ts
import { getShopActions } from '../src/game/data/shop'

const actions = getShopActions({
  granary: { level: 0, condition: 100 },
  harbor: { level: 1 },
  boat: { level: 1 },
  cottage: { level: 1 },
  ownedBreedIds: [],
  catCount: 1,
  cats: [],
})
const cottageUp = actions.find((a) => a.id === 'cottage_upgrade')
assert(
  !!cottageUp &&
    cottageUp.desc.includes('玩具 +4') &&
    cottageUp.desc.includes('金库 +600'),
  '商店小屋desc含软帽增量',
)
const granaryBuy = actions.find((a) => a.id === 'granary_buy')
assert(
  !!granaryBuy && !granaryBuy.desc.includes('矿石'),
  '建仓desc无矿石增量',
)
```

（`GranaryState` / `cats` 字段以 `shop.ts` / `types` 实际形状为准；不足则用最小合法桩。）

- [x] **Step 3: 跑测**

Run: `npm run test:flows`  
Expected: PASS

---

### Task 3: 说明书 + 构建

**Files:**
- Modify: `src/game/data/manual.ts`

- [x] **Step 1: 补文案**

在 `buildings` 段段落末或「商店与编制」建筑句旁加一句（勿手写具体数字）：

> 商店建筑升级/建造项会显示库存软帽增量（有上涨才写，如玩具、鱼肉、金库等）。

可接在现有「建筑：粮仓、小屋…」那句后，或 `buildings` 第三段末。

- [x] **Step 2: 全量验证**

Run:

```bash
npm run test:flows
npm run build
```

Expected: flows 全绿；build 成功。

- [x] **Step 3: 手动抽查（实现者本地）**

开商店「建筑」：小屋 Lv1→2 应见全称增量；港口同理；建粮仓不应出现矿石/木材 +N。

---

## 完成标准

- [x] Spec 决策：全称、只写正增量、金库不变省略、无单独 UI 行  
- [x] `softCapDeltaHint` 仅依赖 `softCapFor` / `coinSoftCap`  
- [x] 建筑五项（除修缮）均接线；建仓 hint 为空可接受  
- [x] `test:flows` + `build` 通过  
- [x] 说明书有一句玩家可见说明  
