import { MapControls, PerspectiveCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { MOUSE, TOUCH } from 'three'

/** 焦点最多离开岛心多远 */
const ISLAND_PAN_RADIUS = 8

/** 与初始相机 [18,16,18] → [0,0,0] 一致的固定俯视方位 */
const LOCKED_AZIMUTH = Math.PI / 4
const LOCKED_POLAR = Math.PI / 3

/** 在 MapControls makeDefault 之后再夹住拖动 */
function PanClamp() {
  const controls = useThree((s) => s.controls) as {
    target: { x: number; y: number; z: number }
    addEventListener: (type: string, fn: () => void) => void
    removeEventListener: (type: string, fn: () => void) => void
  } | null

  useEffect(() => {
    if (!controls) return

    const clamp = () => {
      const t = controls.target
      if (!t) return
      t.y = 0
      const r = Math.hypot(t.x, t.z)
      if (r > ISLAND_PAN_RADIUS) {
        const s = ISLAND_PAN_RADIUS / r
        t.x *= s
        t.z *= s
      }
    }

    controls.addEventListener('change', clamp)
    clamp()
    return () => controls.removeEventListener('change', clamp)
  }, [controls])

  return null
}

/** 固定俯视角：可平移、滚轮缩放，不可旋转 */
export function IsoCamera() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[18, 16, 18]} fov={40} near={0.1} far={200} />
      <MapControls
        makeDefault
        enableRotate={false}
        enableDamping
        dampingFactor={0.12}
        minAzimuthAngle={LOCKED_AZIMUTH}
        maxAzimuthAngle={LOCKED_AZIMUTH}
        minPolarAngle={LOCKED_POLAR}
        maxPolarAngle={LOCKED_POLAR}
        minDistance={12}
        maxDistance={40}
        target={[0, 0, 0]}
        mouseButtons={{
          LEFT: MOUSE.PAN,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.PAN,
        }}
        touches={{
          ONE: TOUCH.PAN,
          TWO: TOUCH.DOLLY_PAN,
        }}
      />
      <PanClamp />
    </>
  )
}
