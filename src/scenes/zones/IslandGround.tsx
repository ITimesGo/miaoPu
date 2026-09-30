import { useGameStore } from '../../game/state/gameStore'
import { seasonLook } from '../../game/data/seasons'

export function IslandGround() {
  const season = useGameStore((s) => s.season)
  const look = seasonLook(season)

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} receiveShadow>
        <ringGeometry args={[15.5, 22, 64]} />
        <meshStandardMaterial color={look.waterDeep} roughness={0.3} metalness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]} receiveShadow>
        <ringGeometry args={[14.2, 16.2, 64]} />
        <meshStandardMaterial color={look.waterShallow} roughness={0.25} metalness={0.12} transparent opacity={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <ringGeometry args={[13.2, 15.2, 64]} />
        <meshStandardMaterial color={look.sand} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[13.6, 64]} />
        <meshStandardMaterial color={look.grass} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
        <circleGeometry args={[10.5, 48]} />
        <meshStandardMaterial color={look.meadow} roughness={1} />
      </mesh>
      {look.showSnow && (
        <>
          {[
            [-4, 3, 2.2],
            [5, -4, 1.8],
            [-7, -5, 1.5],
            [8, 5, 2.0],
            [1, 7, 1.4],
            [-2, -7, 1.6],
          ].map(([x, z, r], i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x!, 0.012, z!]} receiveShadow>
              <circleGeometry args={[r!, 24]} />
              <meshStandardMaterial color="#f2f6f8" roughness={0.92} transparent opacity={0.85} />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}
