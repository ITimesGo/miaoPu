# 猫咪头顶闲聊 Implementation Plan

> **For agentic workers:** Use executing-plans or subagent-driven-development.  
> **本仓库约定：** 未经用户明确要求不要 `git commit`。

**Goal:** 猫头上方概率冒出生活向碎碎念气泡（出门/雨/农忙/收获/闲逛），冷却去重，最多同时 2 句。

**Architecture:** `catDialogue` 词库 + 调度纯函数；`gameStore` 持气泡与冷却；`CatActor` 边沿调用 `tryCatSpeech` 并用 `Html` 显示气泡。

**Tech Stack:** React / R3F / drei Html / Zustand  
**Spec:** `docs/superpowers/specs/2026-09-30-cat-dialogue-design.md`

---

## 文件

| 文件 | 职责 |
|------|------|
| Create `src/game/data/catDialogue.ts` | 情境词库 |
| Create `src/game/systems/catDialogue.ts` | 选句 / 冷却判定纯逻辑 |
| Modify `src/game/state/gameStore.ts` | bubbles、冷却、tryCatSpeech、tick 清理、DevPatch |
| Create `src/scenes/shared/CatSpeechBubble.tsx` | 头顶 Html 气泡 |
| Modify `src/scenes/zones/CatActor.tsx` | 边沿触发 + 渲染气泡 |
| Modify `src/ui/DevToolbar.tsx` | 清冷却 / 强制冒泡 |
| Modify `src/game/data/manual.ts` | 开局章一句 |

---

### Task 1: 词库

- Create `src/game/data/catDialogue.ts`
- 情境：`morning_out` | `rain` | `farm_busy` | `harvest` | `soft_idle`
- 每池 `shared: {id,text}[]` + `byRole?: Partial<Record<CatRole, {id,text}[]>>`
- 每池共用 ≥8 句；农夫/渔夫/学者等各补若干；口语碎碎念

### Task 2: 调度 + store

- 常量：单猫冷却 10、全岛 4、气泡时长 5、上限 2；概率按 spec
- `pickDialogueLine` / `canTrySpeech` 纯函数
- store：`speechBubbles`, `lastIslandSpeechAt`, `catSpeechAt`, `catMorningOutDay`, `recentLineIds`, `catRecentLineIds`
- `tryCatSpeech({ catId, situation, nowAbs, day, role, force? })`
- `tick` 内清理过期气泡
- DevPatch：`clearSpeechCooldown`, `forceSpeechSituation`

### Task 3: 气泡 UI + CatActor 边沿

- `CatSpeechBubble`：Html 头顶，浅底深字，`pointerEvents:none`
- 边沿：任务 kind 变化时；rain (a)/(b)；morning_out 闩；harvest/farm_busy 在 perform 或任务开始；soft_idle 任务开始
- 跟踪 `prevPrecip` / `prevTaskKind` refs

### Task 4: Dev + manual + build

- DevToolbar 按钮
- manual overview 一句
- `npm run build`
