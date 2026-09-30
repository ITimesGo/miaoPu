import { useGameStore } from '../../game/state/gameStore'
import { seasonLook } from '../../game/data/seasons'
import { HARBOR_POS } from '../../game/types'
import { HarborModel } from '../models/Harbor'
import { GrandTree } from '../models/Trees'

/** 港口内侧岸边巨树（不可砍） */
const HARBOR_GRAND = { x: HARBOR_POS.x - 2.6, z: HARBOR_POS.z + 1.4 }

export function HarborZone() {
  const harborLevel = useGameStore((s) => s.harbor.level)
  const boatLevel = useGameStore((s) => s.boat.level)
  const merchant = useGameStore((s) => s.gameEvent?.kind === 'merchant')
  const boatAway = useGameStore((s) => s.boatVoyage.phase === 'away')
  const season = useGameStore((s) => s.season)
  const look = seasonLook(season)

  return (
    <>
      <GrandTree x={HARBOR_GRAND.x} z={HARBOR_GRAND.z} look={look} trunk={3.05} canopy={3.45} />
      <HarborModel
        harborLevel={harborLevel}
        boatLevel={boatLevel}
        merchant={merchant}
        boatAway={boatAway}
      />
    </>
  )
}
