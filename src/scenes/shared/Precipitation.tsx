import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three'
import { useGameStore } from '../../game/state/gameStore'

const COUNT = 220

/** 整片下落，不逐粒改顶点。 */
export function Precipitation() {
  const points = useRef<Points>(null)
  const weather = useGameStore((s) => s.weather)
  const drop = useRef(0)

  const geometry = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 28
      pos[i * 3 + 1] = Math.random() * 14
      pos[i * 3 + 2] = (Math.random() - 0.5) * 28
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    return geo
  }, [])

  useFrame((_, dt) => {
    const pts = points.current
    if (!pts) return
    const kind = useGameStore.getState().weather
    const snow = kind === 'snow'
    const on = kind === 'rain' || snow
    pts.visible = on
    if (!on) return

    const mat = pts.material as PointsMaterial
    if (mat.userData.kind !== kind) {
      mat.userData.kind = kind
      mat.size = snow ? 0.13 : 0.045
      mat.color.set(snow ? '#f7fbff' : '#b7d4ee')
      mat.opacity = snow ? 0.88 : 0.55
    }

    const span = 14
    const speed = snow ? 1.2 : 8
    drop.current = (drop.current + speed * Math.min(dt, 0.05)) % span
    pts.position.y = -drop.current
    pts.position.x = snow ? Math.sin(drop.current * 0.35) * 0.6 : drop.current * 0.15
  })

  return (
    <points ref={points} geometry={geometry} visible={weather !== 'clear'} frustumCulled={false}>
      <pointsMaterial
        color={weather === 'snow' ? '#f7fbff' : '#b7d4ee'}
        size={weather === 'snow' ? 0.14 : 0.045}
        transparent
        opacity={0.7}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
