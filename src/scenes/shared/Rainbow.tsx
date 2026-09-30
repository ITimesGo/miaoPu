import { DoubleSide } from 'three'
import { absoluteGameMinute } from '../../game/data/weather'
import { useGameStore } from '../../game/state/gameStore'

const BANDS: Array<{ color: string; radius: number }> = [
  { color: '#ff5c5c', radius: 14.0 },
  { color: '#ff9f43', radius: 13.7 },
  { color: '#ffe066', radius: 13.4 },
  { color: '#69db7c', radius: 13.1 },
  { color: '#4dabf7', radius: 12.8 },
  { color: '#5c7cfa', radius: 12.5 },
  { color: '#b197fc', radius: 12.2 },
]

/**
 * 竖直半环彩虹（torus 默认在 XY 平面 = 立着的 ∩）。
 * 朝向等距俯视相机 [18,16,18]，挂在岛外西北远空。
 */
export function Rainbow() {
  const rainbowUntil = useGameStore((s) => s.rainbowUntil)
  const day = useGameStore((s) => s.day)
  const minuteOfDay = useGameStore((s) => s.minuteOfDay)
  const nowAbs = absoluteGameMinute(day, minuteOfDay)
  const active = rainbowUntil > nowAbs
  if (!active) return null

  const hour = minuteOfDay / 60
  if (hour >= 17.5 || hour < 5.5) return null
  const opacity = hour >= 16.5 ? Math.max(0.12, 0.48 - (hour - 16.5) * 0.35) : 0.48

  return (
    <group position={[-16, 1.2, -16]} rotation={[0, Math.PI / 4, 0]}>
      {BANDS.map((b) => (
        <mesh key={b.color} renderOrder={-15}>
          <torusGeometry args={[b.radius, 0.14, 8, 72, Math.PI]} />
          <meshBasicMaterial
            color={b.color}
            transparent
            opacity={opacity}
            depthWrite={false}
            depthTest={false}
            side={DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  )
}
