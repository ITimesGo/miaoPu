import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CanvasTexture, Color, DoubleSide, Path, Shape, type Group, type MeshBasicMaterial, type MeshStandardMaterial } from 'three'
import { useGameStore } from '../../game/state/gameStore'
import { MINUTES_PER_DAY } from '../../game/types'

/** Offset hole → classic crescent silhouette (unit outer radius). */
function makeCrescentShape(offset = 0.42, holeScale = 0.88) {
  const shape = new Shape()
  shape.absarc(0, 0, 1, 0, Math.PI * 2, false)
  const hole = new Path()
  hole.absarc(offset, 0.06, holeScale, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

/** Cloud tint follows day — continuous blend, no period snap. */
export function cloudLook(minuteOfDay: number) {
  const h = (((minuteOfDay % 1440) + 1440) % 1440) / 60
  const keys: Array<{ h: number; color: string; shade: string; shadow: number }> = [
    { h: 0, color: '#5a6880', shade: '#3a4658', shadow: 0.16 },
    { h: 4.5, color: '#5a6880', shade: '#3a4658', shadow: 0.16 },
    { h: 6.2, color: '#ffd8bc', shade: '#e8b090', shadow: 0.22 },
    { h: 8.0, color: '#f4f6fa', shade: '#d4dae4', shadow: 0.2 },
    { h: 16.5, color: '#f4f6fa', shade: '#d4dae4', shadow: 0.2 },
    { h: 18.2, color: '#c8a090', shade: '#9a7068', shadow: 0.24 },
    { h: 20.5, color: '#5a6880', shade: '#3a4658', shadow: 0.16 },
    { h: 24, color: '#5a6880', shade: '#3a4658', shadow: 0.16 },
  ]
  let i = 0
  while (i < keys.length - 1 && h >= keys[i + 1]!.h) i++
  const a = keys[i]!
  const b = keys[i + 1]!
  const t = Math.min(1, Math.max(0, (h - a.h) / (b.h - a.h || 1)))
  const s = t * t * (3 - 2 * t)
  _cloudA.set(a.color).lerp(_cloudB.set(b.color), s)
  _cloudC.set(a.shade).lerp(_cloudD.set(b.shade), s)
  return {
    color: `#${_cloudA.getHexString()}`,
    shade: `#${_cloudC.getHexString()}`,
    shadow: a.shadow + (b.shadow - a.shadow) * s,
  }
}

const _cloudA = new Color()
const _cloudB = new Color()
const _cloudC = new Color()
const _cloudD = new Color()

/**
 * Background sky arc: east→west, pushed away from the iso camera (+x/+z).
 * Returns world position on a far backdrop — not an island-orbiting prop.
 */
export function celestialPos(minuteOfDay: number, phase = 0, orbit = 52) {
  const angle = (minuteOfDay / MINUTES_PER_DAY) * Math.PI * 2 - Math.PI / 2 + phase
  return {
    x: Math.cos(angle) * orbit,
    y: Math.sin(angle) * orbit,
    z: -orbit * 0.48,
    angle,
  }
}

/** Unit-ish light direction (same arc as visuals, independent of backdrop distance). */
export function celestialDir(minuteOfDay: number, phase = 0) {
  const p = celestialPos(minuteOfDay, phase, 1)
  const len = Math.hypot(p.x, p.y, p.z) || 1
  return { x: p.x / len, y: p.y / len, z: p.z / len, angle: p.angle }
}

function SunDisc({ size, orbit }: { size: number; orbit: number }) {
  const root = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const visible = useRef(true)

  useFrame(() => {
    const g = root.current
    if (!g) return
    const minuteOfDay = useGameStore.getState().minuteOfDay
    const p = celestialPos(minuteOfDay, 0, orbit)
    const show = p.y >= 0
    g.visible = show
    visible.current = show
    if (!show) return
    g.position.set(p.x, p.y, p.z)
    g.quaternion.copy(camera.quaternion)
  })

  const r = 3.4 * size * (orbit / 52)

  return (
    <group ref={root}>
      <mesh renderOrder={-20}>
        <circleGeometry args={[r, 32]} />
        <meshBasicMaterial color="#ffe566" depthTest={false} depthWrite={false} fog={false} />
      </mesh>
      <mesh renderOrder={-21} scale={1.45}>
        <circleGeometry args={[r, 24]} />
        <meshBasicMaterial
          color="#ffd060"
          transparent
          opacity={0.28}
          depthTest={false}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  )
}

function MoonDisc({ size, orbit }: { size: number; orbit: number }) {
  const root = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const crescent = useMemo(() => makeCrescentShape(0.44, 0.9), [])
  const r = 2.9 * size * (orbit / 52)

  useFrame(() => {
    const g = root.current
    if (!g) return
    const minuteOfDay = useGameStore.getState().minuteOfDay
    const p = celestialPos(minuteOfDay, Math.PI, orbit)
    const show = p.y >= 0
    g.visible = show
    if (!show) return
    g.position.set(p.x, p.y, p.z)
    g.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={root}>
      <mesh renderOrder={-21} scale={r * 1.55} rotation={[0, 0, 0.15]}>
        <shapeGeometry args={[crescent]} />
        <meshBasicMaterial
          color="#b0c8ff"
          transparent
          opacity={0.16}
          depthTest={false}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <mesh renderOrder={-20} scale={r} rotation={[0, 0, 0.15]}>
        <shapeGeometry args={[crescent]} />
        <meshBasicMaterial color="#e8eefc" depthTest={false} depthWrite={false} fog={false} />
      </mesh>
    </group>
  )
}

/** Stylized clay cumulus — solid spheres like the rest of the island (no alpha stacking). */
const CLOUD_SHAPES: { x: number; y: number; z: number; r: number; shade?: boolean }[][] = [
  [
    { x: 0, y: 0.08, z: 0, r: 0.62 },
    { x: 0.72, y: 0.1, z: 0.06, r: 0.5 },
    { x: -0.68, y: 0.08, z: -0.05, r: 0.52 },
    { x: 0.28, y: 0.4, z: 0.02, r: 0.4 },
    { x: -0.22, y: 0.36, z: -0.03, r: 0.38 },
    { x: 1.15, y: 0.02, z: 0, r: 0.34 },
    { x: -1.1, y: 0.02, z: 0.02, r: 0.32 },
    { x: 0.08, y: -0.18, z: 0.04, r: 0.48, shade: true },
  ],
  [
    { x: 0, y: 0.1, z: 0, r: 0.55 },
    { x: 0.6, y: 0.12, z: 0.08, r: 0.46 },
    { x: -0.55, y: 0.08, z: -0.06, r: 0.44 },
    { x: 0.12, y: 0.38, z: 0, r: 0.36 },
    { x: 1.0, y: 0.04, z: -0.04, r: 0.3 },
    { x: -0.95, y: 0.02, z: 0.04, r: 0.28 },
    { x: 0.35, y: -0.14, z: 0.03, r: 0.38, shade: true },
  ],
  [
    { x: 0.08, y: 0.08, z: 0, r: 0.5 },
    { x: 0.82, y: 0.1, z: 0.05, r: 0.46 },
    { x: -0.62, y: 0.1, z: -0.04, r: 0.44 },
    { x: 1.35, y: 0.04, z: 0, r: 0.3 },
    { x: -1.05, y: 0.02, z: 0.03, r: 0.28 },
    { x: 0.35, y: 0.34, z: 0.02, r: 0.34 },
    { x: -0.2, y: 0.3, z: -0.02, r: 0.32 },
    { x: 0.15, y: -0.16, z: 0.04, r: 0.42, shade: true },
  ],
]

type CloudBlob = (typeof CLOUD_SHAPES)[number][number]

/** One flat silhouette (union of lobes) → uniform alpha, no stacked rings. */
function paintCloudShadow(shape: CloudBlob[], size = 256) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const b of shape) {
    minX = Math.min(minX, b.x - b.r)
    maxX = Math.max(maxX, b.x + b.r)
    minZ = Math.min(minZ, b.z - b.r)
    maxZ = Math.max(maxZ, b.z + b.r)
  }
  const pad = 0.65
  const spanX = maxX - minX + pad * 2
  const spanZ = maxZ - minZ + pad * 2
  const midX = (minX + maxX) / 2
  const midZ = (minZ + maxZ) / 2

  const solid = document.createElement('canvas')
  solid.width = size
  solid.height = size
  const sctx = solid.getContext('2d')!
  sctx.clearRect(0, 0, size, size)
  sctx.fillStyle = '#ffffff'
  for (const b of shape) {
    const px = ((b.x - midX) / spanX + 0.5) * size
    const pz = ((b.z - midZ) / spanZ + 0.5) * size
    const pr = (b.r / Math.max(spanX, spanZ)) * size * 1.12
    sctx.beginPath()
    sctx.arc(px, pz, pr, 0, Math.PI * 2)
    sctx.fill()
  }

  // Blur the whole union once so the interior stays one opacity.
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.filter = 'blur(12px)'
  ctx.drawImage(solid, 0, 0)
  ctx.filter = 'none'

  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return { map: tex, width: spanX, depth: spanZ }
}

let cloudShadowCache: ReturnType<typeof paintCloudShadow>[] | null = null

function getCloudShadows() {
  if (!cloudShadowCache) cloudShadowCache = CLOUD_SHAPES.map((shape) => paintCloudShadow(shape))
  return cloudShadowCache
}

function CloudPuff({
  base,
  speed,
  seed,
}: {
  base: [number, number, number]
  speed: number
  seed: number
}) {
  const bodyRef = useRef<Group>(null)
  const shadowRef = useRef<Group>(null)
  const matsRef = useRef<MeshStandardMaterial[]>([])
  const shadowMatRef = useRef<MeshBasicMaterial>(null)
  const curColor = useRef(new Color('#f4f6fa'))
  const curShade = useRef(new Color('#d4dae4'))
  const curShadow = useRef(0.2)
  const shapeIndex = Math.floor(seed * 3) % CLOUD_SHAPES.length
  const shape = CLOUD_SHAPES[shapeIndex]!
  const shadow = useMemo(() => getCloudShadows()[shapeIndex]!, [shapeIndex])
  const yaw = seed * 1.7
  const scale = 0.95 + (seed % 1) * 0.3

  useFrame((state, delta) => {
    const body = bodyRef.current
    const sh = shadowRef.current
    if (!body) return
    const t = state.clock.elapsedTime * speed * 0.28 + seed * 10
    const span = 28
    let x = base[0] + t * 2.2
    x = ((x + span / 2) % span) - span / 2
    const y = base[1] + Math.sin(t * 0.4 + seed) * 0.2
    const z = base[2]
    body.position.set(x, y, z)
    if (sh) {
      sh.position.set(x, 0.16, z)
      sh.rotation.y = yaw
    }

    const look = cloudLook(useGameStore.getState().minuteOfDay)
    const a = 1 - Math.exp(-delta * 3.2)
    curColor.current.lerp(_cloudA.set(look.color), a)
    curShade.current.lerp(_cloudB.set(look.shade), a)
    curShadow.current += (look.shadow - curShadow.current) * a
    for (const [i, mat] of matsRef.current.entries()) {
      if (!mat) continue
      mat.color.copy(shape[i]?.shade ? curShade.current : curColor.current)
    }
    if (shadowMatRef.current) shadowMatRef.current.opacity = curShadow.current
  })

  return (
    <>
      <group
        ref={bodyRef}
        position={base}
        rotation={[0, yaw, 0]}
        scale={[scale, scale * 0.72, scale * 0.88]}
      >
        {shape.map((b, i) => (
          <mesh key={i} position={[b.x, b.y, b.z]} castShadow={false}>
            <sphereGeometry args={[b.r, 8, 6]} />
            <meshStandardMaterial
              ref={(m) => {
                if (m) matsRef.current[i] = m
              }}
              color={b.shade ? '#d4dae4' : '#f4f6fa'}
              roughness={0.95}
              metalness={0}
            />
          </mesh>
        ))}
      </group>
      <group
        ref={shadowRef}
        position={[base[0], 0.16, base[2]]}
        rotation={[0, yaw, 0]}
        scale={[scale * 1.08, 1, scale * 0.95]}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={100}>
          <planeGeometry args={[shadow.width, shadow.depth]} />
          <meshBasicMaterial
            ref={shadowMatRef}
            alphaMap={shadow.map}
            color="#1a2433"
            transparent
            opacity={0.2}
            depthTest={false}
            depthWrite={false}
            side={DoubleSide}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </>
  )
}

function CloudField({ count, speed }: { count: number; speed: number }) {
  const clouds = useMemo(() => {
    return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => {
      const a = (i / Math.max(1, count)) * Math.PI * 2
      return {
        base: [
          Math.cos(a) * (7 + (i % 4) * 1.6) + (i % 3) * 0.8,
          7.5 + (i % 5) * 0.85,
          Math.sin(a * 1.2) * (6 + (i % 3) * 1.8) - 1,
        ] as [number, number, number],
        seed: i * 1.37 + 0.2,
      }
    })
  }, [count])

  if (count <= 0) return null

  return (
    <group>
      {clouds.map((c, i) => (
        <CloudPuff key={i} base={c.base} speed={speed} seed={c.seed} />
      ))}
    </group>
  )
}

/** Sun/moon as far sky backdrop discs + drifting clouds near the island. */
export function SkyCycle() {
  const cloudCount = useGameStore((s) => s.cloudCount)
  const cloudSpeed = useGameStore((s) => s.cloudSpeed)
  const celestialSize = useGameStore((s) => s.celestialSize)
  const skyOrbit = useGameStore((s) => s.skyOrbit)

  return (
    <group>
      <SunDisc size={celestialSize} orbit={skyOrbit} />
      <MoonDisc size={celestialSize * 0.95} orbit={skyOrbit} />
      <CloudField count={cloudCount} speed={cloudSpeed} />
    </group>
  )
}
