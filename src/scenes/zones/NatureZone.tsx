import { useGameStore } from '../../game/state/gameStore'
import { seasonLook } from '../../game/data/seasons'
import { GrassTuft, Rock } from '../models/Decor'
import { Mountain } from '../models/Mountain'
import { Bush, StylizedTree } from '../models/Trees'

const TREES: Array<{ x: number; z: number; trunk?: number; canopy?: number }> = [
  { x: -10.6, z: 1.2, trunk: 1, canopy: 1.05 },
  { x: 1.5, z: 8.5, trunk: 0.95, canopy: 1 },
  { x: 5.5, z: 6.8, trunk: 1.05, canopy: 1.1 },
  { x: 8.2, z: -2.5, trunk: 0.9, canopy: 0.95 },
  { x: 7.0, z: 5.2, trunk: 1.0, canopy: 1.08 },
  { x: 9.0, z: 1.2, trunk: 0.85, canopy: 0.9 },
  { x: 4.2, z: 9.0, trunk: 1.1, canopy: 1.15 },
  { x: 6.2, z: -4.5, trunk: 1.05, canopy: 1.12 },
  { x: 2.8, z: 7.6, trunk: 0.8, canopy: 0.88 },
]

const BUSHES: Array<{ x: number; z: number; scale?: number }> = [
  { x: 6.5, z: -7, scale: 1.1 },
  { x: -1, z: -6.5, scale: 0.8 },
  { x: 3.5, z: 5.0, scale: 0.9 },
  { x: -7.5, z: 3.2, scale: 1.0 },
  { x: 8.0, z: 3.5, scale: 0.75 },
]

const ROCKS: Array<{ x: number; z: number; scale?: number }> = [
  { x: -7, z: -3.5, scale: 1.1 },
  { x: 4, z: 8.5, scale: 0.9 },
]

/** 东北岸礁石钓场 */
const REEF_ROCKS: Array<{ x: number; z: number; scale?: number }> = [
  { x: 8.4, z: 11.2, scale: 1.35 },
  { x: 9.8, z: 10.9, scale: 1.1 },
  { x: 10.8, z: 10.0, scale: 1.45 },
  { x: 7.6, z: 10.4, scale: 0.85 },
  { x: 9.2, z: 9.6, scale: 0.7 },
  { x: 11.0, z: 9.0, scale: 1.0 },
  { x: 8.9, z: 11.8, scale: 0.95 },
  { x: 11.2, z: 10.6, scale: 1.2 },
]

const GRASS: Array<[number, number]> = [
  [-4, 2],
  [-2, 5],
  [0, -5],
  [6, 3],
  [9, -3],
  [-8, 0],
  [3, 6],
  [-6, 6],
  [1, 4],
  [-9, -2],
]

export function NatureZone() {
  const season = useGameStore((s) => s.season)
  const look = seasonLook(season)

  return (
    <group>
      {/* 大山：矿洞在此 */}
      <Mountain look={look} x={-8.5} z={-6.2} scale={1.08} hasMine yaw={0.15} />
      {/* 小山：旁边稍矮 */}
      <Mountain look={look} x={-11.4} z={-3.8} scale={0.58} yaw={-0.55} />

      {TREES.filter((t) => !(t.x < -5.5 && t.z < -3.2)).map((t, i) => (
        <StylizedTree key={i} {...t} look={look} />
      ))}

      {BUSHES.map((b, i) => (
        <Bush key={i} {...b} look={look} />
      ))}

      {ROCKS.map((r, i) => (
        <Rock key={i} {...r} snow={look.showSnow} />
      ))}

      {REEF_ROCKS.map((r, i) => (
        <Rock key={`reef${i}`} {...r} snow={look.showSnow} />
      ))}

      {GRASS.map(([x, z], i) => (
        <GrassTuft key={i} x={x!} z={z!} scale={0.85 + (i % 3) * 0.15} look={look} />
      ))}
    </group>
  )
}
