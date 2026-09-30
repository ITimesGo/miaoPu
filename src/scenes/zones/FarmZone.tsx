import { RoundedBox } from '@react-three/drei'
import { FARM_CELL, FARM_ORIGIN_X, FARM_ORIGIN_Z, FARM_SIZE } from '../../game/types'
import { seasonLook } from '../../game/data/seasons'
import { useGameStore } from '../../game/state/gameStore'
import { Bush } from '../models/Trees'
import { WheatPlant } from '../models/Wheat'

const CELL = FARM_CELL

export function FarmZone() {
  const plots = useGameStore((s) => s.plots)
  const season = useGameStore((s) => s.season)
  const look = seasonLook(season)
  const size = FARM_SIZE * CELL
  const center = size / 2 - CELL / 2

  return (
    <group position={[FARM_ORIGIN_X, 0, FARM_ORIGIN_Z]}>
      <RoundedBox
        args={[size + 0.7, 0.22, size + 0.7]}
        radius={0.06}
        position={[center, 0.08, center]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#6a4a36" roughness={0.95} />
      </RoundedBox>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center, 0.2, center]} receiveShadow>
        <planeGeometry args={[size + 0.35, size + 0.35]} />
        <meshStandardMaterial color="#7a5a42" roughness={1} />
      </mesh>

      <FenceFrame size={size} center={center} />

      {plots.map((row, z) =>
        row.map((plot, x) => {
          const color = plot.watered
            ? plot.cropId
              ? season === 'autumn'
                ? '#7a8f38'
                : season === 'winter'
                  ? '#6a7a58'
                  : '#5a8f40'
              : '#3d2a1e'
            : plot.cropId
              ? '#6a5a40'
              : plot.tilled
                ? '#4f3528'
                : look.untilled
          return (
            <group key={`${x}-${z}`} position={[x * CELL, 0.22, z * CELL]}>
              <RoundedBox args={[CELL * 0.88, 0.1, CELL * 0.88]} radius={0.03} receiveShadow>
                <meshStandardMaterial color={color} roughness={0.95} />
              </RoundedBox>
              {plot.cropId === 'wheat' && (
                <group position={[0, 0.06, 0]}>
                  <WheatPlant stage={plot.stage} />
                </group>
              )}
              {look.showSnow && !plot.cropId && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
                  <circleGeometry args={[CELL * 0.32, 12]} />
                  <meshStandardMaterial color="#f2f6f8" roughness={0.9} transparent opacity={0.7} />
                </mesh>
              )}
            </group>
          )
        }),
      )}

      <group position={[-0.8, 0, center]}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 1.4, 8]} />
          <meshStandardMaterial color="#6e4428" />
        </mesh>
        <mesh position={[0, 1.35, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.0, 8]} />
          <meshStandardMaterial color="#6e4428" />
        </mesh>
        <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.2, 12, 10]} />
          <meshStandardMaterial color="#e8d5b0" />
        </mesh>
        <mesh position={[0, 1.78, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.16, 10]} />
          <meshStandardMaterial color="#c44b3c" />
        </mesh>
      </group>

      <Bush x={size + 0.3} z={-0.4} scale={0.85} look={look} />
      <Bush x={-0.5} z={size + 0.2} scale={0.7} look={look} />
    </group>
  )
}

function FenceFrame({ size, center }: { size: number; center: number }) {
  const posts: Array<[number, number]> = []
  for (let i = 0; i <= FARM_SIZE; i++) {
    const p = i * CELL - CELL / 2
    posts.push([-0.35, p], [size + 0.35 - CELL, p], [p, -0.35], [p, size + 0.35 - CELL])
  }

  return (
    <group>
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.55, pz]}>
          <cylinderGeometry args={[0.05, 0.06, 0.9, 6]} />
          <meshStandardMaterial color="#6e4428" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[center, 0.7, -0.35]}>
        <boxGeometry args={[size + 0.5, 0.06, 0.06]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>
      <mesh position={[center, 0.7, size - CELL + 0.35]}>
        <boxGeometry args={[size + 0.5, 0.06, 0.06]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>
      <mesh position={[-0.35, 0.7, center]}>
        <boxGeometry args={[0.06, 0.06, size + 0.5]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>
      <mesh position={[size - CELL + 0.35, 0.7, center]}>
        <boxGeometry args={[0.06, 0.06, size + 0.5]} />
        <meshStandardMaterial color="#8b5a3c" />
      </mesh>
    </group>
  )
}
