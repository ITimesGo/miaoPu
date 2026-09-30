import { memo, useMemo } from 'react'
import { SphereGeometry } from 'three'
import type { SeasonLook } from '../../game/data/seasons'
import { hash01 } from './Decor'

/** 共享叶球几何，避免每棵树几十个独立 BufferGeometry */
const LEAF_GEO = new SphereGeometry(1, 7, 6)
const LEAF_GEO_HI = new SphereGeometry(1, 8, 7)
const MOSS_GEO = new SphereGeometry(1, 5, 4)
const BUSH_GEO = new SphereGeometry(1, 7, 6)

type BranchDef = {
  y: number
  yaw: number
  pitch: number
  bend: number
  len: number
  thick: number
  tipScale: number
  fork: boolean
  twig: boolean
  twig2: boolean
}

function buildBranches(seed: number, trunk: number, count: number): BranchDef[] {
  return Array.from({ length: count }, (_, i) => {
    const t = 0.34 + (i / Math.max(1, count - 1)) * 0.58
    return {
      y: trunk * t,
      yaw: hash01(seed + i * 17.3) * Math.PI * 2,
      pitch: 0.32 + hash01(seed + i * 9.1) * 0.7,
      bend: 0.12 + hash01(seed + i * 6.6) * 0.35,
      len: trunk * (0.32 + hash01(seed + i * 3.7) * 0.52),
      thick: 0.03 + hash01(seed + i * 5.2) * 0.042,
      tipScale: 0.48 + hash01(seed + i * 11.1) * 0.52,
      fork: hash01(seed + i * 1.9) > 0.4,
      twig: hash01(seed + i * 2.3) > 0.22,
      twig2: hash01(seed + i * 4.1) > 0.48,
    }
  })
}

function Bark({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.93} metalness={0.02} />
}

function Leaf({ color, roughness = 0.7 }: { color: string; roughness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} />
}

