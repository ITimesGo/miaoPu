import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Color, type MeshStandardMaterial, type PointLight } from 'three'
import {
  COTTAGE_POS,
  cottageYaw,
  DAY_START_MINUTE,
  DOOR_STAGGER_MINUTES,
  MAX_CATS,
  NIGHT_START_MINUTE,
} from '../../game/types'
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

type TierLook = {
  wall: string
  beam: string
  roofA: string
  roofB: string
  ridge: string
  foundation: string
  scale: number
}

function tierLook(level: number): TierLook {
  const lv = Math.max(1, Math.min(8, level))
  const looks: TierLook[] = [
    {
      wall: '#e8dcc4',
      beam: '#7a4e32',
      roofA: '#b8483a',
      roofB: '#a03a30',
      ridge: '#7a2e26',
      foundation: '#8e8a80',
      scale: 0.96,
    },
    {
      wall: '#f0e4cc',
      beam: '#8b5a3c',
      roofA: '#c44b3c',
      roofB: '#b03f32',
      ridge: '#8a3228',
      foundation: '#9a968c',
      scale: 1.0,
    },
    {
      wall: '#f4ead4',
      beam: '#945f40',
      roofA: '#d05444',
      roofB: '#bc4438',
      ridge: '#943830',
      foundation: '#a8a098',
      scale: 1.05,
    },
    {
      wall: '#f7efdc',
      beam: '#a06848',
      roofA: '#dc6454',
      roofB: '#c85042',
      ridge: '#a04038',
      foundation: '#b0aaa0',
      scale: 1.1,
    },
    {
      wall: '#faf3e4',
      beam: '#b07850',
      roofA: '#e87060',
      roofB: '#d45848',
      ridge: '#b04840',
      foundation: '#b8b2a8',
      scale: 1.14,
    },
    {
      wall: '#fcf6ea',
      beam: '#b88458',
      roofA: '#f07868',
      roofB: '#e06050',
      ridge: '#c05048',
      foundation: '#c0bab0',
      scale: 1.18,
    },
    {
      wall: '#fffaf0',
      beam: '#c09060',
      roofA: '#f88878',
      roofB: '#e87060',
      ridge: '#d05850',
      foundation: '#c8c2b8',
      scale: 1.22,
    },
    {
      wall: '#fffdf8',
      beam: '#c89868',
      roofA: '#ff9888',
      roofB: '#f08070',
      ridge: '#e06058',
      foundation: '#d0cac0',
      scale: 1.26,
    },
  ]
  return looks[lv - 1]!
}

