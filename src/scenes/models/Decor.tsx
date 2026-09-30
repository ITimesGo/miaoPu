import { useMemo } from 'react'
import type { SeasonLook } from '../../game/data/seasons'

/** Deterministic pseudo-random in [0,1) from a seed. */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function GrassTuft({
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
  const blades = useMemo(
    () =>
      Array.from({ length: look.showSnow ? 3 : 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 + hash01(x * 10 + z + i)
        const hMul = look.showSnow ? 0.55 : 0.7 + look.canopyScale * 0.35
        return {
          px: Math.cos(a) * 0.08,
          pz: Math.sin(a) * 0.08,
          h: (0.18 + hash01(i + x) * 0.2) * hMul,
          rot: a,
        }
      }),
    [x, z, look.showSnow, look.canopyScale],
  )

  return (
    <group position={[x, 0, z]} scale={scale}>
      {blades.map((b, i) => (
        <mesh key={i} position={[b.px, b.h / 2, b.pz]} rotation={[0.15, b.rot, 0.1]} castShadow>
          <coneGeometry args={[0.035, b.h, 4]} />
          <meshStandardMaterial color={i % 2 ? look.bladeA : look.bladeB} roughness={0.9} />
        </mesh>
      ))}
      {look.showSnow && (
        <mesh position={[0, 0.04, 0]} castShadow>
          <sphereGeometry args={[0.12, 10, 8]} />
          <meshStandardMaterial color={look.canopyLight} roughness={0.9} />
        </mesh>
      )}
    </group>
  )
}

export function Rock({ x, z, scale = 1, snow = false }: { x: number; z: number; scale?: number; snow?: boolean }) {
  return (
    <group position={[x, 0.08 * scale, z]} scale={scale}>
      <mesh castShadow receiveShadow rotation={[0.2, 0.4, 0.1]}>
        <dodecahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color="#8a8f84" roughness={0.95} />
      </mesh>
      <mesh position={[0.18, -0.05, 0.1]} castShadow rotation={[0.1, 1.2, 0]}>
        <dodecahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#6f746c" roughness={0.95} />
      </mesh>
      {snow && (
        <mesh position={[0, 0.18, 0]} castShadow>
          <sphereGeometry args={[0.14, 10, 8]} />
          <meshStandardMaterial color="#f4f8fa" roughness={0.9} />
        </mesh>
      )}
    </group>
  )
}