function StylizedTreeInner({
  x,
  z,
  trunk = 1.1,
  canopy = 1.15,
  look,
  detail = 'normal',
}: {
  x: number
  z: number
  trunk?: number
  canopy?: number
  look: SeasonLook
  detail?: 'normal' | 'high'
}) {
  const seed = Math.abs(x * 13.7 + z * 29.1)
  const bark = look.showSnow ? '#4a3428' : '#5c3a24'
  const barkDark = look.showSnow ? '#3a281c' : '#452818'
  const barkMid = look.showSnow ? '#423024' : '#553620'
  const barkLight = look.showSnow ? '#5a4030' : '#6a4530'
  const cs = canopy * look.canopyScale
  const winter = look.showSnow
  const spring = look.canopyScale < 0.7 && !winter
  const hi = detail === 'high'
  const seg = hi ? 10 : 8
  const lean = (hash01(seed + 0.7) - 0.5) * (hi ? 0.06 : 0.045)

  const branchCount = winter ? (hi ? 10 : 7) : spring ? (hi ? 8 : 6) : hi ? 11 : 8
  const branches = useMemo(
    () => buildBranches(seed, trunk, branchCount),
    [seed, trunk, branchCount],
  )

  const foliage = useMemo(() => {
    const colors = [look.canopy, look.canopyMid, look.canopyDark, look.canopyLight]
    type Clump = {
      px: number
      py: number
      pz: number
      r: number
      color: string
      sx: number
      sy: number
      sz: number
    }
    const clusters: Clump[] = []

    const push = (
      px: number,
      py: number,
      pz: number,
      r: number,
      color: string,
      squash = 0.8,
    ) => {
      clusters.push({
        px,
        py,
        pz,
        r,
        color,
        sx: 0.92 + hash01(px * 3 + pz) * 0.2,
        sy: squash,
        sz: 0.9 + hash01(pz * 5 + px) * 0.22,
      })
    }

    if (winter) {
      for (const [i, b] of branches.entries()) {
        const tipR = b.len * 0.88
        push(
          Math.sin(b.yaw) * Math.sin(b.pitch) * tipR,
          b.y + Math.cos(b.pitch) * tipR,
          Math.cos(b.yaw) * Math.sin(b.pitch) * tipR,
          0.06 + b.tipScale * 0.08,
          colors[i % colors.length]!,
          0.68,
        )
        if (hi || i % 2 === 0) {
          push(
            Math.sin(b.yaw) * Math.sin(b.pitch) * tipR * 0.65,
            b.y + Math.cos(b.pitch) * tipR * 0.65,
            Math.cos(b.yaw) * Math.sin(b.pitch) * tipR * 0.65,
            0.045 + b.tipScale * 0.04,
            look.canopyLight,
            0.62,
          )
        }
      }
      return clusters
    }

    const layers = spring ? (hi ? 3 : 2) : hi ? 4 : 3
    const perLayer = spring ? (hi ? 6 : 4) : hi ? 7 : 5

    for (let layer = 0; layer < layers; layer++) {
      const ly = trunk + cs * (0.0 + layer * (hi ? 0.22 : 0.28))
      const radius = cs * (0.68 - layer * 0.09) * (spring ? 0.74 : 1)
      for (let i = 0; i < perLayer; i++) {
        const a = (i / perLayer) * Math.PI * 2 + hash01(seed + layer * 8 + i) * 0.5
        const rr = radius * (0.48 + hash01(seed + i * 4.4 + layer) * 0.6)
        push(
          Math.cos(a) * rr,
          ly + (hash01(seed + i + layer * 3) - 0.25) * cs * 0.3,
          Math.sin(a) * rr,
          cs * (spring ? 0.18 : 0.24) * (0.7 + hash01(seed * 2 + i) * 0.55),
          colors[(i + layer) % colors.length]!,
          spring ? 0.86 : 0.7 + hash01(seed + i) * 0.24,
        )
      }
    }

    // crown volumes
    push(0.02, trunk + cs * (spring ? 0.4 : hi ? 0.95 : 0.88), -0.02, cs * (spring ? 0.3 : hi ? 0.5 : 0.42), look.canopyLight, 0.76)
    push(-0.1, trunk + cs * 0.58, 0.08, cs * (hi ? 0.34 : 0.26), look.canopyMid, 0.8)
    push(0.12, trunk + cs * 0.5, -0.1, cs * (hi ? 0.3 : 0.22), look.canopyDark, 0.78)
    if (hi) {
      push(0.18, trunk + cs * 0.72, 0.14, cs * 0.28, look.canopy, 0.82)
      push(-0.16, trunk + cs * 0.68, -0.12, cs * 0.26, look.canopyMid, 0.8)
      push(0.0, trunk + cs * 0.35, 0.2, cs * 0.24, look.canopyDark, 0.85)
    }

    for (const [i, b] of branches.entries()) {
      const tipR = b.len * 0.92
      push(
        Math.sin(b.yaw) * Math.sin(b.pitch) * tipR,
        b.y + Math.cos(b.pitch) * tipR,
        Math.cos(b.yaw) * Math.sin(b.pitch) * tipR,
        cs * (spring ? 0.14 : 0.19) * b.tipScale,
        colors[i % colors.length]!,
        0.88,
      )
      const midR = b.len * 0.55
      push(
        Math.sin(b.yaw) * Math.sin(b.pitch) * midR,
        b.y + Math.cos(b.pitch) * midR + 0.05,
        Math.cos(b.yaw) * Math.sin(b.pitch) * midR,
        cs * 0.13 * b.tipScale,
        colors[(i + 2) % colors.length]!,
        0.9,
      )
      if (hi && b.fork) {
        const fr = b.len * 0.75
        const fy = b.yaw + 0.55
        push(
          Math.sin(fy) * Math.sin(b.pitch * 0.9) * fr,
          b.y + Math.cos(b.pitch * 0.9) * fr,
          Math.cos(fy) * Math.sin(b.pitch * 0.9) * fr,
          cs * 0.12 * b.tipScale,
          colors[(i + 1) % colors.length]!,
          0.86,
        )
      }
    }

    return clusters
  }, [branches, cs, hi, look, seed, spring, trunk, winter])

  const roots = useMemo(() => {
    const n = hi ? 6 : 4
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + hash01(seed + i * 6.1) * 0.35
      const spread = hi ? 1.55 : 1.15
      return {
        x: Math.cos(a) * (0.15 + hash01(seed + i) * 0.1) * spread,
        z: Math.sin(a) * (0.13 + hash01(seed + i * 2) * 0.1) * spread,
        rot: [
          0.18 + hash01(seed + i) * 0.28,
          a,
          (hash01(seed + i * 3) - 0.5) * 0.65,
        ] as [number, number, number],
        len: (hi ? 0.38 : 0.26) * (0.8 + hash01(seed + i * 4) * 0.4),
        thick: (hi ? 0.06 : 0.042) * (0.75 + hash01(seed + i * 5) * 0.45),
      }
    })
  }, [hi, seed])

  const barkPlates = useMemo(() => {
    const n = hi ? 5 : 3
    return Array.from({ length: n }, (_, i) => ({
      y: trunk * (0.18 + hash01(seed + i * 8) * 0.55),
      yaw: hash01(seed + i * 3.3) * Math.PI * 2,
      h: trunk * (hi ? 0.14 : 0.18) * (0.7 + hash01(seed + i) * 0.5),
      w: hi ? 0.045 : 0.032,
      d: hi ? 0.055 : 0.04,
      r: (hi ? 0.2 : 0.13) * (0.85 + hash01(seed + i * 2) * 0.3),
    }))
  }, [hi, seed, trunk])

  return (
    <group position={[x, 0, z]} rotation={[lean, hash01(seed) * 0.4, -lean * 0.6]}>
      {/* buttress / root flare — 仅主干投阴影，叶与细枝不投以减阴影开销 */}
      <mesh position={[0, hi ? 0.1 : 0.07, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[hi ? 0.48 : 0.3, hi ? 0.62 : 0.4, hi ? 0.22 : 0.15, seg]} />
        <Bark color={barkDark} />
      </mesh>
      {hi && (
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.5, 0.12, seg]} />
          <Bark color={barkMid} />
        </mesh>
      )}
      {roots.map((r, i) => (
        <mesh key={`root${i}`} position={[r.x, hi ? 0.11 : 0.08, r.z]} rotation={r.rot}>
          <cylinderGeometry args={[r.thick * 0.5, r.thick, r.len, 6]} />
          <Bark color={i % 2 ? bark : barkDark} />
        </mesh>
      ))}

      {/* trunk: 4 tapering segments */}
      <mesh position={[0, trunk * 0.18, 0]} castShadow>
        <cylinderGeometry args={[hi ? 0.24 : 0.155, hi ? 0.36 : 0.24, trunk * 0.36, seg]} />
        <Bark color={bark} />
      </mesh>
      <mesh position={[0, trunk * 0.42, 0]} castShadow>
        <cylinderGeometry args={[hi ? 0.17 : 0.12, hi ? 0.24 : 0.155, trunk * 0.3, seg]} />
        <Bark color={barkMid} />
      </mesh>
      <mesh position={[0, trunk * 0.64, 0]} castShadow>
        <cylinderGeometry args={[hi ? 0.11 : 0.08, hi ? 0.17 : 0.12, trunk * 0.28, seg]} />
        <Bark color={bark} />
      </mesh>
      <mesh position={[0, trunk * 0.84, 0]} castShadow>
        <cylinderGeometry args={[hi ? 0.055 : 0.042, hi ? 0.11 : 0.08, trunk * 0.26, seg]} />
        <Bark color={barkDark} />
      </mesh>

      {barkPlates.map((p, i) => (
        <mesh
          key={`plate${i}`}
          position={[Math.cos(p.yaw) * p.r, p.y, Math.sin(p.yaw) * p.r]}
          rotation={[0.05, p.yaw, 0.08]}
        >
          <boxGeometry args={[p.w, p.h, p.d]} />
          <Bark color={i % 2 ? barkDark : barkLight} />
        </mesh>
      ))}

      {/* branches: two-segment bend + forks + twigs */}
      {branches.map((b, i) => {
        const len1 = b.len * 0.55
        const len2 = b.len * 0.5
        const p1 = b.pitch
        const p2 = b.pitch + b.bend
        const branchShadow = hi && i % 3 === 0
        return (
          <group key={i} position={[0, b.y, 0]} rotation={[0, b.yaw, 0]}>
            <mesh
              position={[0, Math.cos(p1) * len1 * 0.5, Math.sin(p1) * len1 * 0.5]}
              rotation={[p1, 0, 0]}
              castShadow={branchShadow}
            >
              <cylinderGeometry args={[b.thick * 0.7, b.thick * (hi ? 1.2 : 1.05), len1, 6]} />
              <Bark color={i % 2 ? bark : barkDark} />
            </mesh>
            <mesh
              position={[
                0,
                Math.cos(p1) * len1 + Math.cos(p2) * len2 * 0.5,
                Math.sin(p1) * len1 + Math.sin(p2) * len2 * 0.5,
              ]}
              rotation={[p2, 0, 0]}
            >
              <cylinderGeometry args={[b.thick * 0.35, b.thick * 0.7, len2, 5]} />
              <Bark color={barkMid} />
            </mesh>
            {b.fork && (
              <mesh
                position={[
                  0.06,
                  Math.cos(p1) * len1 * 0.75,
                  Math.sin(p1) * len1 * 0.75,
                ]}
                rotation={[p1 + 0.35, 0.7, 0.45]}
              >
                <cylinderGeometry args={[0.012, b.thick * 0.45, b.len * 0.45, 5]} />
                <Bark color={barkDark} />
              </mesh>
            )}
            {b.twig && (
              <mesh
                position={[
                  0.04,
                  Math.cos(p1) * len1 + Math.cos(p2) * len2 * 0.55,
                  Math.sin(p1) * len1 + Math.sin(p2) * len2 * 0.55,
                ]}
                rotation={[p2 + 0.5, 0.4, 0.6]}
              >
                <cylinderGeometry args={[0.008, b.thick * 0.32, b.len * 0.35, 4]} />
                <Bark color={barkDark} />
              </mesh>
            )}
            {b.twig2 && (
              <mesh
                position={[
                  -0.05,
                  Math.cos(p1) * len1 * 0.6,
                  Math.sin(p1) * len1 * 0.6,
                ]}
                rotation={[p1 + 0.3, -0.55, -0.35]}
              >
                <cylinderGeometry args={[0.007, b.thick * 0.28, b.len * 0.28, 4]} />
                <Bark color={barkLight} />
              </mesh>
            )}
          </group>
        )
      })}

      {foliage.map((f, i) => (
        <mesh
          key={`f${i}`}
          geometry={hi ? LEAF_GEO_HI : LEAF_GEO}
          position={[f.px, f.py, f.pz]}
          scale={[f.r * f.sx, f.r * f.sy, f.r * f.sz]}
        >
          <Leaf color={f.color} roughness={winter ? 0.9 : 0.66} />
        </mesh>
      ))}

      {/* high-detail moss / under-canopy accents */}
      {hi &&
        !winter &&
        Array.from({ length: 4 }, (_, i) => {
          const a = (i / 4) * Math.PI * 2 + seed
          const r = 0.07 + (i % 3) * 0.02
          return (
            <mesh
              key={`moss${i}`}
              geometry={MOSS_GEO}
              position={[Math.cos(a) * 0.22, trunk * 0.28 + i * 0.08, Math.sin(a) * 0.22]}
              scale={[r, r * 0.45, r]}
            >
              <Leaf color={look.canopyDark} roughness={0.85} />
            </mesh>
          )
        })}
    </group>
  )
}

