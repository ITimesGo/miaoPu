import type { SeasonLook } from '../../game/data/seasons'

interface MountainProps {
  look: SeasonLook
  x?: number
  z?: number
  /** Overall size — big ~1.05, small ~0.62 */
  scale?: number
  /** Only the working mine mountain needs a tunnel */
  hasMine?: boolean
  yaw?: number
}

/** Rocky hill; optional mine entrance for the large peak. */
export function Mountain({
  look,
  x = -8.4,
  z = -6.0,
  scale = 1,
  hasMine = false,
  yaw = 0,
}: MountainProps) {
  const snow = look.showSnow
  const rock = snow ? '#8a9298' : '#7a7870'
  const rockMid = snow ? '#6e767c' : '#5e5c54'
  const rockDark = snow ? '#525860' : '#45433c'
  const rockLight = snow ? '#a8b0b6' : '#9a968c'
  const moss = look.hillDark
  const ore = '#c9a227'
  const oreDark = '#8a7020'

  return (
    <group position={[x, 0, z]} scale={scale} rotation={[0, yaw, 0]}>
      <mesh position={[0, 1.0, -0.2]} castShadow receiveShadow scale={[1.2, 1.35, 1.05]} rotation={[0.05, 0.3, 0]}>
        <dodecahedronGeometry args={[2.1, 0]} />
        <meshStandardMaterial color={rockMid} roughness={0.96} flatShading />
      </mesh>
      <mesh position={[1.4, 1.5, -0.8]} castShadow receiveShadow scale={[0.9, 1.15, 0.85]} rotation={[0.2, -0.4, 0.1]}>
        <dodecahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color={rock} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-1.3, 1.7, -1.0]} castShadow receiveShadow scale={[0.75, 1.25, 0.8]} rotation={[-0.1, 0.6, -0.1]}>
        <dodecahedronGeometry args={[1.35, 0]} />
        <meshStandardMaterial color={rockDark} roughness={0.97} flatShading />
      </mesh>
      <mesh position={[0.2, 2.5, -0.9]} castShadow receiveShadow scale={[0.7, 0.9, 0.65]} rotation={[0.15, 0.2, 0]}>
        <dodecahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color={rockLight} roughness={0.94} flatShading />
      </mesh>

      <mesh position={[0, 0.35, 0.4]} castShadow receiveShadow scale={[1.5, 0.45, 1.3]}>
        <sphereGeometry args={[2.0, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={rockDark} roughness={0.98} />
      </mesh>
      <mesh position={[-0.6, 0.55, 0.9]} castShadow scale={[0.7, 0.25, 0.55]}>
        <sphereGeometry args={[1.1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={moss} roughness={0.95} />
      </mesh>
      <mesh position={[1.1, 0.5, 0.6]} castShadow scale={[0.55, 0.2, 0.45]}>
        <sphereGeometry args={[0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={moss} roughness={0.95} />
      </mesh>

      <mesh position={[0.2, 1.15, 1.55]} rotation={[0.12, -0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.9, 1.8, 0.65]} />
        <meshStandardMaterial color={rockDark} roughness={0.98} flatShading />
      </mesh>
      <mesh position={[-0.5, 1.55, 1.75]} rotation={[0.08, 0.25, -0.05]} castShadow>
        <boxGeometry args={[1.5, 1.1, 0.4]} />
        <meshStandardMaterial color={rockMid} roughness={0.96} flatShading />
      </mesh>
      <mesh position={[1.0, 1.35, 1.7]} rotation={[0.1, -0.3, 0.05]} castShadow>
        <boxGeometry args={[1.1, 0.9, 0.35]} />
        <meshStandardMaterial color={rock} roughness={0.95} flatShading />
      </mesh>

      {hasMine && (
        <>
          <mesh position={[0.1, 0.55, 1.95]} castShadow>
            <boxGeometry args={[0.95, 1.0, 0.4]} />
            <meshStandardMaterial color="#141210" roughness={1} />
          </mesh>
          <mesh position={[0.1, 1.1, 1.95]} castShadow>
            <cylinderGeometry args={[0.52, 0.58, 0.22, 12, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#1e1a16" roughness={1} />
          </mesh>
          <mesh position={[-0.42, 0.55, 2.08]} castShadow>
            <boxGeometry args={[0.12, 1.05, 0.12]} />
            <meshStandardMaterial color="#5c4030" />
          </mesh>
          <mesh position={[0.62, 0.55, 2.08]} castShadow>
            <boxGeometry args={[0.12, 1.05, 0.12]} />
            <meshStandardMaterial color="#5c4030" />
          </mesh>
          <mesh position={[0.1, 1.12, 2.08]} castShadow>
            <boxGeometry args={[1.2, 0.12, 0.14]} />
            <meshStandardMaterial color="#6a4828" />
          </mesh>
          <mesh position={[0.85, 1.0, 2.0]} castShadow>
            <cylinderGeometry args={[0.03, 0.035, 0.35, 6]} />
            <meshStandardMaterial color="#4a3020" />
          </mesh>
          <mesh position={[0.85, 1.22, 2.0]} castShadow>
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshStandardMaterial color="#f0c040" emissive="#f0a020" emissiveIntensity={0.45} />
          </mesh>
          <mesh position={[0.15, 0.12, 2.55]} castShadow>
            <boxGeometry args={[0.7, 0.06, 0.9]} />
            <meshStandardMaterial color="#3a3028" />
          </mesh>
          <mesh position={[-0.12, 0.16, 2.55]} castShadow>
            <boxGeometry args={[0.05, 0.04, 0.85]} />
            <meshStandardMaterial color="#6a6a70" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0.42, 0.16, 2.55]} castShadow>
            <boxGeometry args={[0.05, 0.04, 0.85]} />
            <meshStandardMaterial color="#6a6a70" metalness={0.4} roughness={0.5} />
          </mesh>
        </>
      )}

      {(hasMine
        ? [
            [0.95, 1.35, 1.65],
            [-0.7, 1.75, 1.55],
            [1.45, 2.05, 0.15],
            [-1.35, 2.0, 0.35],
            [0.35, 2.7, -0.55],
            [-0.2, 1.9, 1.8],
          ]
        : [
            [0.7, 1.5, 1.2],
            [-0.5, 1.9, 0.8],
            [1.0, 2.1, -0.2],
            [-0.9, 1.7, 0.3],
          ]
      ).map(([px, py, pz], i) => (
        <mesh key={`ore${i}`} position={[px!, py!, pz!]} rotation={[0.3, i * 0.9, 0.2]} castShadow>
          <octahedronGeometry args={[0.11 + (i % 3) * 0.035, 0]} />
          <meshStandardMaterial
            color={i % 2 ? ore : oreDark}
            roughness={0.32}
            metalness={0.6}
            emissive={ore}
            emissiveIntensity={0.18}
          />
        </mesh>
      ))}

      {[
        [1.2, 0.22, 2.15, 0.38],
        [1.55, 0.16, 1.85, 0.24],
        [-1.0, 0.2, 2.05, 0.3],
        [-1.5, 0.18, 1.4, 0.28],
        [0.4, 0.15, 2.35, 0.2],
      ].map(([px, py, pz, r], i) => (
        <mesh key={`rock${i}`} position={[px!, py!, pz!]} rotation={[0.2 * i, i, 0.1]} castShadow>
          <dodecahedronGeometry args={[r!, 0]} />
          <meshStandardMaterial color={i % 2 ? rock : rockDark} roughness={0.95} flatShading />
        </mesh>
      ))}

      {snow && (
        <>
          <mesh position={[-0.9, 2.7, -0.8]} castShadow scale={[1.0, 0.32, 0.9]}>
            <sphereGeometry args={[1.0, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#f2f6f8" roughness={0.9} />
          </mesh>
          <mesh position={[1.1, 2.4, -0.5]} castShadow scale={[0.75, 0.28, 0.7]}>
            <sphereGeometry args={[0.85, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e8eef2" roughness={0.9} />
          </mesh>
        </>
      )}
    </group>
  )
}
