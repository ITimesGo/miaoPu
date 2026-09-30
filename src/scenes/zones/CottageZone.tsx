import { useGameStore } from '../../game/state/gameStore'
import { seasonLook } from '../../game/data/seasons'
import { cottageLocalToWorld } from '../../game/types'
import { CottageModel } from '../models/Cottage'
import { GrandTree } from '../models/Trees'

/** 小屋左侧墙外（面朝门口时的左边，靠池塘一侧），不可砍 */
const COTTAGE_GRAND = cottageLocalToWorld(-3.45, 0.35)

export function CottageZone() {
  const season = useGameStore((s) => s.season)
  const look = seasonLook(season)

  return (
    <>
      <GrandTree x={COTTAGE_GRAND.x} z={COTTAGE_GRAND.z} look={look} trunk={2.95} canopy={3.35} />
      <CottageModel />
    </>
  )
}