export const StylizedTree = memo(StylizedTreeInner)

/** 岛上景观巨树（不可砍） */
export function GrandTree({
  x,
  z,
  look,
  trunk = 3.25,
  canopy = 3.7,
}: {
  x: number
  z: number
  look: SeasonLook
  trunk?: number
  canopy?: number
}) {
  return <StylizedTree x={x} z={z} trunk={trunk} canopy={canopy} look={look} detail="high" />
}

/** 被砍后的树桩 */
export function TreeStump({
  x,
  z,
  scale = 1,
  look,
}: {
  x: number
  z: number
  scale?: number
  look: SeasonLook
}) {
  const bark = look.showSnow ? '#4a3428' : '#5c3a24'
  const barkDark = look.showSnow ? '#3a281c' : '#4a2e1a'
  const s = 0.85 + scale * 0.25

  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.16, 8]} />
        <Bark color={barkDark} />
      </mesh>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.12, 8]} />
        <Bark color={bark} />
      </mesh>
      <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0.2]} receiveShadow>
        <circleGeometry args={[0.17, 10]} />
        <meshStandardMaterial color="#c4a574" roughness={0.85} />
      </mesh>
      <mesh position={[0.02, 0.235, -0.01]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <ringGeometry args={[0.04, 0.14, 10]} />
        <meshStandardMaterial color="#a88858" roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 0.236, 0.02]} rotation={[-Math.PI / 2, 0, 0.5]}>
        <ringGeometry args={[0.02, 0.08, 8]} />
        <meshStandardMaterial color="#b89868" roughness={0.88} />
      </mesh>
      {[
        [0.16, 0.06, 0.06, 0.3, 0.5, 0.7],
        [-0.14, 0.05, -0.08, 0.2, -0.4, -0.6],
        [0.02, 0.05, 0.18, 0.35, 0.1, 0.2],
        [-0.12, 0.05, 0.14, 0.25, -0.2, 0.5],
      ].map((r, i) => (
        <mesh key={i} position={[r[0]!, r[1]!, r[2]!]} rotation={[r[3]!, r[4]!, r[5]!]}>
          <cylinderGeometry args={[0.022, 0.045, 0.17, 5]} />
          <Bark color={i % 2 ? bark : barkDark} />
        </mesh>
      ))}
    </group>
  )
}

