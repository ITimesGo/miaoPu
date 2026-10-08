# 海盗富裕加成曲线压平 — 设计

日期：2026-10-08  
状态：已定稿（已实现）  
前置：建筑缩放软帽（中后期库存/富裕更高）

## 目标

软帽升高后，压平 `rollPirateChance` 随富裕增长的斜率与封顶，避免中后期日结海盗偏密。

## 非目标

- 不改 `PIRATE_STOCK_THRESHOLD` / `PIRATE_WEALTH_THRESHOLD`  
- 不改疫病、投奔、共享冷却、献贡/战斗  
- 不改 `PIRATE_P_WEIGHT`（0.55）

## 公式

现：`min(0.24, 0.05 + over * 0.07)`  
新：`min(0.14, 0.05 + over * 0.03)`  
`over = max(0, wealth - WEALTH_THRESHOLD) / WEALTH_THRESHOLD`

说明书「约 5%～24%」→「约 5%～14%」（若有写）。
