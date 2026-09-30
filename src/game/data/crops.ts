import type { Season } from '../types'

export interface CropDef {
  id: string
  name: string
  seedId: string
  /** 每个生长阶段所需的游戏分钟（浇水后才累计） */
  stageMinutes: number[]
  /** 最高 stage 下标（= stageMinutes.length），到达后可收获 */
  maxStage: number
  seasons: Season[]
  harvestItemId: string
  harvestAmount: number
}

/** 小麦：芽 → 苗 → 拔节 → 麦穗（可收） */
export const WHEAT: CropDef = {
  id: 'wheat',
  name: '小麦',
  seedId: 'wheat_seed',
  // 每阶段 8 游戏小时；浇水生长，约 1 游戏日成熟（断水/过夜则更久）
  stageMinutes: [8 * 60, 8 * 60, 8 * 60],
  maxStage: 3,
  seasons: ['spring', 'summer', 'autumn'],
  harvestItemId: 'wheat',
  harvestAmount: 2,
}

export const CROPS: Record<string, CropDef> = {
  [WHEAT.id]: WHEAT,
}

export function getCrop(cropId: string): CropDef | undefined {
  return CROPS[cropId]
}
