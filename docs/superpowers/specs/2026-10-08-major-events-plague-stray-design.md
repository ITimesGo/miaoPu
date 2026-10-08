# 喵圃偶发大事：疫病潮 + 流浪猫投奔 — 设计

日期：2026-10-08  
状态：已定稿（待实现）

## 目标

在现有海盗来袭之上，增加两类**偶发决策大事**：疫病潮、流浪猫投奔。与海盗共用统一状态机与互斥调度，形成「中后期偶尔弹一次决策窗」的节奏；挂机有明确默认结果。

## 非目标

- 不改商船 / 丰收 / 欠收（`gameEvent`）的被动 buff 体系
- 不做风暴封港、鼠患等其它事件（可后续再加 kind）
- 不做多大事并行、不做链式任务树
- 不引入声望 / 好感度数值
- 不把 Dev 作弊写进玩家说明书

## 已确认决策

| 项 | 选择 |
|----|------|
| 交互 | 均如海盗：弹窗决策 + 墙钟倒计时 |
| 互斥 | **决策窗互斥**：`threat` / `fighting` / `result` / `needsAck` 期间不开新大事；`plagueUntil` 残留 debuff **不**阻挡下一件大事（冷却仍约束） |
| 超时默认 | 疫病 → 硬扛；投奔 → 婉拒（不花资源、不加人口） |
| 架构 | 统一 `majorEvent` 状态机（方案 2） |
| 稀有度 | 高阈值 + 低日结概率 + 共享长冷却 |

## 架构

### 状态：`MajorEventState`

取代并兼容现有 `pirateRaid`：

```ts
type MajorEventKind = 'none' | 'pirate' | 'plague' | 'stray'
type MajorEventPhase = 'idle' | 'threat' | 'fighting' | 'result'

type MajorEventState = {
  kind: MajorEventKind
  phase: MajorEventPhase
  decideBy: number          // Date.now() 墙钟截止
  fightEndsAt: number       // 海盗对抗演出用
  pendingOutcome: PirateFightOutcome | null
  resultTitle: string
  resultBody: string
  nextEligibleAt: number    // 绝对游戏分钟；三种大事共用
  needsAck: boolean
  autoResolved: boolean
  /** 疫病持续截止（绝对游戏分钟）；非疫病为 0 */
  plagueUntil: number
  /** 疫病倍率：隔离 <1，硬扛 >1；无疫病为 1 */
  plagueSickMult: number
  /** 投奔威胁阶段已掷好 */
  strayBreedId: string
  strayCostFish: number
  strayCostCoins: number
}
```

- `fighting` / `pendingOutcome` 仅海盗使用；其它 kind 保持空值。
- `kind === 'none'` 且 `phase === 'idle'` 且 `!needsAck` 时可调度下一件。

### 文件职责

| 路径 | 职责 |
|------|------|
| `src/game/data/majorEvents.ts` | 共用常量、互斥 `canRoll*`、日结抽签、疫病/投奔结算 |
| `src/game/data/pirates.ts` | 保留财富阈值、献贡/战斗算法；触发入口改由 majorEvents 调用 |
| `src/ui/MajorEventPanel.tsx` | 由 `PirateRaidPanel` 扩展/重命名；按 kind 渲染 |
| `src/game/state/gameStore.ts` | 日结 roll、超时自动结算、玩家选项 action、`devSet` |
| `src/game/state/saveGame.ts` | 持久化 `majorEvent`；旧档 `pirateRaid` → 映射 |
| `src/ui/DevToolbar.tsx` | 强制三类大事、清冷却、调 plagueUntil |
| `src/game/data/manual.ts` | 「时间与季节」扩成偶发大事说明 |
| `src/App.tsx` | 挂载 `MajorEventPanel` |

### 调度（日结）

顺序概念：口粮 / 生病 / 治愈结算之后 → `rollMajorEvent`：

