# 猫咪头顶闲聊 — 设计

日期：2026-09-30  
状态：已定稿（待实现）

## 目标

在生活向节点（出门、雨天、农忙、收获等）让猫**头顶**概率冒出短句碎碎念，形成生活感；控制频率与重复，避免连刷和固定、口号感。

## 已确认偏好

| 项 | 选择 |
|----|------|
| 位置 | 挂在猫头上 |
| 频率 | 生活感档：关键节点较易触发，平时偏少 |
| 台词 | 场景共用池 + 职业专属句（不做品种性格） |
| 并发 | 全岛最多 2 个气泡同时显示 |
| 架构 | 情境词库 + 轻量调度（方案 A） |

## 非目标

- 不按品种性格标签
- 不接大模型实时生成
- 不做对话树 / 玩家点选回复
- 不做独立聊天面板
- 首版冷却与气泡**不写入存档**（重开清空）

## 架构

| 单元 | 路径 | 职责 |
|------|------|------|
| 词库 | `src/game/data/catDialogue.ts` | 情境 → 共用句 + 按职业专属句 |
| 调度 | `src/game/systems/catDialogue.ts` | 情境判定、概率、冷却、去重、选句 |
| 状态 | `gameStore` | `speechBubbles`、冷却时间戳；`tryCatSpeech` / tick 清理过期 |
| 呈现 | `CatSpeechBubble` 挂于 `CatActor` | 猫头上方短气泡 |
| 开发 | `DevToolbar` + `DevPatch` | 清冷却、强制某情境冒泡 |
| 说明书 | `manual.ts` | 补一句「猫头偶尔碎碎念」 |

不新建全局事件总线：在既有节拍上嗅探（出门回合、天气、behavior/任务 kind）。

## 数据模型

```ts
type DialogueSituation =
  | 'morning_out'
  | 'rain'
  | 'farm_busy'
  | 'harvest'
  | 'soft_idle'
  // 首版不做 night_in：夜归直接进 sleep+走路，无干净边沿

type SpeechBubble = {
  catId: string
  text: string
  lineId: string
  expiresAtAbs: number // 绝对游戏分钟
}

// store 侧（示意）
speechBubbles: SpeechBubble[] // length ≤ 2
lastIslandSpeechAt: number // 上次成功开说的 abs；全岛冷却从此刻起算（不与气泡播完绑定）
catSpeechAt: Record<string, number>
catMorningOutDay: Record<string, number> // catId → 已试过 morning_out 的 day 序号，防同日反复
recentLineIds: string[] // 全岛近期 lineId，约 12
catRecentLineIds: Record<string, string[]> // 每猫近期约 5 个 lineId
```

词库条目带稳定 `id`（如 `harvest_shared_03`），便于去重。

## 情境与优先级

在**边沿**上判定可触发情境，按优先级只取**一个**：

1. `rain` — 白天正在降水，且满足以下**边沿之一**（非每帧）：(a) 任务刚变为 `shelter` 且当时已在降水；(b) 已在屋内（含生病躲屋）时降水**刚开始**（clear→rain/snow 上升沿）。下雨出门优先雨而非 `morning_out`。无降水的 shelter（纯生病）不触发。冷却过后若仍在躲雨，**不再**因「保持躲雨」重试，除非再次出现 (a)/(b)。  
2. `morning_out` — 该猫当日首次：已过 `exitTurnMinute`、且本拍选到**非 shelter** 的户外任务；用 `catMorningOutDay[catId] === day` 闩住，每日每猫最多试一次。  
3. `harvest` — `performTask` / 行为边沿为 harvest  
4. `farm_busy` — hoe / plant / water 边沿  
5. `soft_idle` — play / eat / watchFish / wander 边沿（**不含** `waitGrow`）

**不触发**：生病非医生躲屋（无降水的 shelter）、`sleep`、持续 `walk` 赶路中途、已达 2 气泡、冷却中。首版不做 `night_in`。

夜窗与 AI 一致：`hour < 6 || hour >= 20`。

## 词库语气

- 短口语碎碎念；每池约 8–15 句起步（共用为主，职业各补 2–5 句）  
- `rain` 池内混担忧 / 偷懒 / 偶尔开心，靠随机而非固定态度  
- 避免说明书腔、口号、明显 AI 腔  
- 示例方向：「又是幸福满满的一天…」「农活堆成山了喵」「麦子金灿灿的，开心」「雨天就该窝着嘛」

选句：候选 = 共用 ∪ 本猫职业专属 → 去掉该猫近期约 5 句与全岛 `recentLineIds` → 加权随机；无候选则本拍不说。

## 频率（生活感档）

| 规则 | 数值（游戏分钟 / 概率，实现时可微调） |
|------|----------------------------------------|
| 单猫冷却 | 8–12 |
| 全岛冷却 | 3–5（自成功开说起算） |
| 气泡时长 | 4–6 |
| 并发上限 | 2 |
| `morning_out` / `harvest` | 试触发概率 ~35–50% |
| `rain` | ~25–40% |
| `farm_busy` | ~15–25% |
| `soft_idle` | ~8–12% |

节点「试一次」：出门（非雨）、降水躲雨边沿 (a)/(b)、开始某工作等，不每帧抽奖。全岛冷却自**成功开说**时起算，与气泡是否播完无关（故可在冷却外叠满 2 个，只要两次开说间隔 ≥ 全岛冷却）。

## UI

- 猫头上方；浅底深字圆角小气泡；一行优先，最长约两行  
- 到期从 `speechBubbles` 移除（tick 或组件内根据 `expiresAtAbs`）  
- `pointerEvents: none`，不挡场景操作  
- 不单独做滚动条；若将来气泡内可滚则用 `miaopu-scroll`

## Dev / 说明书 / 规则

- `DevPatch`：清对话冷却；强制指定情境对某猫/随机猫冒泡  
- `DevToolbar` 对应中文控件  
- `manual.ts` **开局与目标**章补一句头顶碎碎念  
- 改词库/情境时同步说明书（`player-manual.mdc`）；可观测参数走 DevToolbar（`dev-toolbar.mdc`）

## 验收

- [ ] 猫头可见气泡，最多同时 2 个  
- [ ] 出门 / 雨 / 农忙 / 收获有可感知触发，但不连刷  
- [ ] 同句近期不重复；职业偶有专属味  
- [ ] 睡觉/赶路/生病躲屋默认不说  
- [ ] DEV 可清冷却、强制冒泡  
- [ ] 说明书有提及；生产构建无 Dev 面板依赖  

## 实现顺序建议

1. 词库 `catDialogue.ts`  
2. 调度纯函数 + store 字段与清理  
3. `CatActor` 气泡组件  
4. 边沿触发接入（出门/雨/工作）  
5. DevToolbar + manual 一句  
6. 手测频率与去重  
