# 玩家说明书 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **本仓库约定：** 未经用户明确要求不要 `git commit`；跳过所有 Commit 步骤。

**Goal:** 生产构建可用的右下角说明书：完整玩法文案、目录锚点、本地检索高亮，并以 Cursor 规则强制与机制同步更新。

**Architecture:** `manual.ts` 为唯一章节数据源（数字从现有常量模板拼接）；`ManualPanel.tsx` 负责浮钮/面板/目录/搜索；`App.tsx` 始终挂载；`.cursor/rules/player-manual.mdc` 对齐 DevToolbar 维护纪律。

**Tech Stack:** React 19、Vite、TypeScript；无新依赖。验证用 `npm run build`（`tsc -b && vite build`）。

**Spec:** `docs/superpowers/specs/2026-09-30-player-manual-design.md`

---

## 文件结构

| 文件 | 职责 |
|------|------|
| Create `src/game/data/manual.ts` | `ManualSection`、`MANUAL_SECTIONS`、纯函数 `filterManualSections` / `highlightSegments` |
| Create `src/ui/ManualPanel.tsx` | 浮钮 + 面板 UI |
| Modify `src/App.tsx` | 挂载 `<ManualPanel />` |
| Create `.cursor/rules/player-manual.mdc` | AlwaysApply 维护规则 |

---

### Task 1: `manual.ts` 数据与检索纯函数

**Files:**
- Create: `src/game/data/manual.ts`

- [x] **Step 1: 实现类型、过滤/高亮纯函数、九章文案**

导出：

```ts
export type ManualSection = { id: string; title: string; paragraphs: string[] }

export function filterManualSections(
  sections: ManualSection[],
  query: string,
): ManualSection[] {
  const q = query.trim().toLowerCase()
  if (!q) return sections
  return sections.filter((s) => {
    if (s.title.toLowerCase().includes(q)) return true
    return s.paragraphs.some((p) => p.toLowerCase().includes(q))
  })
}

/** 返回 React 可用的片段；调用方把 mark 段包成 <mark> */
export function highlightSegments(
  text: string,
  query: string,
): Array<{ text: string; hit: boolean }> {
  const q = query.trim()
  if (!q) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const out: Array<{ text: string; hit: boolean }> = []
  let i = 0
  while (i < text.length) {
    const at = lower.indexOf(needle, i)
    if (at < 0) {
      out.push({ text: text.slice(i), hit: false })
      break
    }
    if (at > i) out.push({ text: text.slice(i, at), hit: false })
    out.push({ text: text.slice(at, at + needle.length), hit: true })
    i = at + needle.length
  }
  return out.length ? out : [{ text, hit: false }]
}
```

`MANUAL_SECTIONS` 九章对齐 spec 表格，**必须**用模板字符串引用至少：

- `DAYS_PER_SEASON`, `MINUTES_PER_DAY`, `FISH_DAILY_PER_CAT`
- overview：口头对齐 `goals.ts` 的目标种类（囤鱼/囤麦/小屋等级/猫数/出航/炼药）
- `ROLE_MAX_LEVEL`, `ROLE_YIELD_PER_LEVEL`, `ROLE_CONSUME_PER_LEVEL`, `ROLE_UPGRADE_KNOWLEDGE`, `ROLE_LABEL`（`careers`）
- `FARM_SIZE`, `GRANARY_DAILY_DECAY`, `GRANARY_REPAIR_COST`, `GRANARY_REPAIR_AMOUNT`, `GRANARY_MAX_LEVEL`
- `COTTAGE_MAX_LEVEL`, `catCapForCottage(1)` / `catCapForCottage(COTTAGE_MAX_LEVEL)`, `HARBOR_MAX_LEVEL`, `BOAT_MAX_LEVEL`
- buildings：写「价格见商店」，并引用一例如 `COTTAGE_UPGRADE_PRICE[2]`（升到 Lv2 金币）
- `BOAT_FISH_CAP[1]`, `BOAT_WOOD_CAP[1]`, `voyageDurationMinutes(1)`, `voyageCooldownMinutes(1)`
- 明确写：职业就任/解除**不耗知识**；药不当饭；全灭可重新开始

章节 id：`overview` | `time` | `resources` | `careers` | `farm` | `buildings` | `voyage` | `survival` | `shop`

- [x] **Step 2: 快速自检纯函数**

在终端用 `npx tsx -e "..."` 或临时断言：空查询返回 9 章；`鱼` 至少命中 resources/survival；`highlightSegments('鱼肉口粮','鱼')` 含 hit。

Expected: 逻辑正确即可（本仓库无 jest）。

---

### Task 2: `ManualPanel` UI

**Files:**
- Create: `src/ui/ManualPanel.tsx`

- [x] **Step 1: 实现面板**

要点（对齐 spec）：

- `open` state；浮钮右下 `right: 12, bottom: 12`，文案「说明」
- 面板：`right: 12`，`bottom: 56`（浮钮上方间隙），宽 `min(400, calc(100vw - 24px))`，高 `min(78vh, 640px)`
- 根容器 `zIndex: 35`，浮钮 `zIndex: 36`；`pointerEvents: 'none'` 包一层，面板/钮 `pointerEvents: 'auto'`
- 无遮罩；不接 gameStore 暂停
- 标题栏文案「说明书」+ 关闭钮；搜索占位「检索关键词…」
- `useEffect` 监听 `Escape` → 关闭并清空 query；关闭（浮钮/关闭/Esc）均清空 `query`
- 目录：对 `filterManualSections(MANUAL_SECTIONS, query)` 渲染按钮；`el.scrollIntoView({ behavior: 'smooth', block: 'start' })`
- 正文：过滤后的章节；段落用 `highlightSegments` + `<mark style={{ background:'rgba(240,215,140,0.45)', color:'inherit' }}>`
- 无匹配：「无匹配内容」
- 视觉对齐 Hud：深绿半透明、圆角、中文

参考样式可抄 `Hud.tsx` 的 `panel` 色值，勿引入新字体栈以外的依赖。

---

### Task 3: 挂载到 App

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: import 并始终渲染**

```tsx
import { ManualPanel } from './ui/ManualPanel'
// ...
<Hud />
<ManualPanel />
{import.meta.env.DEV && <DevToolbar />}
```

---

### Task 4: Cursor 维护规则

**Files:**
- Create: `.cursor/rules/player-manual.mdc`

- [x] **Step 1: 写入 AlwaysApply 规则**（镜像 `dev-toolbar.mdc` 结构）

内容要点：

- 改玩法/资源/建筑/时间/季节/职业/出海/目标/生存时必须更新 `src/game/data/manual.ts`
- 自检：章节是否更新、须引用常量是否仍从符号读、生产是否能开说明书
- 文案中文；勿写开发作弊说明

---

### Task 5: 验证

- [x] **Step 1: `npm run build`**

Expected: `tsc -b` 与 `vite build` 成功。

- [x] **Step 2: 手工核对（dev）**

- 右下「说明」可开/关；浮钮在面板之上可再点收起；Esc 关闭并清空搜索  
- 目录跳转；搜「知识」「出海」有过滤+高亮  
- DEV 下 DevToolbar 仍可用；左 HUD/商店不受挡

- [x] **Step 3: 文案抽查**

对照 `ShopToolbar` / `careers.ts` / `voyage.ts` / `gameStore` 日结：就任免费、药不当饭、出海时段与装货、日耗鱼叙述是否一致。

---

## 完成定义

满足 spec 验收清单；未引入存档字段；未把说明书塞进 DevToolbar。
