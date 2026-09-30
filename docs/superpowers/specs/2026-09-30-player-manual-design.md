# 喵圃玩家说明书 — 设计

日期：2026-09-30  
状态：已定稿（待实现）

## 目标

提供**生产构建可用**的游戏内说明书，帮助玩家理解完整玩法与关键数值；并与开发者工具栏同一纪律：**改机制时必须同步更新说明书**。

## 非目标

- 不做书签 / 阅读进度持久化
- 不进入 DevToolbar（说明书面向玩家，非作弊面板）
- 不新增存档字段
- 不做服务端检索 / 外链 Wiki
- 不做全屏遮罩、不暂停游戏时钟

## 交互与界面

### 入口与叠层

- 屏幕**右下角**常驻「说明」浮钮（`App` 与 `Hud` 同级挂载，**非** `import.meta.env.DEV`）
- 点击打开手册窗；再次点击浮钮或点窗内「关闭」收起；**支持 Esc 关闭**
- **面板锚点**：贴右下，底边在浮钮**上方**留 8–12px 间隙；右缘与浮钮右缘对齐（或同为 `right: 12`）
- **浮钮始终在面板之上可点**（浮钮 `z-index` > 面板），保证「再点浮钮收起」永远可用
- 建议：`ManualPanel` 根层 `z-index: 35`，浮钮 `36`；`Hud` 更低；`DevToolbar` 可更高（约 40）。手册**无全屏遮罩**，不拦截 3D 场景点击（仅面板与浮钮自身 `pointerEvents: auto`）
- 打开时不暂停游戏时钟；关闭时**清空搜索关键字**并恢复全文

### 手册窗布局（自上而下）

1. **标题栏**：`说明书` + 关闭按钮  
2. **搜索框**：占位「检索关键词…」；本地即时过滤  
3. **章节目录**：九章短标题横排或换行按钮；点击滚到对应分区  
4. **正文区**：可纵向滚动；各章有 `id` 锚点 + 分区标题 + 段落

视觉：对齐现有 HUD/商店（深绿半透明、圆角、中文），宽度约 360–420px，最大高度约 `min(78vh, 640px)`；窄屏时宽度 `min(420px, calc(100vw - 24px))`，保证不超出视口。

### 目录锚点

- 目录项与数据源章节一一对应（同源 `id` / `title`）
- 点击 → 正文容器内 `scrollIntoView({ behavior: 'smooth', block: 'start' })` 到对应章节标题
- 有搜索过滤时：目录只列出当前仍可见的章节；点目录仍滚到过滤结果中的该章

### 检索

- 对**章节标题 + 全部段落**做本地子串匹配（`includes`，英文大小写不敏感；中文按原文匹配）
- 有关键字：只渲染命中章节；命中段落内匹配片段**必须**浅色高亮（`split` + `<mark>`）
- 无命中：正文区提示「无匹配内容」
- 清空搜索：恢复全文 + 完整目录

## 数据

### 文件

| 路径 | 职责 |
|------|------|
| `src/game/data/manual.ts` | 章节数据源；导出 `MANUAL_SECTIONS` |
| `src/ui/ManualPanel.tsx` | 浮钮 + 面板 UI（打开态、搜索、目录、正文） |
| `src/App.tsx` | 挂载 `<ManualPanel />`（始终） |
| `.cursor/rules/player-manual.mdc` | AlwaysApply：改玩法必须同步手册 |

### 数据结构

```ts
export type ManualSection = {
  id: string
  title: string
  paragraphs: string[]
}

export const MANUAL_SECTIONS: ManualSection[]
```

### 数值来源约定

- 下表「须引用常量」列中的数字**必须**从所列符号拼接进文案（禁止手写重复数字）。
- 叙述性规则（「药不当饭」「就任/解除免费」）可写死，但改规则时必须改对应段落。
- 建筑升级价若表格过长：手册可写「商店内查看各级价格」，但须引用 `*_MAX_LEVEL` 与至少一级示例价，或写明「价格见商店」。

