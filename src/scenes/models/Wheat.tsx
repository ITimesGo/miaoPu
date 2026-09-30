/** Visual wheat plant by growth stage (0 sprout → 3 mature). */

type Stalk = {
  x: number
  z: number
  h: number
  lean: number
  yaw: number
  seed: number
}

const STALKS: Stalk[] = [
  { x: -0.2, z: 0.08, h: 1, lean: 0.08, yaw: 0.2, seed: 1 },
  { x: -0.06, z: -0.12, h: 0.94, lean: -0.06, yaw: -0.4, seed: 2 },
  { x: 0.08, z: 0.1, h: 1.05, lean: 0.1, yaw: 0.6, seed: 3 },
  { x: 0.2, z: -0.06, h: 0.98, lean: -0.09, yaw: -0.15, seed: 4 },
  { x: 0.02, z: 0.02, h: 1.08, lean: 0.03, yaw: 0.1, seed: 5 },
]

function Leaf({
  y,
  side,
  len,
  color,
  yaw,
}: {
  y: number
  side: number
  len: number
  color: string
  yaw: number
}) {
  return (
    <mesh
      position={[side * 0.04, y, 0]}
      rotation={[0.35, yaw, side * 0.85]}
      castShadow={false}
    >
      <coneGeometry args={[0.035, len, 5]} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
  )
}

function GrainHead({
  y,
  lean,
  golden,
  dense,
}: {
  y: number
  lean: number
  golden: boolean
  dense: boolean
}) {
  const body = golden ? '#e6c45a' : '#8fbf4e'
  const tip = golden ? '#d4a838' : '#6faa42'
  const awn = golden ? '#c9a040' : '#7aad48'
  const grains = dense ? 5 : 3

  return (
    <group position={[0, y, 0]} rotation={[lean + 0.12, 0, lean * 0.5]}>
      {/* ear body */}
      <mesh position={[0, 0.08, 0]} castShadow={false}>
        <capsuleGeometry args={[0.028, dense ? 0.14 : 0.1, 4, 6]} />
        <meshStandardMaterial color={body} roughness={0.62} />
      </mesh>
      {/* grain kernels */}
      {Array.from({ length: grains }, (_, i) => (
        <mesh
          key={i}
          position={[
            (i % 2 === 0 ? 0.022 : -0.02),
            0.02 + i * 0.032,
            (i % 3 - 1) * 0.012,
          ]}
          castShadow={false}
        >
          <sphereGeometry args={[0.016, 6, 5]} />
          <meshStandardMaterial color={i % 2 ? tip : body} roughness={0.55} />
        </mesh>
      ))}
      {/* awns / beard */}
      {Array.from({ length: dense ? 6 : 3 }, (_, i) => (
        <mesh
          key={`a${i}`}
          position={[(i - 2.5) * 0.012, 0.16 + (i % 3) * 0.02, 0.01]}
          rotation={[0.35 + i * 0.05, 0, (i - 2.5) * 0.12]}
          castShadow={false}
        >
          <cylinderGeometry args={[0.004, 0.003, 0.12 + (i % 2) * 0.04, 4]} />
          <meshStandardMaterial color={awn} roughness={0.75} />
        </mesh>
      ))}
    </group>
  )
}

