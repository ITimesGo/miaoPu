import type { Season } from '../types'

/** 春夏秋：夜晚取暖，每猫耗木 */
export const HEATING_WOOD_PER_CAT_MILD = 1
/** 冬天：全天生火，每猫耗木 */
export const HEATING_WOOD_PER_CAT_WINTER = 2
/** 新开局库存木材（撑到有伐木工） */
export const STARTING_WOOD = 12
/** 取暖不足时额外生病概率（与麦种告罄同档） */
export const COLD_SHORTAGE_SICK_BONUS = 0.05

export function heatingWoodPerCat(season: Season): number {
  return season === 'winter' ? HEATING_WOOD_PER_CAT_WINTER : HEATING_WOOD_PER_CAT_MILD
}

/** 日结取暖所需木材（按尚在岛上的猫数） */
export function heatingWoodNeed(catCount: number, season: Season): number {
  return Math.max(0, Math.floor(catCount)) * heatingWoodPerCat(season)
}
