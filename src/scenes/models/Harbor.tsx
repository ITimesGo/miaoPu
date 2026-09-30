import { RoundedBox } from '@react-three/drei'
import { DoubleSide } from 'three'
import { HARBOR_ORIGIN } from '../../game/types'

function Boat({
  level,
  pierW,
  pierD,
  visible = true,
}: {
  level: number
  pierW: number
  pierD: number
  visible?: boolean
}) {
  if (!visible) return null
  const s = 0.9 + level * 0.16
  const mast = level >= 2
  const cabin = level >= 3
  const crates = level >= 4
  const flag = level >= 5

  // Dock beside the pier (clear of deck width), hull parallel to pier length (+Z).
  const sideGap = pierW / 2 + 1.55
  const along = pierD * 0.42

  return (
    <group position={[sideGap, -0.1, along]} rotation={[0, Math.PI / 2, 0]} scale={s}>
      <mesh position={[0, -0.08, 0]} castShadow>
        <boxGeometry args={[2.2, 0.14, 0.35]} />
        <meshStandardMaterial color="#2e1c10" roughness={0.92} />
      </mesh>

      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[2.55, 0.28, 0.88]} />
        <meshStandardMaterial color="#5a3822" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.22, 0.42]} castShadow>
        <boxGeometry args={[2.4, 0.22, 0.08]} />
        <meshStandardMaterial color="#6b4428" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.22, -0.42]} castShadow>
        <boxGeometry args={[2.4, 0.22, 0.08]} />
        <meshStandardMaterial color="#6b4428" roughness={0.82} />
      </mesh>

      <mesh position={[1.4, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.46, 0.85, 8]} />
        <meshStandardMaterial color="#4a2e18" roughness={0.86} />
      </mesh>
      <mesh position={[1.55, 0.28, 0]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.08]} />
        <meshStandardMaterial color="#3a2414" />
      </mesh>

      <mesh position={[-1.28, 0.18, 0]} castShadow>
        <boxGeometry args={[0.16, 0.42, 0.86]} />
        <meshStandardMaterial color="#4a2e18" roughness={0.88} />
      </mesh>
      <mesh position={[-1.45, 0.02, 0]} castShadow>
        <boxGeometry args={[0.08, 0.35, 0.22]} />
        <meshStandardMaterial color="#3a2414" />
      </mesh>

      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[2.15, 0.06, 0.72]} />
        <meshStandardMaterial color="#a87848" roughness={0.75} />
      </mesh>
      {[-0.55, -0.18, 0.18, 0.55].map((ox, i) => (
        <mesh key={i} position={[ox, 0.34, 0]} castShadow>
          <boxGeometry args={[0.28, 0.02, 0.68]} />
          <meshStandardMaterial color={i % 2 ? '#9a6a3c' : '#8a5a32'} roughness={0.8} />
        </mesh>
      ))}

      <mesh position={[0.05, 0.42, 0.38]} castShadow>
        <boxGeometry args={[2.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#3a2414" />
      </mesh>
      <mesh position={[0.05, 0.42, -0.38]} castShadow>
        <boxGeometry args={[2.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#3a2414" />
      </mesh>
      {[-0.7, 0, 0.7].map((ox, i) => (
        <group key={`rail${i}`}>
          <mesh position={[ox, 0.52, 0.38]} castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.2, 6]} />
            <meshStandardMaterial color="#3a2414" />
          </mesh>
          <mesh position={[ox, 0.52, -0.38]} castShadow>
            <cylinderGeometry args={[0.02, 0.025, 0.2, 6]} />
            <meshStandardMaterial color="#3a2414" />
          </mesh>
        </group>
      ))}

      <mesh position={[0.05, -0.02, 0]} castShadow>
        <boxGeometry args={[2.5, 0.04, 0.92]} />
        <meshStandardMaterial color="#d4af37" roughness={0.55} metalness={0.2} />
      </mesh>

      <mesh position={[0.35, 0.38, 0]} castShadow>
        <boxGeometry args={[0.12, 0.05, 0.7]} />
        <meshStandardMaterial color="#7a5530" />
      </mesh>
      <mesh position={[-0.35, 0.38, 0]} castShadow>
        <boxGeometry args={[0.12, 0.05, 0.7]} />
        <meshStandardMaterial color="#7a5530" />
      </mesh>

      <mesh position={[0.15, 0.42, 0.22]} rotation={[0, 0.15, 0.05]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 1.5, 6]} />
        <meshStandardMaterial color="#6a4828" />
      </mesh>
      <mesh position={[0.9, 0.42, 0.22]} rotation={[0.1, 0, 0.4]} castShadow>
        <boxGeometry args={[0.12, 0.02, 0.2]} />
        <meshStandardMaterial color="#5a3820" />
      </mesh>

      <mesh position={[1.15, 0.4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.06, 0.08]} />
        <meshStandardMaterial color="#c9a227" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[1.0, 0.48, 0.35]} rotation={[0.3, 0.4, 0.2]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.9, 6]} />
        <meshStandardMaterial color="#c4a878" />
      </mesh>

      {mast && (
        <>
          <mesh position={[-0.1, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.055, 1.75, 8]} />
            <meshStandardMaterial color="#5c4030" />
          </mesh>
          <mesh position={[-0.1, 2.05, 0]} castShadow>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#3a2414" />
          </mesh>
          <mesh position={[0.3, 1.35, 0]} rotation={[0, 0, -0.5]} castShadow>
            <boxGeometry args={[0.035, 1.25, 0.8]} />
            <meshStandardMaterial color="#f2eadc" roughness={0.68} side={DoubleSide} />
          </mesh>
          <mesh position={[-0.1, 0.55, 0]} castShadow>
            <boxGeometry args={[0.5, 0.08, 0.08]} />
            <meshStandardMaterial color="#4a2e18" />
          </mesh>
        </>
      )}

      {cabin && (
        <>
          <RoundedBox args={[0.7, 0.5, 0.55]} radius={0.04} position={[-0.7, 0.6, 0]} castShadow>
            <meshStandardMaterial color="#c4a06a" roughness={0.75} />
          </RoundedBox>
          <mesh position={[-0.7, 0.72, 0.28]} castShadow>
            <boxGeometry args={[0.25, 0.16, 0.04]} />
            <meshStandardMaterial color="#7ec8e8" transparent opacity={0.55} />
          </mesh>
        </>
      )}

      {crates && (
        <>
          <mesh position={[0.55, 0.5, 0.12]} castShadow>
            <boxGeometry args={[0.32, 0.26, 0.26]} />
            <meshStandardMaterial color="#a07840" />
          </mesh>
          <mesh position={[0.85, 0.44, -0.14]} castShadow>
            <boxGeometry args={[0.26, 0.2, 0.26]} />
            <meshStandardMaterial color="#8a6238" />
          </mesh>
          <mesh position={[0.55, 0.62, 0.12]} castShadow>
            <torusGeometry args={[0.06, 0.015, 6, 10]} />
            <meshStandardMaterial color="#c9a227" metalness={0.3} />
          </mesh>
        </>
      )}

      {flag && (
        <mesh position={[-0.1, 2.15, 0.08]} castShadow>
          <boxGeometry args={[0.4, 0.26, 0.035]} />
          <meshStandardMaterial color="#e85a4a" />
        </mesh>
      )}
    </group>
  )
}

