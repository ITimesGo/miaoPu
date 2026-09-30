import { RoundedBox } from '@react-three/drei'
import { useGameStore } from '../../game/state/gameStore'
import { GRANARY_POS, granaryYaw } from '../../game/types'

export function GranaryZone() {
  const level = useGameStore((s) => s.granary.level)
  const condition = useGameStore((s) => s.granary.condition)

  if (level <= 0) return null

  const scale = 0.85 + level * 0.08
  const wood = condition < 40 ? '#6a5040' : '#a07848'
  const roof = condition < 40 ? '#7a5048' : '#c44b3c'
  const yaw = granaryYaw()

  return (
    <group position={[GRANARY_POS.x, 0, GRANARY_POS.z]} rotation={[0, yaw, 0]} scale={scale}>
      {/* 地基 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.15]} receiveShadow>
        <planeGeometry args={[2.8, 2.6]} />
        <meshStandardMaterial color="#6a8a55" roughness={1} />
      </mesh>

      <RoundedBox args={[2.2, 1.6, 1.8]} radius={0.06} position={[0, 0.9, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={wood} roughness={0.85} />
      </RoundedBox>
      <mesh position={[0, 1.95, 0]} castShadow>
        <coneGeometry args={[1.6, 0.9, 4]} />
        <meshStandardMaterial color={roof} roughness={0.7} />
      </mesh>

      {/* 门口朝局部 +Z（经 yaw 后朝向麦田） */}
      <mesh position={[0, 0.7, 0.92]} castShadow>
        <boxGeometry args={[0.55, 0.7, 0.08]} />
        <meshStandardMaterial color="#5c4030" />
      </mesh>
      <mesh position={[0, 0.55, 1.15]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.08, 0.45]} />
        <meshStandardMaterial color="#8a6a40" roughness={0.9} />
      </mesh>

      {/* level markers — 挂在门楣上方 */}
      {Array.from({ length: level }, (_, i) => (
        <mesh key={i} position={[-0.85 + i * 0.35, 1.5, 0.95]}>
          <boxGeometry args={[0.2, 0.12, 0.06]} />
          <meshStandardMaterial color="#f0d78c" />
        </mesh>
      ))}
    </group>
  )
}
