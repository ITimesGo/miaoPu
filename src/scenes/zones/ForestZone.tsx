import { useGameStore } from '../../game/state/gameStore'
import { seasonLook } from '../../game/data/seasons'
import { FOREST_LAYOUT, TREE_MAX_STAGE, TREE_STAGE_SCALE } from '../../game/data/forest'
import { FOREST_POS } from '../../game/types'
import { Bush, GrandTree, StylizedTree, TreeStump } from '../models/Trees'
import { GrassTuft, Rock } from '../models/Decor'

const FOREST_BUSHES = [
  { x: FOREST_POS.x + 0.9, z: FOREST_POS.z - 0.8, scale: 0.85 },
  { x: FOREST_POS.x - 1.1, z: FOREST_POS.z + 1.2, scale: 1.05 },
  { x: FOREST_POS.x + 2.2, z: FOREST_POS.z + 0.5, scale: 0.7 },
  { x: FOREST_POS.x - 0.4, z: FOREST_POS.z + 2.0, scale: 0.9 },
  { x: FOREST_POS.x + 1.5, z: FOREST_POS.z - 2.0, scale: 0.75 },
  { x: FOREST_POS.x - 2.4, z: FOREST_POS.z - 0.3, scale: 1.1 },
  { x: FOREST_POS.x + 3.4, z: FOREST_POS.z + 1.2, scale: 0.8 },
  { x: FOREST_POS.x + 0.2, z: FOREST_POS.z + 3.2, scale: 0.95 },
  { x: FOREST_POS.x + 4.0, z: FOREST_POS.z - 1.0, scale: 0.72 },
]

const FOREST_ROCKS = [
  { x: FOREST_POS.x + 0.4, z: FOREST_POS.z + 0.6, scale: 0.55 },
  { x: FOREST_POS.x - 1.6, z: FOREST_POS.z - 1.2, scale: 0.7 },
  { x: FOREST_POS.x + 2.8, z: FOREST_POS.z - 0.5, scale: 0.45 },
  { x: FOREST_POS.x + 3.6, z: FOREST_POS.z + 2.0, scale: 0.5 },
]

const FOREST_GRASS: Array<[number, number]> = [
  [FOREST_POS.x + 1.2, FOREST_POS.z + 1.0],
  [FOREST_POS.x - 0.8, FOREST_POS.z + 0.4],
  [FOREST_POS.x + 0.3, FOREST_POS.z - 1.4],
  [FOREST_POS.x + 2.0, FOREST_POS.z + 1.8],
  [FOREST_POS.x - 1.8, FOREST_POS.z + 1.5],
  [FOREST_POS.x + 3.0, FOREST_POS.z + 0.2],
  [FOREST_POS.x - 0.2, FOREST_POS.z + 2.8],
  [FOREST_POS.x + 1.6, FOREST_POS.z - 2.6],
  [FOREST_POS.x + 3.8, FOREST_POS.z + 0.8],
  [FOREST_POS.x + 0.6, FOREST_POS.z + 3.4],
]

/** 景观巨树：林缘靠岛心一侧，不可砍 */
const GRAND_TREE = { x: FOREST_POS.x + 1.8, z: FOREST_POS.z + 3.6 }

export function ForestZone() {
  const season = useGameStore((s) => s.season)
  const trees = useGameStore(
    (s) => s.trees,
    (a, b) =>
      a === b ||
      (a.length === b.length && a.every((t, i) => t.stage === b[i]!.stage)),
  )
  const look = seasonLook(season)

  return (
    <group>
      <GrandTree x={GRAND_TREE.x} z={GRAND_TREE.z} look={look} trunk={3.35} canopy={3.85} />
      {FOREST_LAYOUT.map((spot, i) => {
        const state = trees[i]
        const stage = state?.stage ?? TREE_MAX_STAGE
        if (stage <= 0) {
          return <TreeStump key={i} x={spot.x} z={spot.z} scale={spot.trunk} look={look} />
        }
        const sc = TREE_STAGE_SCALE[stage] ?? 1
        return (
          <StylizedTree
            key={i}
            x={spot.x}
            z={spot.z}
            trunk={spot.trunk * sc}
            canopy={spot.canopy * sc}
            look={look}
          />
        )
      })}
      {FOREST_BUSHES.map((b, i) => (
        <Bush key={`b${i}`} {...b} look={look} />
      ))}
      {FOREST_ROCKS.map((r, i) => (
        <Rock key={`r${i}`} {...r} snow={look.showSnow} />
      ))}
      {FOREST_GRASS.map(([x, z], i) => (
        <GrassTuft key={`g${i}`} x={x!} z={z!} scale={0.8 + (i % 3) * 0.12} look={look} />
      ))}
    </group>
  )
}
