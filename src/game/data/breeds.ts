import type { CatBreed, CatInstance, CatRole } from '../types'
import { HOME_POS } from '../types'

export const CAT_BREEDS: CatBreed[] = [
  {
    id: 'cream',
    name: '奶糖',
    title: '奶油橘猫',
    recruitPrice: 0,
    palette: {
      pattern: 'solid',
      fur: '#ffb84a',
      furDark: '#e88828',
      belly: '#ffe8c4',
      cheek: '#ffd9a8',
      earInner: '#f2a8b8',
      nose: '#e87890',
      eye: '#3d6b2a',
      eyeHighlight: '#ffffff',
      collar: '#e85a4a',
      accessory: 'bow',
      bodyScale: 1,
    },
  },
  {
    id: 'ink',
    name: '墨墨',
    title: '玄黑猫',
    recruitPrice: 55,
    palette: {
      pattern: 'smoke',
      fur: '#3a3a48',
      furDark: '#22222c',
      belly: '#6a6a78',
      cheek: '#4a4a58',
      earInner: '#c87888',
      nose: '#d07080',
      eye: '#c8e050',
      eyeHighlight: '#f5ffe0',
      collar: '#7ec8e8',
      accessory: 'bandana',
      bodyScale: 0.86,
    },
  },
  {
    id: 'snow',
    name: '雪团',
    title: '纯白猫',
    recruitPrice: 70,
    palette: {
      pattern: 'solid',
      fur: '#fff8f0',
      furDark: '#e8ddd0',
      belly: '#ffffff',
      cheek: '#fff8f0',
      earInner: '#f0b0b8',
      nose: '#f090a0',
      eye: '#5a9ad4',
      eyeHighlight: '#ffffff',
      collar: '#f0a0c0',
      accessory: 'scarf',
      bodyScale: 1.22,
    },
  },
  {
    id: 'tabby',
    name: '虎子',
    title: '棕虎斑',
    recruitPrice: 85,
    palette: {
      pattern: 'tabby',
      fur: '#d49840',
      furDark: '#7a4420',
      belly: '#e8c890',
      cheek: '#d4a868',
      earInner: '#e89898',
      nose: '#c86868',
      eye: '#c8a030',
      eyeHighlight: '#fff8d0',
      collar: '#5a8f4a',
      accessory: 'strawhat',
      bodyScale: 1.05,
      accent: '#6a3a18',
    },
  },
  {
    id: 'calico',
    name: '花卷',
    title: '三花猫',
    recruitPrice: 100,
    palette: {
      pattern: 'calico',
      fur: '#f5efe4',
      furDark: '#e0d0b8',
      belly: '#fff8f0',
      cheek: '#ffe8d8',
      earInner: '#f0a0a8',
      nose: '#e07080',
      eye: '#4a7a3a',
      eyeHighlight: '#ffffff',
      collar: '#d4a017',
      accessory: 'flower',
      bodyScale: 0.92,
      accent: '#e85840',
      accent2: '#2a2a2e',
    },
  },
  {
    id: 'siamese',
    name: '暹罗',
    title: '重点色暹罗',
    recruitPrice: 120,
    palette: {
      pattern: 'siamese',
      fur: '#e8dcc8',
      furDark: '#5a4030',
      belly: '#f5efe0',
      cheek: '#e8d8c0',
      earInner: '#d89890',
      nose: '#8a5050',
      eye: '#4a90c8',
      eyeHighlight: '#e8f4ff',
      collar: '#9b59b6',
      accessory: 'bells',
      bodyScale: 1.18,
      accent: '#4a3020',
    },
  },
]

export function getBreed(id: string): CatBreed | undefined {
  return CAT_BREEDS.find((b) => b.id === id)
}

export function createStarterCat(): CatInstance {
  return {
    id: 'cat-cream-0',
    breedId: 'cream',
    x: HOME_POS.x,
    z: HOME_POS.z,
    behavior: 'idle',
    role: 'farmer',
    roleLevel: 1,
    chopsToday: 0,
    castsToday: 0,
    studiesToday: 0,
    craftsToday: 0,
    sick: false,
  }
}

export function nextRecruitBreed(ownedBreedIds: string[]): CatBreed | null {
  return CAT_BREEDS.find((b) => b.recruitPrice > 0 && !ownedBreedIds.includes(b.id)) ?? null
}

/** Recruit: keep ≥1 farmer；优先补学者/船商与其他专精 */
export function pickRecruitRole(cats: { role?: CatRole }[]): CatRole {
  const farmers = cats.filter((c) => (c.role ?? 'farmer') === 'farmer').length
  const miners = cats.filter((c) => c.role === 'miner').length
  const lumberjacks = cats.filter((c) => c.role === 'lumberjack').length
  const fishers = cats.filter((c) => c.role === 'fisher').length
  const scholars = cats.filter((c) => c.role === 'scholar').length
  const sailors = cats.filter((c) => c.role === 'sailor').length
  const doctors = cats.filter((c) => c.role === 'doctor').length
  if (farmers < 1) return 'farmer'
  if (scholars < 1 && cats.length >= 2) return 'scholar'
  if (sailors < 1 && cats.length >= 3) return 'sailor'
  if (doctors < 1 && cats.length >= 4) return 'doctor'
  const specialists = miners + lumberjacks + fishers + scholars + sailors + doctors
  const afterCount = cats.length + 1
  if (specialists < Math.floor((afterCount * 2) / 3)) {
    const least = Math.min(miners, lumberjacks, fishers)
    if (fishers === least) return 'fisher'
    if (miners === least) return 'miner'
    return 'lumberjack'
  }
  return 'farmer'
}

export function harvestYield(base: number, catCount: number, farmerLevels: number[] = []): number {
  const countBonus = 1 + Math.max(0, catCount - 1) * 0.5
  const avg =
    farmerLevels.length > 0
      ? farmerLevels.reduce((a, b) => a + b, 0) / farmerLevels.length
      : 1
  const roleBonus = 1 + (Math.max(1, avg) - 1) * 0.25
  return Math.max(1, Math.round(base * countBonus * roleBonus))
}

export function growSpeedFactor(catCount: number): number {
  return 1 + Math.max(0, catCount - 1) * 0.25
}
