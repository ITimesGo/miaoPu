import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, type MeshStandardMaterial, type PointLight } from 'three'
import { COTTAGE_POS, cottageYaw, DAY_START_MINUTE, DOOR_STAGGER_MINUTES, MAX_CATS, NIGHT_START_MINUTE } from '../../game/types'
import { useGameStore } from '../../game/state/gameStore'

/** 窗光 0..1：19:30 渐亮，20:00 满亮；0:30 渐灭，1:00 熄灭 */
function windowLitAmount(minuteOfDay: number): number {
  const m = ((minuteOfDay % 1440) + 1440) % 1440
  if (m >= 20 * 60 && m < 24 * 60) {
    return Math.min(1, (m - 19.5 * 60) / 30)
  }
  if (m < 1 * 60) {
    return Math.max(0, 1 - (m - 0.5 * 60) / 30)
  }
  if (m >= 19.5 * 60) {
    return Math.min(1, (m - 19.5 * 60) / 30)
  }
  return 0
}

export function CottageModel() {
  const yaw = cottageYaw()
  const doorOpen = useGameStore((s) => {
    const m = s.minuteOfDay
    // 夜间睡觉 + 清晨错峰出门期间保持开门
    const morningExitEnd = DAY_START_MINUTE + MAX_CATS * DOOR_STAGGER_MINUTES
    return m >= NIGHT_START_MINUTE || m < morningExitEnd
  })

  return (
    <group position={[COTTAGE_POS.x, 0, COTTAGE_POS.z]} rotation={[0, yaw, 0]}>
      {/* yard */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0.2]} receiveShadow>
        <planeGeometry args={[5.2, 5]} />
        <meshStandardMaterial color="#7a9e62" roughness={1} />
      </mesh>

      {/* stone foundation */}
      <RoundedBox args={[3.6, 0.35, 3.2]} radius={0.04} position={[0, 0.18, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#9a968c" roughness={0.95} />
      </RoundedBox>

      {/* interior floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.37, 0]} receiveShadow>
        <planeGeometry args={[3.1, 2.75]} />
        <meshStandardMaterial color="#c8a878" roughness={0.9} />
      </mesh>

      {/* hollow walls — front has a door gap so cats can sleep inside */}
      <RoundedBox args={[3.4, 2.1, 0.2]} radius={0.04} position={[0, 1.25, -1.4]} castShadow receiveShadow>
        <meshStandardMaterial color="#f2e4cc" roughness={0.75} />
      </RoundedBox>
      <RoundedBox args={[0.2, 2.1, 2.8]} radius={0.04} position={[-1.6, 1.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f2e4cc" roughness={0.75} />
      </RoundedBox>
      <RoundedBox args={[0.2, 2.1, 2.8]} radius={0.04} position={[1.6, 1.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f2e4cc" roughness={0.75} />
      </RoundedBox>
      <RoundedBox args={[1.15, 2.1, 0.2]} radius={0.04} position={[-1.12, 1.25, 1.4]} castShadow receiveShadow>
        <meshStandardMaterial color="#f2e4cc" roughness={0.75} />
      </RoundedBox>
      <RoundedBox args={[1.15, 2.1, 0.2]} radius={0.04} position={[1.12, 1.25, 1.4]} castShadow receiveShadow>
        <meshStandardMaterial color="#f2e4cc" roughness={0.75} />
      </RoundedBox>
      <RoundedBox args={[1.0, 0.7, 0.2]} radius={0.04} position={[0, 1.95, 1.4]} castShadow receiveShadow>
        <meshStandardMaterial color="#f2e4cc" roughness={0.75} />
      </RoundedBox>

      {/* timber beams */}
      <mesh position={[-1.72, 1.25, 0]} castShadow>
        <boxGeometry args={[0.12, 2.1, 3.05]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.8} />
      </mesh>
      <mesh position={[1.72, 1.25, 0]} castShadow>
        <boxGeometry args={[0.12, 2.1, 3.05]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[3.5, 0.12, 3.1]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.8} />
      </mesh>

      {/* roof base */}
      <mesh position={[0, 2.55, 0]} castShadow>
        <boxGeometry args={[3.9, 0.18, 3.5]} />
        <meshStandardMaterial color="#7a3a2c" roughness={0.7} />
      </mesh>
      {/* pitched roof left / right */}
      <mesh position={[0, 3.15, 0]} rotation={[0, 0, 0.42]} castShadow>
        <boxGeometry args={[2.4, 0.14, 3.6]} />
        <meshStandardMaterial color="#c44b3c" roughness={0.65} />
      </mesh>
      <mesh position={[0, 3.15, 0]} rotation={[0, 0, -0.42]} castShadow>
        <boxGeometry args={[2.4, 0.14, 3.6]} />
        <meshStandardMaterial color="#b03f32" roughness={0.65} />
      </mesh>
      {/* ridge */}
      <mesh position={[0, 3.55, 0]} castShadow>
        <boxGeometry args={[0.2, 0.16, 3.7]} />
        <meshStandardMaterial color="#8a3228" roughness={0.6} />
      </mesh>

      {/* chimney */}
      <group position={[1.1, 3.5, -0.6]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 1.1, 0.55]} />
          <meshStandardMaterial color="#8f8a82" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.68, 0.16, 0.68]} />
          <meshStandardMaterial color="#6e6962" roughness={0.9} />
        </mesh>
      </group>

      {/* porch */}
      <RoundedBox args={[2.2, 0.14, 1.1]} radius={0.03} position={[0, 0.28, 1.85]} castShadow receiveShadow>
        <meshStandardMaterial color="#a07850" roughness={0.85} />
      </RoundedBox>
      <mesh position={[-0.85, 1.0, 2.25]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 1.5, 8]} />
        <meshStandardMaterial color="#6e4428" />
      </mesh>
      <mesh position={[0.85, 1.0, 2.25]} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 1.5, 8]} />
        <meshStandardMaterial color="#6e4428" />
      </mesh>
      <mesh position={[0, 1.75, 2.1]} castShadow>
        <boxGeometry args={[2.2, 0.1, 0.9]} />
        <meshStandardMaterial color="#9a5a3c" roughness={0.75} />
      </mesh>

      {/* 前半夜暖光（渐亮/渐灭），后半夜熄灭 */}
      <InteriorGlow />

      {/* door — swings open at night so cats can be seen sleeping inside */}
      <group position={[-0.36, 0.95, 1.5]} rotation={[0, doorOpen ? -1.35 : 0, 0]}>
        <RoundedBox args={[0.72, 1.35, 0.1]} radius={0.04} position={[0.36, 0, 0]} castShadow>
          <meshStandardMaterial color="#6b3f28" roughness={0.7} />
        </RoundedBox>
        <mesh position={[0.58, 0, 0.06]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* windows */}
      <Window x={-1.05} y={1.35} z={1.52} />
      <Window x={1.05} y={1.35} z={1.52} />
      <Window x={-1.72} y={1.35} z={0} rotY={Math.PI / 2} />
      <Window x={1.72} y={1.35} z={0} rotY={-Math.PI / 2} />

      {/* flower boxes */}
      <FlowerBox x={-1.05} z={1.7} />
      <FlowerBox x={1.05} z={1.7} />
    </group>
  )
}