export function CottageModel() {
  const yaw = cottageYaw()
  const level = useGameStore((s) => s.cottage.level)
  const doorOpen = useGameStore((s) => {
    const m = s.minuteOfDay
    const morningExitEnd = DAY_START_MINUTE + MAX_CATS * DOOR_STAGGER_MINUTES
    return m >= NIGHT_START_MINUTE || m < morningExitEnd
  })
  const look = tierLook(level)
  const lv = Math.max(1, Math.min(8, level))

  return (
    <group
      position={[COTTAGE_POS.x, 0, COTTAGE_POS.z]}
      rotation={[0, yaw, 0]}
      scale={look.scale}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0.2]} receiveShadow>
        <planeGeometry args={[5.2 + lv * 0.15, 5 + lv * 0.12]} />
        <meshStandardMaterial color={lv >= 4 ? '#6f9658' : '#7a9e62'} roughness={1} />
      </mesh>

      <RoundedBox
        args={[3.6 + (lv >= 4 ? 0.25 : 0), 0.35 + (lv >= 3 ? 0.06 : 0), 3.2]}
        radius={0.04}
        position={[0, 0.18, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={look.foundation} roughness={0.95} />
      </RoundedBox>

      {/* 石砌勒脚（Lv2+） */}
      {lv >= 2 && (
        <>
          {[
            [0, 0.42, -1.52, 3.5, 0.22, 0.14],
            [0, 0.42, 1.52, 3.5, 0.22, 0.14],
            [-1.72, 0.42, 0, 0.14, 0.22, 3.0],
            [1.72, 0.42, 0, 0.14, 0.22, 3.0],
          ].map(([x, y, z, w, h, d], i) => (
            <mesh key={`plinth${i}`} position={[x!, y!, z!]} castShadow>
              <boxGeometry args={[w!, h!, d!]} />
              <meshStandardMaterial color="#7a7670" roughness={0.92} />
            </mesh>
          ))}
        </>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.37, 0]} receiveShadow>
        <planeGeometry args={[3.1, 2.75]} />
        <meshStandardMaterial color={lv >= 3 ? '#d4b888' : '#c8a878'} roughness={0.9} />
      </mesh>

      <RoundedBox args={[3.4, 2.1, 0.2]} radius={0.04} position={[0, 1.25, -1.4]} castShadow receiveShadow>
        <meshStandardMaterial color={look.wall} roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[0.2, 2.1, 2.8]} radius={0.04} position={[-1.6, 1.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={look.wall} roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[0.2, 2.1, 2.8]} radius={0.04} position={[1.6, 1.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={look.wall} roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[1.15, 2.1, 0.2]} radius={0.04} position={[-1.12, 1.25, 1.4]} castShadow receiveShadow>
        <meshStandardMaterial color={look.wall} roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[1.15, 2.1, 0.2]} radius={0.04} position={[1.12, 1.25, 1.4]} castShadow receiveShadow>
        <meshStandardMaterial color={look.wall} roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[1.0, 0.7, 0.2]} radius={0.04} position={[0, 1.95, 1.4]} castShadow receiveShadow>
        <meshStandardMaterial color={look.wall} roughness={0.72} />
      </RoundedBox>

      <mesh position={[-1.72, 1.25, 0]} castShadow>
        <boxGeometry args={[0.12, 2.1, 3.05]} />
        <meshStandardMaterial color={look.beam} roughness={0.8} />
      </mesh>
      <mesh position={[1.72, 1.25, 0]} castShadow>
        <boxGeometry args={[0.12, 2.1, 3.05]} />
        <meshStandardMaterial color={look.beam} roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[3.5, 0.12, 3.1]} />
        <meshStandardMaterial color={look.beam} roughness={0.8} />
      </mesh>

      {/* 半木构装饰条（Lv3+） */}
      {lv >= 3 &&
        [-0.7, 0.7].map((ox) => (
          <mesh key={`beam${ox}`} position={[ox, 1.55, 1.51]} castShadow>
            <boxGeometry args={[0.08, 1.4, 0.06]} />
            <meshStandardMaterial color={look.beam} roughness={0.78} />
          </mesh>
        ))}

      <mesh position={[0, 2.55, 0]} castShadow>
        <boxGeometry args={[3.9, 0.18, 3.5]} />
        <meshStandardMaterial color="#7a3a2c" roughness={0.7} />
      </mesh>
      <mesh position={[0, 3.15, 0]} rotation={[0, 0, 0.42]} castShadow>
        <boxGeometry args={[2.4, 0.14, 3.6]} />
        <meshStandardMaterial color={look.roofA} roughness={0.62} />
      </mesh>
      <mesh position={[0, 3.15, 0]} rotation={[0, 0, -0.42]} castShadow>
        <boxGeometry args={[2.4, 0.14, 3.6]} />
        <meshStandardMaterial color={look.roofB} roughness={0.62} />
      </mesh>
      <mesh position={[0, 3.55, 0]} castShadow>
        <boxGeometry args={[0.2, 0.16, 3.7]} />
        <meshStandardMaterial color={look.ridge} roughness={0.55} metalness={lv >= 4 ? 0.15 : 0} />
      </mesh>

      {/* 瓦垄暗示（Lv4+） */}
      {lv >= 4 &&
        [-1.1, -0.55, 0, 0.55, 1.1].map((ox, i) => (
          <mesh
            key={`tile${i}`}
            position={[ox * 0.55, 3.22 + Math.abs(ox) * 0.08, 0]}
            rotation={[0, 0, ox >= 0 ? -0.42 : 0.42]}
            castShadow
          >
            <boxGeometry args={[0.12, 0.04, 3.4]} />
            <meshStandardMaterial color={i % 2 ? look.roofA : look.roofB} roughness={0.55} />
          </mesh>
        ))}

      <group position={[1.1, 3.5, -0.6]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 1.1 + (lv >= 3 ? 0.2 : 0), 0.55]} />
          <meshStandardMaterial color="#8f8a82" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.6 + (lv >= 3 ? 0.1 : 0), 0]} castShadow>
          <boxGeometry args={[0.68, 0.16, 0.68]} />
          <meshStandardMaterial color="#6e6962" roughness={0.9} />
        </mesh>
        {lv >= 5 && (
          <mesh position={[0, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.35, 8]} />
            <meshStandardMaterial color="#c9a227" metalness={0.45} roughness={0.35} />
          </mesh>
        )}
      </group>

      {/* 第二烟囱（Lv4+） */}
      {lv >= 4 && (
        <group position={[-1.0, 3.45, -0.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.42, 0.85, 0.42]} />
            <meshStandardMaterial color="#8f8a82" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.52, 0.12, 0.52]} />
            <meshStandardMaterial color="#6e6962" />
          </mesh>
        </group>
      )}

      {/* 老虎窗（Lv3+） */}
      {lv >= 3 && (
        <group position={[0, 3.05, 1.55]}>
          <mesh castShadow>
            <boxGeometry args={[0.85, 0.55, 0.55]} />
            <meshStandardMaterial color={look.wall} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.35, 0]} rotation={[0, 0, 0]} castShadow>
            <coneGeometry args={[0.6, 0.4, 4]} />
            <meshStandardMaterial color={look.roofA} roughness={0.65} />
          </mesh>
          <Window x={0} y={0.05} z={0.28} size={0.45} />
        </group>
      )}

      <RoundedBox
        args={[2.2 + (lv >= 2 ? 0.3 : 0), 0.14, 1.1 + (lv >= 4 ? 0.2 : 0)]}
        radius={0.03}
        position={[0, 0.28, 1.85]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={lv >= 3 ? '#b08858' : '#a07850'} roughness={0.85} />
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

      {/* 门廊栏杆（Lv2+） */}
      {lv >= 2 && (
        <>
          <mesh position={[-1.05, 0.85, 2.35]} castShadow>
            <boxGeometry args={[0.06, 0.9, 0.06]} />
            <meshStandardMaterial color={look.beam} />
          </mesh>
          <mesh position={[1.05, 0.85, 2.35]} castShadow>
            <boxGeometry args={[0.06, 0.9, 0.06]} />
            <meshStandardMaterial color={look.beam} />
          </mesh>
          <mesh position={[0, 1.25, 2.35]} castShadow>
            <boxGeometry args={[2.1, 0.06, 0.06]} />
            <meshStandardMaterial color={look.beam} />
          </mesh>
        </>
      )}

      {/* 门廊灯笼（Lv4+） */}
      {lv >= 4 && (
        <group position={[0, 1.55, 2.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.2, 8]} />
            <meshStandardMaterial color="#c9a227" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.18, 0]}>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshStandardMaterial
              color="#fff0c8"
              emissive="#ffb060"
              emissiveIntensity={0.35}
              transparent
              opacity={0.9}
            />
          </mesh>
        </group>
      )}

      <InteriorGlow bright={lv >= 3} />

      <group position={[-0.36, 0.95, 1.5]} rotation={[0, doorOpen ? -1.35 : 0, 0]}>
        <RoundedBox args={[0.72, 1.35, 0.1]} radius={0.04} position={[0.36, 0, 0]} castShadow>
          <meshStandardMaterial color={lv >= 3 ? '#7a4a30' : '#6b3f28'} roughness={0.68} />
        </RoundedBox>
        <mesh position={[0.58, 0, 0.06]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial
            color="#d4af37"
            metalness={lv >= 2 ? 0.75 : 0.55}
            roughness={0.3}
          />
        </mesh>
        {lv >= 4 && (
          <mesh position={[0.36, 0.35, 0.06]} castShadow>
            <boxGeometry args={[0.35, 0.45, 0.04]} />
            <meshStandardMaterial color="#5a3220" roughness={0.75} />
          </mesh>
        )}
      </group>

      <Window x={-1.05} y={1.35} z={1.52} shutter={lv >= 2} />
      <Window x={1.05} y={1.35} z={1.52} shutter={lv >= 2} />
      <Window x={-1.72} y={1.35} z={0} rotY={Math.PI / 2} shutter={lv >= 3} />
      <Window x={1.72} y={1.35} z={0} rotY={-Math.PI / 2} shutter={lv >= 3} />

      <FlowerBox x={-1.05} z={1.7} fancy={lv >= 2} />
      <FlowerBox x={1.05} z={1.7} fancy={lv >= 2} />
      {lv >= 3 && <FlowerBox x={-1.9} z={0.6} fancy />}
      {lv >= 3 && <FlowerBox x={1.9} z={0.6} fancy />}

      {/* 小篱笆（Lv5） */}
      {lv >= 5 && (
        <group position={[0, 0.25, 2.9]}>
          {[-1.6, -0.8, 0, 0.8, 1.6].map((ox, i) => (
            <mesh key={`fence${i}`} position={[ox, 0.2, 0]} castShadow>
              <boxGeometry args={[0.08, 0.55, 0.08]} />
              <meshStandardMaterial color="#8a6238" />
            </mesh>
          ))}
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[3.4, 0.06, 0.06]} />
            <meshStandardMaterial color="#9a7040" />
          </mesh>
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[3.4, 0.05, 0.05]} />
            <meshStandardMaterial color="#9a7040" />
          </mesh>
        </group>
      )}

      {/* 风向标（Lv5） */}
      {lv >= 5 && (
        <group position={[0, 3.85, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.035, 0.45, 6]} />
            <meshStandardMaterial color="#c9a227" metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0.18, 0.12, 0]} rotation={[0, 0, -0.3]} castShadow>
            <boxGeometry args={[0.35, 0.08, 0.04]} />
            <meshStandardMaterial color="#e8c040" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* 门廊灯笼（Lv6） */}
      {lv >= 6 && (
        <group position={[0, 2.15, 1.55]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.07, 0.18, 8]} />
            <meshStandardMaterial color="#c9a227" metalness={0.35} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial
              color="#ffe8a0"
              emissive="#ffcc66"
              emissiveIntensity={0.35}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      )}

      {/* 侧翼棚（Lv7） */}
      {lv >= 7 && (
        <group position={[2.35, 1.1, 0.2]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.1, 0.08, 1.6]} />
            <meshStandardMaterial color={look.roofA} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.45, 0.7]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.9, 6]} />
            <meshStandardMaterial color={look.beam} />
          </mesh>
          <mesh position={[0, -0.45, -0.7]} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.9, 6]} />
            <meshStandardMaterial color={look.beam} />
          </mesh>
        </group>
      )}

      {/* 屋顶旗杆（Lv8） */}
      {lv >= 8 && (
        <group position={[1.1, 3.7, 0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.025, 0.03, 0.7, 6]} />
            <meshStandardMaterial color="#8a6238" />
          </mesh>
          <mesh position={[0.22, 0.2, 0]} castShadow>
            <boxGeometry args={[0.4, 0.22, 0.03]} />
            <meshStandardMaterial color="#e85a4a" />
          </mesh>
        </group>
      )}
    </group>
  )
}