export function HarborModel({
  harborLevel = 1,
  boatLevel = 1,
  merchant = false,
  boatAway = false,
}: {
  harborLevel?: number
  boatLevel?: number
  merchant?: boolean
  boatAway?: boolean
}) {
  const pierW = 4.2 + harborLevel * 0.35
  const pierD = 3.4 + harborLevel * 0.35
  const posts = 4 + harborLevel
  const stallScale = 0.9 + harborLevel * 0.08
  const yaw = Math.atan2(HARBOR_ORIGIN.x, HARBOR_ORIGIN.z)

  return (
    <group position={[HARBOR_ORIGIN.x, 0, HARBOR_ORIGIN.z]} rotation={[0, yaw, 0]}>
      <RoundedBox args={[pierW * 0.85, 0.18, 1.6]} radius={0.04} position={[0, 0.12, -0.55]} castShadow receiveShadow>
        <meshStandardMaterial color="#b08a55" roughness={0.9} />
      </RoundedBox>

      <RoundedBox args={[pierW, 0.2, pierD]} radius={0.04} position={[0, 0.16, pierD * 0.35]} castShadow receiveShadow>
        <meshStandardMaterial color="#a07848" roughness={0.85} />
      </RoundedBox>
      {Array.from({ length: posts + 1 }, (_, i) => (
        <mesh key={`plank${i}`} position={[0, 0.28, 0.15 + i * ((pierD - 0.4) / posts)]} castShadow>
          <boxGeometry args={[pierW - 0.35, 0.04, 0.42]} />
          <meshStandardMaterial color={i % 2 ? '#8d6840' : '#9a7348'} roughness={0.9} />
        </mesh>
      ))}

      {Array.from({ length: posts }, (_, i) => {
        const t = i / Math.max(1, posts - 1)
        const pz = 0.2 + t * (pierD * 0.7)
        return (
          <group key={`post${i}`}>
            <mesh position={[-pierW / 2 + 0.25, 0.35, pz]} castShadow>
              <cylinderGeometry args={[0.11, 0.13, 1.1 + t * 0.35, 8]} />
              <meshStandardMaterial color="#5c4030" roughness={0.9} />
            </mesh>
            <mesh position={[pierW / 2 - 0.25, 0.35, pz]} castShadow>
              <cylinderGeometry args={[0.11, 0.13, 1.1 + t * 0.35, 8]} />
              <meshStandardMaterial color="#5c4030" roughness={0.9} />
            </mesh>
          </group>
        )
      })}

      <group position={[0, 0, -0.15]} scale={stallScale}>
        <RoundedBox args={[2.4, 0.9, 1.25]} radius={0.05} position={[0, 0.85, 0]} castShadow>
          <meshStandardMaterial color="#d4a24a" roughness={0.7} />
        </RoundedBox>
        <mesh position={[-0.65, 1.4, 0.18]} castShadow>
          <sphereGeometry args={[0.14, 10, 10]} />
          <meshStandardMaterial color="#e85d4a" />
        </mesh>
        <mesh position={[-0.3, 1.38, 0.2]} castShadow>
          <sphereGeometry args={[0.12, 10, 10]} />
          <meshStandardMaterial color="#f0c040" />
        </mesh>
        <mesh position={[0.1, 1.36, 0.12]} castShadow>
          <boxGeometry args={[0.3, 0.18, 0.2]} />
          <meshStandardMaterial color="#6b8e3a" />
        </mesh>
        {harborLevel >= 2 && (
          <mesh position={[0.45, 1.38, 0.15]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.2, 8]} />
            <meshStandardMaterial color="#c9a227" metalness={0.35} roughness={0.45} />
          </mesh>
        )}
        {harborLevel >= 3 && (
          <mesh position={[0.75, 1.34, 0.08]} castShadow>
            <boxGeometry args={[0.26, 0.16, 0.18]} />
            <meshStandardMaterial color="#8b6238" />
          </mesh>
        )}
        <mesh position={[-0.95, 1.85, -0.3]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 1.4, 6]} />
          <meshStandardMaterial color="#5c4030" />
        </mesh>
        <mesh position={[0.95, 1.85, -0.3]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 1.4, 6]} />
          <meshStandardMaterial color="#5c4030" />
        </mesh>
        <mesh position={[0, 2.55, 0]} rotation={[-0.12, 0, 0]} castShadow>
          <boxGeometry args={[2.6, 0.08, 1.7]} />
          <meshStandardMaterial color={harborLevel >= 4 ? '#c44b3c' : '#e85a4a'} roughness={0.75} />
        </mesh>
        {harborLevel >= 5 && (
          <mesh position={[0, 2.85, -0.15]} castShadow>
            <boxGeometry args={[0.48, 0.32, 0.06]} />
            <meshStandardMaterial color="#f0d78c" />
          </mesh>
        )}
      </group>

      <RoundedBox args={[0.5, 0.4, 0.5]} radius={0.03} position={[1.4, 0.5, 0.6]} castShadow>
        <meshStandardMaterial color="#8b6238" roughness={0.85} />
      </RoundedBox>

      {harborLevel >= 3 && (
        <group position={[-1.6, 0.4, 0.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.65, 0.45, 0.45]} />
            <meshStandardMaterial color="#7a5530" />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.5, 0.18, 0.35]} />
            <meshStandardMaterial color="#e8d5a8" />
          </mesh>
        </group>
      )}

      <mesh position={[pierW / 2 + 0.55, 0.45, pierD * 0.4]} rotation={[0, 0, -0.55]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.3, 6]} />
        <meshStandardMaterial color="#c4a878" />
      </mesh>

      <Boat level={boatLevel} pierW={pierW} pierD={pierD} visible={!boatAway} />

      {merchant && (
        <group position={[-pierW / 2 - 2.2, -0.05, pierD * 0.55]} rotation={[0, -Math.PI / 2, 0]} scale={0.85}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[2.1, 0.24, 0.72]} />
            <meshStandardMaterial color="#3a4a68" roughness={0.8} />
          </mesh>
          <mesh position={[0.9, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
            <coneGeometry args={[0.38, 0.7, 7]} />
            <meshStandardMaterial color="#2a3a52" roughness={0.82} />
          </mesh>
          <mesh position={[-0.2, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 1.5, 6]} />
            <meshStandardMaterial color="#5c4030" />
          </mesh>
          <mesh position={[0.15, 1.15, 0]} rotation={[0, 0, -0.45]} castShadow>
            <boxGeometry args={[0.03, 1.0, 0.7]} />
            <meshStandardMaterial color="#e8c040" roughness={0.65} side={DoubleSide} />
          </mesh>
          <mesh position={[-0.2, 1.85, 0.08]} castShadow>
            <boxGeometry args={[0.35, 0.22, 0.03]} />
            <meshStandardMaterial color="#e85a4a" />
          </mesh>
        </group>
      )}
    </group>
  )
}