function InteriorGlow() {
  const lightRef = useRef<PointLight>(null)
  const matRef = useRef<MeshStandardMaterial>(null)
  const amount = useRef(0)

  useFrame((_, delta) => {
    const target = windowLitAmount(useGameStore.getState().minuteOfDay)
    amount.current += (target - amount.current) * (1 - Math.exp(-delta * 3.5))
    const a = amount.current
    if (lightRef.current) {
      lightRef.current.intensity = 2.6 * a
      lightRef.current.visible = a > 0.01
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = 1.4 * a
      matRef.current.opacity = Math.max(0.15, a)
      matRef.current.visible = a > 0.01
    }
  })

  return (
    <>
      <pointLight ref={lightRef} position={[0, 1.5, 0.15]} color="#ffc070" intensity={0} distance={8} decay={2} />
      <mesh position={[0, 2.05, 0.05]}>
        <sphereGeometry args={[0.07, 12, 10]} />
        <meshStandardMaterial
          ref={matRef}
          color="#fff6d8"
          emissive="#ffb040"
          emissiveIntensity={0}
          transparent
        />
      </mesh>
    </>
  )
}

function Window({
  x,
  y,
  z,
  rotY = 0,
}: {
  x: number
  y: number
  z: number
  rotY?: number
}) {
  const glassRef = useRef<MeshStandardMaterial>(null)
  const amount = useRef(0)
  const litColor = useRef(new Color('#ffe6b0'))
  const dayColor = useRef(new Color('#7ec8e8'))
  const litEmissive = useRef(new Color('#ffb040'))
  const dayEmissive = useRef(new Color('#1a4060'))
  const tmp = useRef(new Color())

  useFrame((_, delta) => {
    const target = windowLitAmount(useGameStore.getState().minuteOfDay)
    amount.current += (target - amount.current) * (1 - Math.exp(-delta * 3.5))
    const mat = glassRef.current
    if (!mat) return
    const a = amount.current
    mat.color.copy(tmp.current.copy(dayColor.current).lerp(litColor.current, a))
    mat.emissive.copy(tmp.current.copy(dayEmissive.current).lerp(litEmissive.current, a))
    mat.emissiveIntensity = 0.15 + a * 0.75
  })

  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <mesh>
        <boxGeometry args={[0.7, 0.7, 0.08]} />
        <meshStandardMaterial
          ref={glassRef}
          color="#7ec8e8"
          emissive="#1a4060"
          emissiveIntensity={0.15}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.06, 0.7, 0.04]} />
        <meshStandardMaterial color="#f5efe4" />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.7, 0.06, 0.04]} />
        <meshStandardMaterial color="#f5efe4" />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[0.82, 0.82, 0.06]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.8} />
      </mesh>
    </group>
  )
}

function FlowerBox({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.55, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.75, 0.22, 0.28]} />
        <meshStandardMaterial color="#6e4428" roughness={0.85} />
      </mesh>
      <mesh position={[-0.18, 0.2, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#e85d7a" roughness={0.6} />
      </mesh>
      <mesh position={[0.05, 0.22, 0.02]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#f0c040" roughness={0.6} />
      </mesh>
      <mesh position={[0.22, 0.18, -0.02]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#d94f6a" roughness={0.6} />
      </mesh>
    </group>
  )
}