function InteriorGlow({ bright = false }: { bright?: boolean }) {
  const lightRef = useRef<PointLight>(null)
  const matRef = useRef<MeshStandardMaterial>(null)
  const amount = useRef(0)

  useFrame((_, delta) => {
    const target = windowLitAmount(useGameStore.getState().minuteOfDay)
    amount.current += (target - amount.current) * (1 - Math.exp(-delta * 3.5))
    const a = amount.current
    const boost = bright ? 1.2 : 1
    if (lightRef.current) {
      lightRef.current.intensity = 2.6 * a * boost
      lightRef.current.visible = a > 0.01
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = 1.4 * a * boost
      matRef.current.opacity = Math.max(0.15, a)
      matRef.current.visible = a > 0.01
    }
  })

  return (
    <>
      <pointLight
        ref={lightRef}
        position={[0, 1.5, 0.15]}
        color="#ffc070"
        intensity={0}
        distance={bright ? 9 : 8}
        decay={2}
      />
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
  size = 0.7,
  shutter = false,
}: {
  x: number
  y: number
  z: number
  rotY?: number
  size?: number
  shutter?: boolean
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

  const frame = size + 0.12

  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <mesh>
        <boxGeometry args={[size, size, 0.08]} />
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
        <boxGeometry args={[0.05, size, 0.04]} />
        <meshStandardMaterial color="#f5efe4" />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[size, 0.05, 0.04]} />
        <meshStandardMaterial color="#f5efe4" />
      </mesh>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[frame, frame, 0.06]} />
        <meshStandardMaterial color="#8b5a3c" roughness={0.8} />
      </mesh>
      {shutter && (
        <>
          <mesh position={[-size * 0.55, 0, 0.05]} castShadow>
            <boxGeometry args={[0.14, size * 0.95, 0.04]} />
            <meshStandardMaterial color="#a05040" roughness={0.7} />
          </mesh>
          <mesh position={[size * 0.55, 0, 0.05]} castShadow>
            <boxGeometry args={[0.14, size * 0.95, 0.04]} />
            <meshStandardMaterial color="#a05040" roughness={0.7} />
          </mesh>
        </>
      )}
    </group>
  )
}

function FlowerBox({ x, z, fancy = false }: { x: number; z: number; fancy?: boolean }) {
  return (
    <group position={[x, 0.55, z]}>
      <mesh castShadow>
        <boxGeometry args={[fancy ? 0.85 : 0.75, 0.22, 0.28]} />
        <meshStandardMaterial color={fancy ? '#7a5030' : '#6e4428'} roughness={0.85} />
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
      {fancy && (
        <mesh position={[-0.05, 0.24, 0.05]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#7ec87a" roughness={0.55} />
        </mesh>
      )}
    </group>
  )
}