## 首版章节

| id | 标题 | 内容要点 | 须引用常量（至少） |
|----|------|----------|-------------------|
| `overview` | 开局与目标 | 养猫种田；避免全灭；季节目标有奖 | `DAYS_PER_SEASON`；目标种类口头对齐 `goals.ts` |
| `time` | 时间与季节 | 一天/一季节奏；天气简述 | `DAYS_PER_SEASON`；`MINUTES_PER_DAY`（或「游戏内一天」表述） |
| `resources` | 资源 | 金/种/麦/鱼/矿/木/知/药；鱼口粮；药治病 | `FISH_DAILY_PER_CAT`；`SEED_PACK_PRICE`/`AMOUNT`；软上限如 `FISH_SOFT_CAP` 等可选 |
| `careers` | 猫咪与职业 | 散民；就任/解除免费；职责；升级 | `ROLE_MAX_LEVEL`；`ROLE_YIELD_PER_LEVEL`；`ROLE_CONSUME_PER_LEVEL`；`ROLE_UPGRADE_KNOWLEDGE`；`ROLE_LABEL` |
| `farm` | 农田与粮仓 | 翻地播种收割；容量/日损/维修 | `FARM_SIZE`；`GRANARY_DAILY_DECAY`；`GRANARY_REPAIR_COST`/`AMOUNT`；`GRANARY_MAX_LEVEL` |
| `buildings` | 建筑升级 | 小屋人口；码头/船 | `COTTAGE_MAX_LEVEL`；`catCapForCottage`；`HARBOR_MAX_LEVEL`；`BOAT_MAX_LEVEL` |
| `voyage` | 出海贸易 | 装货、出航、回港、冷却 | `BOAT_FISH_CAP`；`BOAT_WOOD_CAP`；`voyageDurationMinutes` / `voyageCooldownMinutes`（可用 Lv1 示例） |
| `survival` | 生病与全灭 | 药治愈；缺粮缺药；全灭重开 | `FISH_DAILY_PER_CAT`（与日耗叙述一致） |
| `shop` | 商店与编制 | 左栏分区；编制在猫咪页 | （规则向，无强制常量） |

实现时按当前 `gameStore` 核对机制（例如职业编制已不耗知识）。

## 维护规则（对齐 DevToolbar）

`.cursor/rules/player-manual.mdc`（`alwaysApply: true`）要求：

1. 新增或改动玩法 / 资源 / 建筑 / 时间 / 季节 / 职业 / 出海 / 目标 / 生存惩罚等时，**自行**更新 `manual.ts`（必要时改 `ManualPanel`）
2. 交付自检：机制是否变了 → 对应章节是否更新 → 「须引用常量」是否仍从符号读取 → 生产构建是否仍能打开说明书
3. 文案中文、简洁；不把开发作弊说明写进玩家手册

## 验收

- [ ] 生产构建可见右下「说明」；DEV/PROD 均可打开/关闭（浮钮、关闭钮、Esc）
- [ ] 面板在浮钮上方，浮钮始终可点以收起；窄屏不超出视口
- [ ] 无全屏遮罩；打开不暂停时钟；关闭清空搜索
- [ ] 九章齐全；「须引用常量」列中的数字均来自代码符号
- [ ] 目录跳转滚到对应章
- [ ] 搜索可过滤；命中处有高亮；清空恢复全文；无匹配有提示
- [ ] Cursor 规则已加入，与 DevToolbar 规则并列生效

## 实现顺序建议

1. `manual.ts` 数据 + 从常量拼文案  
2. `ManualPanel` UI（浮钮、窗、目录、搜索、Esc）  
3. `App` 挂载  
4. `player-manual.mdc` 规则  
5. 对照商店/职业/出海/日结逻辑抽查文案正确性  