function Stem({
  stalk,
  heightScale,
  stemColor,
  leafColor,
  showLeaves,
  head,
}: {
  stalk: Stalk
  heightScale: number
  stemColor: string
  leafColor: string
  showLeaves: boolean
  head?: 'green' | 'gold' | null
}) {
  const h = stalk.h * heightScale
  return (
    <group position={[stalk.x, 0, stalk.z]} rotation={[stalk.lean, stalk.yaw, 0]}>
      {/* lower sheath */}
      <mesh position={[0, h * 0.12, 0]} castShadow={false}>
        <cylinderGeometry args={[0.018, 0.028, h * 0.24, 6]} />
        <meshStandardMaterial color={stemColor} roughness={0.88} />
      </mesh>
      {/* main culm */}
      <mesh position={[0, h * 0.48, 0]} castShadow={false}>
        <cylinderGeometry args={[0.012, 0.02, h * 0.72, 6]} />
        <meshStandardMaterial color={stemColor} roughness={0.85} />
      </mesh>
      {/* node rings */}
      <mesh position={[0, h * 0.32, 0]} castShadow={false}>
        <torusGeometry args={[0.018, 0.005, 4, 8]} />
        <meshStandardMaterial color="#4a7a32" roughness={0.8} />
      </mesh>
      <mesh position={[0, h * 0.58, 0]} castShadow={false}>
        <torusGeometry args={[0.014, 0.004, 4, 8]} />
        <meshStandardMaterial color="#4a7a32" roughness={0.8} />
      </mesh>

      {showLeaves && (
        <>
          <Leaf y={h * 0.28} side={1} len={h * 0.28} color={leafColor} yaw={0.2} />
          <Leaf y={h * 0.42} side={-1} len={h * 0.32} color={leafColor} yaw={-0.3} />
          <Leaf y={h * 0.55} side={1} len={h * 0.22} color={leafColor} yaw={0.5} />
        </>
      )}

      {head === 'green' && <GrainHead y={h * 0.82} lean={stalk.lean} golden={false} dense={false} />}
      {head === 'gold' && <GrainHead y={h * 0.82} lean={stalk.lean} golden dense />}
    </group>
  )
}

export function WheatPlant({ stage }: { stage: number }) {
  if (stage <= 0) {
    return (
      <group>
        {[
          { x: -0.06, z: 0.04, h: 0.16, rot: 0.2 },
          { x: 0.05, z: -0.03, h: 0.2, rot: -0.25 },
          { x: 0.02, z: 0.08, h: 0.14, rot: 0.4 },
          { x: -0.02, z: -0.06, h: 0.18, rot: -0.1 },
        ].map((b, i) => (
          <mesh
            key={i}
            position={[b.x, b.h / 2, b.z]}
            rotation={[0.2, b.rot, (i % 2 === 0 ? 0.15 : -0.15)]}
            castShadow={false}
          >
            <coneGeometry args={[0.028, b.h, 5]} />
            <meshStandardMaterial color={i % 2 ? '#8fd86a' : '#6fc050'} roughness={0.8} />
          </mesh>
        ))}
      </group>
    )
  }

  if (stage === 1) {
    return (
      <group>
        {STALKS.slice(0, 4).map((s, i) => (
          <group key={i} position={[s.x * 0.7, 0, s.z * 0.7]} rotation={[s.lean * 0.5, s.yaw, 0]}>
            <mesh position={[0, 0.2, 0]} castShadow={false}>
              <cylinderGeometry args={[0.012, 0.02, 0.4, 5]} />
              <meshStandardMaterial color="#6db84a" roughness={0.85} />
            </mesh>
            <Leaf y={0.22} side={1} len={0.22} color="#7ec85a" yaw={0.1} />
            <Leaf y={0.28} side={-1} len={0.18} color="#68b848" yaw={-0.2} />
            <mesh position={[0, 0.42, 0]} castShadow={false} rotation={[0.15, 0, 0]}>
              <coneGeometry args={[0.03, 0.12, 5]} />
              <meshStandardMaterial color="#8fd86a" roughness={0.75} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }

  if (stage === 2) {
    return (
      <group>
        {STALKS.map((s, i) => (
          <Stem
            key={i}
            stalk={s}
            heightScale={0.78}
            stemColor="#5a9e3e"
            leafColor="#6fbf4a"
            showLeaves
            head="green"
          />
        ))}
      </group>
    )
  }

  return (
    <group>
      {STALKS.map((s, i) => (
        <Stem
          key={i}
          stalk={s}
          heightScale={1}
          stemColor="#7a9a45"
          leafColor="#8aaa48"
          showLeaves
          head="gold"
        />
      ))}
    </group>
  )
}
