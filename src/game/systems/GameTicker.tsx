import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../../game/state/gameStore'

/** Drive game clock from the render loop. */
export function GameTicker() {
  useFrame((_, delta) => {
    useGameStore.getState().tick(delta)
  })
  return null
}
