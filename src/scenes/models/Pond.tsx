import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Shape, ShapeGeometry, type Group, type Mesh } from 'three'
import { seasonLook } from '../../game/data/seasons'
import { useGameStore } from '../../game/state/gameStore'
import { POND_POS } from '../../game/types'

type FishSpec = {
  orbitA: number
  orbitB: number
  speed: number
  phase: number
  y: number
  scale: number
  color: string
  belly: string
  stripe?: string
}

/** Irregular closed outline (XZ plane → Shape in XY, then rotated flat). */
function makePondShape(radius: number, seed: number, lobes = 14): Shape {
  const shape = new Shape()
  for (let i = 0; i <= lobes; i++) {
    const t = (i / lobes) * Math.PI * 2
    // organic radius wobble — not a circle
    const wobble =
      0.78 +
      0.16 * Math.sin(t * 2 + seed) +
      0.12 * Math.cos(t * 3 - seed * 1.3) +
      0.08 * Math.sin(t * 5 + seed * 0.7) +
      0.05 * Math.cos(t * 7 + seed * 2.1)
    const indent = i % 5 === 2 ? 0.88 : i % 4 === 1 ? 1.08 : 1
    const r = radius * wobble * indent
    const x = Math.cos(t) * r
    const y = Math.sin(t) * r * 0.82 // slightly squashed
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function PondPlate({
  radius,
  seed,
  y,
  color,
  opacity = 1,
  metalness = 0,
  roughness = 1,
  receiveShadow = false,
}: {
  radius: number
  seed: number
  y: number
  color: string
  opacity?: number
  metalness?: number
  roughness?: number
  receiveShadow?: boolean
}) {
  const geom = useMemo(() => {
    const g = new ShapeGeometry(makePondShape(radius, seed, 16))
    g.rotateX(-Math.PI / 2)
    return g
  }, [radius, seed])

  return (
    <mesh geometry={geom} position={[0, y, 0]} receiveShadow={receiveShadow}>
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  )
}

function Fish({ spec }: { spec: FishSpec }) {
  const root = useRef<Group>(null)
  const tail = useRef<Group>(null)
  const finL = useRef<Mesh>(null)
  const finR = useRef<Mesh>(null)

  useFrame((state) => {
    const g = root.current
    if (!g) return
    const t = state.clock.elapsedTime * spec.speed + spec.phase
    const x = Math.cos(t) * spec.orbitA
    const z = Math.sin(t) * spec.orbitB
    const tx = -Math.sin(t) * spec.orbitA * Math.sign(spec.speed || 1)
    const tz = Math.cos(t) * spec.orbitB * Math.sign(spec.speed || 1)
    g.position.set(x, spec.y + Math.sin(t * 2.4) * 0.012, z)
    g.rotation.y = Math.atan2(tx, tz)
    g.rotation.z = Math.sin(t * 2.8) * 0.1
    g.rotation.x = Math.sin(t * 2.1) * 0.06

    const wag = Math.sin(state.clock.elapsedTime * 14 + spec.phase) * 0.45
    if (tail.current) tail.current.rotation.y = wag
    if (finL.current) finL.current.rotation.z = 0.5 + Math.sin(state.clock.elapsedTime * 9 + spec.phase) * 0.25
    if (finR.current) finR.current.rotation.z = -0.5 - Math.sin(state.clock.elapsedTime * 9 + spec.phase) * 0.25
  })

  return (
    <group ref={root} scale={spec.scale}>
      <mesh position={[0, 0, 0.02]} scale={[0.55, 0.62, 1.15]} castShadow>
        <sphereGeometry args={[0.11, 12, 10]} />
        <meshStandardMaterial color={spec.color} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.025, 0.04]} scale={[0.42, 0.35, 0.95]} castShadow>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color={spec.belly} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.01, 0.16]} scale={[0.48, 0.52, 0.55]} castShadow>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color={spec.color} roughness={0.38} />
      </mesh>
      <mesh position={[0, -0.005, 0.22]} scale={[0.3, 0.28, 0.35]} castShadow>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshStandardMaterial color={spec.belly} roughness={0.45} />
      </mesh>
      <mesh position={[0.045, 0.035, 0.19]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#1a1814" />
      </mesh>
      <mesh position={[-0.045, 0.035, 0.19]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#1a1814" />
      </mesh>
      <mesh position={[0.052, 0.042, 0.2]}>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.038, 0.042, 0.2]}>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {spec.stripe &&
        [-0.02, 0.04, 0.1].map((oz, i) => (
          <mesh key={i} position={[0.04, 0.01, oz]} scale={[0.08, 0.2, 0.12]} castShadow>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color={spec.stripe} roughness={0.45} />
          </mesh>
        ))}
      <mesh position={[0, 0.075, 0.02]} rotation={[0.15, 0, 0]} castShadow>
        <coneGeometry args={[0.04, 0.1, 4]} />
        <meshStandardMaterial color={spec.stripe ?? spec.belly} roughness={0.5} />
      </mesh>
      <mesh ref={finL} position={[0.07, 0, 0.06]} rotation={[0.2, 0.3, 0.55]} castShadow>
        <coneGeometry args={[0.035, 0.08, 3]} />
        <meshStandardMaterial color={spec.belly} roughness={0.5} />
      </mesh>
      <mesh ref={finR} position={[-0.07, 0, 0.06]} rotation={[0.2, -0.3, -0.55]} castShadow>
        <coneGeometry args={[0.035, 0.08, 3]} />
        <meshStandardMaterial color={spec.belly} roughness={0.5} />
      </mesh>
      <group ref={tail} position={[0, 0, -0.1]}>
        <mesh position={[0, 0, -0.02]} scale={[0.35, 0.4, 0.45]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={spec.color} roughness={0.42} />
        </mesh>
        <mesh position={[0.04, 0, -0.1]} rotation={[0, 0, 0.55]} castShadow>
          <coneGeometry args={[0.055, 0.11, 3]} />
          <meshStandardMaterial color={spec.color} roughness={0.45} />
        </mesh>
        <mesh position={[-0.04, 0, -0.1]} rotation={[0, 0, -0.55]} castShadow>
          <coneGeometry args={[0.055, 0.11, 3]} />
          <meshStandardMaterial color={spec.color} roughness={0.45} />
        </mesh>
      </group>
    </group>
  )
}