export function Bush({
  x,
  z,
  scale = 1,
  look,
}: {
  x: number
  z: number
  scale?: number
  look: SeasonLook
}) {
  const s = scale * (look.showSnow ? 0.9 : 0.75 + look.canopyScale * 0.28)
  const seed = Math.abs(x * 7.1 + z * 11.3)
  const clumps = useMemo(
    () =>
      Array.from({ length: look.showSnow ? 3 : 5 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + hash01(seed + i)
        return {
          px: Math.cos(a) * (0.1 + hash01(seed + i * 2) * 0.16),
          py: 0.02 + hash01(seed + i * 3) * 0.1,
          pz: Math.sin(a) * (0.09 + hash01(seed + i * 4) * 0.14),
          r: 0.16 + hash01(seed + i * 5) * 0.15,
          color: [look.bush, look.bushMid, look.bushDark][i % 3]!,
        }
      }),
    [look, seed],
  )

  return (
    <group position={[x, 0.12 * s, z]} scale={s}>
      {!look.showSnow && (
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 0.18, 5]} />
          <meshStandardMaterial color="#5a3c28" roughness={0.9} />
        </mesh>
      )}
      {clumps.map((c, i) => (
        <mesh
          key={i}
          geometry={BUSH_GEO}
          position={[c.px, c.py, c.pz]}
          scale={[c.r, c.r * 0.85, c.r]}
        >
          <meshStandardMaterial
            color={look.showSnow && i === 0 ? look.canopyLight : c.color}
            roughness={0.8}
          />
        </mesh>
      ))}
      {look.showSnow && (
        <mesh geometry={BUSH_GEO} position={[0.05, 0.22, 0.02]} scale={0.16}>
          <meshStandardMaterial color={look.canopyLight} roughness={0.88} />
        </mesh>
      )}
    </group>
  )
}