1. 若 `gameOver` → 跳过  
2. 若决策窗占用中（`phase !== 'idle'` 或 `needsAck`）→ 跳过  
3. 若 `nowAbs < nextEligibleAt` → 跳过  
4. 若 `gameEvent.kind !== 'none'` → 跳过（与现海盗一致）  
5. 对每种 kind 先算 **门槛** `canX`（天/资源/人口等）；不过线则权重为 0  
6. 对过线的 kind 再算 **日结出现率** `p(kind)`（见下），以 `p` 为相对权重做一次加权抽样：  
   - `total = sum(p)`；若 `total <= 0` 则不开  
   - 以概率 `min(1, total)` 决定「今天是否出大事」；若出，再按 `p_i / total` 选唯一 kind  
   - 等价写法：`r = random(); if (r >= total) none; else` 在前缀和上落点  
7. 抽中则 `phase = 'threat'`，`kind` 写入，`decideBy = now + DECIDE_MS`，专用字段掷好  

**`p(kind)` 公式（实现用常量，可微调但须保持偶发）：**

| kind | `p` |
|------|-----|
| plague | `clamp(0.04 + medicineTightBonus + noDoctorBonus, 0.04, 0.10)` |
| stray | `clamp(0.03 + emptySlotBonus, 0.03, 0.08)` |
| pirate | 沿用现 `rollPirateChance`（约 5%～24%），但参与上式时 **再乘 0.55** 压权重，使「可出海盗时」仍偏偶发且略低于疫病/投奔抢位 |

说明：先门槛、再 `p`、再「是否出 × 选哪个」一条公式，避免「先选 kind 再掷概率」或「权重与 p 双重掷骰」导致稀有度失控。

**互斥与 `plagueUntil`：**  
决策窗占用才互斥。疫病结算后 `kind` 回到 `none`、`phase = idle`，仅保留 `plagueUntil` / `plagueSickMult`；在共享冷却到期后，允许在 debuff 仍生效时触发海盗或投奔。

### 存档兼容

- 新字段名：`majorEvent`  
- 读档：若只有旧 `pirateRaid`，映射为 `kind: phase==='idle' && !needsAck ? 'none' : 'pirate'`，其余字段照搬，`plague*` / `stray*` 置默认  
- 写档只写 `majorEvent`；可暂时双写一版 `pirateRaid` 镜像以便回滚，非必须（实现时优先单字段 + sanitize）

## 共用节奏

| 常量 | 值 |
|------|-----|
| 决策墙钟 | 30 分钟（复用 `PIRATE_DECIDE_MS` 或抽成 `MAJOR_DECIDE_MS`） |
| 共享冷却 | ≈ 1.5 季游戏分钟（与现 `PIRATE_COOLDOWN_MINUTES` 同量级） |
| 同时大事 | 最多 1 |

被动 `gameEvent`（商船等）与大事互斥触发，但大事进行中不强制取消已在进行的商船（日结抽签时已要求 event 为 none 才开新大事）。

## 疫病潮 `plague`

### 触发（偶发）

- 天数 ≥ **20**
- 猫数 ≥ **4**
- 且满足其一：  
  - 药库存 ≤ `猫数 × medicinePerCure × 0.5`  
  - 当前病猫 ≥ **2**
- 日结抽中率约 **4%～10%**（无医生 / 药越少略升，封顶 10%）

### 选项

**隔离**

- 耗药：`max(2, 猫数 × medicinePerCure)`，有医生编制再 **−1**（至少 1）  
- 药不足：按钮禁用，提示差额  
- 成功：扣药 → 立刻按现有规则尝试治愈病猫 → `plagueSickMult = 0.5`，`plagueUntil = nowAbs + 2 × MINUTES_PER_DAY`  
- 随后进入 `result` → ack → `kind = 'none'` / `phase = 'idle'`，并写入共享 `nextEligibleAt`（`plagueUntil` 保留）

**硬扛** / 超时默认

- 不扣资源  
- `plagueSickMult = 有医生 ? 1.7 : 2.2`  
- `plagueUntil = nowAbs + 3 × MINUTES_PER_DAY`  
- 超时：`autoResolved = true`，`needsAck = true`；ack 后同样 `kind = 'none'`，保留 debuff 字段，写 `nextEligibleAt`