export function PondModel() {
  const season = useGameStore((s) => s.season)
  const look = seasonLook(season)
  const water = look.showSnow ? '#7aa0b8' : look.waterShallow
  const deep = look.showSnow ? '#4a6888' : look.waterDeep

  const fish = useMemo<FishSpec[]>(
    () => [
      {
        orbitA: 0.75,
        orbitB: 0.5,
        speed: 0.65,
        phase: 0.2,
        y: 0.09,
        scale: 1.05,
        color: '#e07038',
        belly: '#f2b878',
        stripe: '#c85828',
      },
      {
        orbitA: 0.52,
        orbitB: 0.68,
        speed: -0.5,
        phase: 1.5,
        y: 0.07,
        scale: 0.88,
        color: '#3a82c0',
        belly: '#9ec8ec',
        stripe: '#2a628f',
      },
      {
        orbitA: 0.88,
        orbitB: 0.36,
        speed: 0.85,
        phase: 2.9,
        y: 0.1,
        scale: 0.72,
        color: '#e0b848',
        belly: '#f5e8b0',
        stripe: '#c89828',
      },
      {
        orbitA: 0.4,
        orbitB: 0.55,
        speed: -0.75,
        phase: 4.2,
        y: 0.08,
        scale: 0.78,
        color: '#c05068',
        belly: '#e8a0b0',
        stripe: '#a03850',
      },
      {
        orbitA: 0.68,
        orbitB: 0.62,
        speed: 0.42,
        phase: 5.6,
        y: 0.095,
        scale: 0.98,
        color: '#3f8f55',
        belly: '#8fc898',
        stripe: '#2e6f40',
      },
      {
        orbitA: 0.48,
        orbitB: 0.42,
        speed: 1.05,
        phase: 0.9,
        y: 0.075,
        scale: 0.62,
        color: '#8a6ec8',
        belly: '#c8b8e8',
        stripe: '#6a4ea0',
      },
    ],
    [],
  )

  // Shore stones follow the irregular rim
  const stones = useMemo(() => {
    const list: Array<[number, number, number, number]> = []
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2
      const wobble = 0.78 + 0.16 * Math.sin(t * 2 + 1.2) + 0.12 * Math.cos(t * 3 - 1.5)
      const indent = i % 5 === 2 ? 0.88 : i % 4 === 1 ? 1.08 : 1
      const r = 1.95 * wobble * indent
      list.push([Math.cos(t) * r, 0.08 + (i % 3) * 0.01, Math.sin(t) * r * 0.82, 0.14 + (i % 4) * 0.03])
    }
    return list
  }, [])

  const reeds = useMemo(() => {
    const pts: Array<[number, number]> = []
    for (const i of [0, 2, 4, 7, 9, 11]) {
      const t = (i / 12) * Math.PI * 2
      const wobble = 0.78 + 0.16 * Math.sin(t * 2 + 1.2) + 0.12 * Math.cos(t * 3 - 1.5)
      const r = 2.05 * wobble
      pts.push([Math.cos(t) * r, Math.sin(t) * r * 0.82])
    }
    return pts
  }, [])

  return (
    <group position={[POND_POS.x, 0, POND_POS.z]}>
      <PondPlate radius={2.15} seed={1.1} y={0.012} color="#6a5340" receiveShadow />
      <PondPlate radius={1.95} seed={1.1} y={0.028} color="#5a4638" receiveShadow />
      <PondPlate
        radius={1.55}
        seed={1.15}
        y={0.055}
        color={deep}
        opacity={0.94}
        metalness={0.18}
        roughness={0.18}
        receiveShadow
      />
      <PondPlate radius={1.15} seed={1.25} y={0.075} color={water} opacity={0.62} metalness={0.14} roughness={0.15} />
      <PondPlate radius={0.55} seed={2.0} y={0.095} color="#d0ecf8" opacity={0.28} metalness={0.25} roughness={0.08} />

      {stones.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x!, y!, z!]} rotation={[0.25, i * 0.7, 0.12]} castShadow>
          <dodecahedronGeometry args={[r!, 0]} />
          <meshStandardMaterial color={i % 2 ? '#8a8f84' : '#6f746c'} roughness={0.95} flatShading />
        </mesh>
      ))}

      {reeds.map(([x, z], i) => (
        <group key={`reed${i}`} position={[x!, 0, z!]}>
          {[0, 1, 2, 3].map((j) => (
            <mesh
              key={j}
              position={[(j - 1.5) * 0.05, 0.3 + j * 0.04, (j % 2) * 0.04]}
              rotation={[0.12, j * 0.4, 0.1 * (j - 1.5)]}
              castShadow
            >
              <cylinderGeometry args={[0.012, 0.018, 0.58 + j * 0.07, 5]} />
              <meshStandardMaterial color={look.showSnow ? '#8a9a7a' : '#3f7a40'} roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}

      {!look.showSnow && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[0.55, 0.1, 0.35]}>
            <circleGeometry args={[0.24, 14]} />
            <meshStandardMaterial color="#348a42" roughness={0.8} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, -0.7]} position={[-0.45, 0.1, -0.4]}>
            <circleGeometry args={[0.2, 14]} />
            <meshStandardMaterial color="#4aa058" roughness={0.8} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0.2]} position={[0.2, 0.1, -0.5]}>
            <circleGeometry args={[0.14, 12]} />
            <meshStandardMaterial color="#2f7340" roughness={0.8} />
          </mesh>
          <mesh position={[0.55, 0.14, 0.35]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#f0d060" />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[
                0.55 + Math.cos((i / 5) * Math.PI * 2) * 0.05,
                0.13,
                0.35 + Math.sin((i / 5) * Math.PI * 2) * 0.05,
              ]}
            >
              <sphereGeometry args={[0.03, 6, 6]} />
              <meshStandardMaterial color="#e878a0" />
            </mesh>
          ))}
        </>
      )}

      {fish.map((f, i) => (
        <Fish key={i} spec={f} />
      ))}
    </group>
  )
}
