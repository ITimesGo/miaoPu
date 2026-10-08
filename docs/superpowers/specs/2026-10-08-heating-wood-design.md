# 取暖生火（木材）— 设计

日期：2026-10-08  
状态：已定稿（已实现）

## 规则

- 日结按猫扣木：春夏秋每猫 1（夜），冬天每猫 2（全天）
- 能烧多少烧多少；不足则 `COLD_SHORTAGE_SICK_BONUS = 0.05`
- 开局 `STARTING_WOOD = 12`
- 不冻死、不降产

## 文件

- `src/game/data/heating.ts`
- 日结：`gameStore.ts`；开局：`saveGame.ts`；HUD / 说明书