### 进行中效果

- 日结掷生病时：`chance *= plagueSickMult`（仅在 `nowAbs < plagueUntil`）  
- HUD 可显示「疫病潮 · 剩余约 X 日」（轻量提示即可）  
- 到期：`plagueSickMult = 1`，`plagueUntil = 0`，可选一句 status

## 流浪猫投奔 `stray`

### 触发（偶发）

- 天数 ≥ **16**
- 小屋空位 ≥ **2**（`catCap - cats.length >= 2`）  
- 鱼 ≥ `dailyFishNeed(cats) × 2`  
- 玩具 + 零食库存合计 ≥ **2**  
- 日结抽中率约 **3%～8%**（空位多略升，封顶 8%）

### 威胁阶段掷好

- `strayBreedId`：优先尚未拥有的可招募品种（对齐商店「下一只」思路）；全拥有则随机已有池中一只  
- `strayCostFish`：5～8  
- `strayCostCoins`：20～40  

### 选项

**收留**

- 需：鱼/金足够，且仍有空位（点按钮时再检一次）  
- 扣鱼金 → 新增猫：该品种、`role: civilian`、`roleLevel: 1`、健康（复用招募生成路径）。商店价由 `cats.length` 推导，无独立涨价计数；收留后价格随猫数自然上升即可  
- 结果文案说明加入散民  
- 结算后：`phase = 'result'` → 玩家 ack（或超时已写入 result）→ `kind = 'none'`、`phase = 'idle'`，并写入共享 `nextEligibleAt`（与海盗在献贡/揭晓时写入对齐）

**婉拒** / 超时默认

- 无惩罚；文案「它们去了别的岛」  
- 超时：`autoResolved` + `needsAck`

## 海盗（迁入）

- 触发阈值 / 献贡 / 战斗 / 演出保持现有 `pirates.ts` 行为  
- 仅改为通过 `majorEvent.kind === 'pirate'` 驱动 UI 与互斥  
- 冷却写入共享 `nextEligibleAt`

## UI

`MajorEventPanel`：

- 共用遮罩、倒计时、`needsAck`「知道了」、挂机回看  
- 按 `kind` 换标题、正文、主按钮  
- 海盗保留对抗进度条  
- `gameOver` 不展示  
- 若结果正文过长可滚动：容器加 `miaopu-scroll`

## DevToolbar

仅 `import.meta.env.DEV`：

- 强制：海盗 / 疫病潮 / 流浪猫（覆盖为 threat；需先能进入 idle 或强制清掉当前）  
- 清空大事冷却（`nextEligibleAt = 0`）  
- 调节 / 清除 `plagueUntil`  
- 一律经 `devSet` / `DevPatch`

## 说明书

`manual.ts`「时间与季节」中海盗段扩展为**偶发大事**：

- 三类互斥、约 30 分钟真实决策、超时默认（海盗献贡 / 疫病硬扛 / 投奔婉拒）  
- 共享冷却约 1.5 季  
- 简述触发门槛与选项效果  
- 关键数字从代码常量拼接  

## 验收要点

1. 旧存档含 `pirateRaid` 能读入并继续海盗流程  
2. 决策窗不会叠弹窗；`plagueUntil` 残留期间冷却到期后允许其它大事  
3. 日结抽签按「门槛 → p → min(1,total) 是否出 → 按 p 比例选 kind」一条公式实现  

4. 挂机超时：疫病硬扛、投奔婉拒、海盗仍献贡  
5. 疫病倍率只影响日结生病掷骰，不改药耗单价公式本身  
6. 收留尊重小屋上限；空位 &lt; 2 时不进入可触发池  
7. 生产构建无 Dev；说明书可打开且文案与常量一致  
8. 可滚动结果区使用 `miaopu-scroll`

## 实现顺序建议

1. `MajorEventState` + save 兼容 + 海盗迁入（行为无感）  
2. 疫病潮触发/结算 + 面板分支 + 日结倍率  
3. 流浪猫触发/结算 + 面板分支  
4. Dev + 说明书 + 自检
