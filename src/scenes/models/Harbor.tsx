import { RoundedBox } from '@react-three/drei'
import { DoubleSide } from 'three'
import { BOAT_MAX_LEVEL, HARBOR_MAX_LEVEL, HARBOR_ORIGIN } from '../../game/types'

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
  const lv = Math.max(1, Math.min(BOAT_MAX_LEVEL, level))
  // 船体略大，主要靠配件升级变精致
  const s = 0.92 + lv * 0.055
  const mast = lv >= 2
  const cabin = lv >= 3
  const crates = lv >= 4
  const flag = lv >= 5
  const hull = [
    '#4a2e18',
    '#5a3822',
    '#6a4428',
    '#7a5030',
    '#8a5a38',
    '#9a6640',
    '#aa7248',
    '#ba7e50',
  ][lv - 1]!
  const deck = [
    '#8a6238',
    '#986e40',
    '#a87848',
    '#b48450',
    '#c09058',
    '#c89c60',
    '#d0a868',
    '#d8b470',
  ][lv - 1]!

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
        <meshStandardMaterial color={hull} roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.22, 0.42]} castShadow>
        <boxGeometry args={[2.4, 0.22, 0.08]} />
        <meshStandardMaterial color={hull} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.22, -0.42]} castShadow>
        <boxGeometry args={[2.4, 0.22, 0.08]} />
        <meshStandardMaterial color={hull} roughness={0.82} />
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
        <meshStandardMaterial color={deck} roughness={0.75} />
      </mesh>
      {[-0.55, -0.18, 0.18, 0.55].map((ox, i) => (
        <mesh key={i} position={[ox, 0.34, 0]} castShadow>
          <boxGeometry args={[0.28, 0.02, 0.68]} />
          <meshStandardMaterial color={i % 2 ? deck : hull} roughness={0.8} />
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
          <RoundedBox args={[0.75, 0.55, 0.58]} radius={0.04} position={[-0.7, 0.62, 0]} castShadow>
            <meshStandardMaterial color="#d0ac72" roughness={0.7} />
          </RoundedBox>
          <mesh position={[-0.7, 0.92, 0]} castShadow>
            <boxGeometry args={[0.85, 0.08, 0.65]} />
            <meshStandardMaterial color="#c44b3c" roughness={0.65} />
          </mesh>
          <mesh position={[-0.7, 0.75, 0.3]} castShadow>
            <boxGeometry args={[0.28, 0.18, 0.04]} />
            <meshStandardMaterial color="#7ec8e8" transparent opacity={0.55} />
          </mesh>
          {lv >= 4 && (
            <mesh position={[-0.7, 0.75, -0.3]} castShadow>
              <boxGeometry args={[0.22, 0.14, 0.04]} />
              <meshStandardMaterial color="#7ec8e8" transparent opacity={0.5} />
            </mesh>
          )}
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
          <mesh position={[0.35, 0.48, -0.2]} castShadow>
            <cylinderGeometry args={[0.12, 0.14, 0.28, 10]} />
            <meshStandardMaterial color="#6a4828" />
          </mesh>
        </>
      )}

      {flag && (
        <>
          <mesh position={[-0.1, 2.15, 0.08]} castShadow>
            <boxGeometry args={[0.42, 0.28, 0.035]} />
            <meshStandardMaterial color="#e85a4a" />
          </mesh>
          <mesh position={[-0.1, 2.15, 0.1]}>
            <boxGeometry args={[0.18, 0.12, 0.02]} />
            <meshStandardMaterial color="#f0d78c" metalness={0.3} roughness={0.4} />
          </mesh>
        </>
      )}

      {/* 第二桅（Lv5） */}
      {lv >= 5 && (
        <>
          <mesh position={[0.55, 0.95, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 1.1, 8]} />
            <meshStandardMaterial color="#5c4030" />
          </mesh>
          <mesh position={[0.75, 1.05, 0]} rotation={[0, 0, -0.55]} castShadow>
            <boxGeometry args={[0.025, 0.7, 0.45]} />
            <meshStandardMaterial color="#f8f0e4" roughness={0.65} side={DoubleSide} />
          </mesh>
        </>
      )}

      {/* 船首灯（Lv6） */}
      {lv >= 6 && (
        <mesh position={[1.35, 0.55, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial
            color="#ffe8a0"
            emissive="#ffaa44"
            emissiveIntensity={0.4}
          />
        </mesh>
      )}

      {/* 侧舷网箱（Lv7） */}
      {lv >= 7 && (
        <mesh position={[0.2, 0.55, 0.55]} castShadow>
          <boxGeometry args={[0.9, 0.2, 0.12]} />
          <meshStandardMaterial color="#6a4828" wireframe={false} />
        </mesh>
      )}

      {/* 尾舵加长（Lv8） */}
      {lv >= 8 && (
        <mesh position={[-1.55, 0.15, 0]} castShadow>
          <boxGeometry args={[0.12, 0.55, 0.35]} />
          <meshStandardMaterial color="#3a2414" />
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
  const hl = Math.max(1, Math.min(HARBOR_MAX_LEVEL, harborLevel))
  // 码头略扩，重点加装饰与材质
  const pierW = 4.2 + hl * 0.14
  const pierD = 3.4 + hl * 0.16
  const posts = 4 + hl
  const stallScale = 0.95 + hl * 0.03
  const yaw = Math.atan2(HARBOR_ORIGIN.x, HARBOR_ORIGIN.z)
  const pierWood = [
    '#8a6238',
    '#966c40',
    '#a07848',
    '#ac844f',
    '#b89058',
    '#c09c60',
    '#c8a868',
    '#d0b470',
  ][hl - 1]!
  const pierStone = hl >= 3

  return (
    <group position={[HARBOR_ORIGIN.x, 0, HARBOR_ORIGIN.z]} rotation={[0, yaw, 0]}>
      <RoundedBox args={[pierW * 0.85, 0.18, 1.6]} radius={0.04} position={[0, 0.12, -0.55]} castShadow receiveShadow>
        <meshStandardMaterial color={pierStone ? '#9a968c' : '#b08a55'} roughness={0.9} />
      </RoundedBox>

      <RoundedBox args={[pierW, 0.2, pierD]} radius={0.04} position={[0, 0.16, pierD * 0.35]} castShadow receiveShadow>
        <meshStandardMaterial color={pierWood} roughness={0.85} />
      </RoundedBox>

      {/* 石砌码头边（Lv3+） */}
      {pierStone && (
        <>
          <mesh position={[-pierW / 2 + 0.08, 0.28, pierD * 0.35]} castShadow>
            <boxGeometry args={[0.16, 0.35, pierD * 0.95]} />
            <meshStandardMaterial color="#8a8680" roughness={0.92} />
          </mesh>
          <mesh position={[pierW / 2 - 0.08, 0.28, pierD * 0.35]} castShadow>
            <boxGeometry args={[0.16, 0.35, pierD * 0.95]} />
            <meshStandardMaterial color="#8a8680" roughness={0.92} />
          </mesh>
        </>
      )}
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
            {/* 栏杆链（Lv2+） */}
            {hl >= 2 && i < posts - 1 && (
              <>
                <mesh
                  position={[-pierW / 2 + 0.25, 0.85, pz + (pierD * 0.7) / (2 * Math.max(1, posts - 1))]}
                  castShadow
                >
                  <boxGeometry args={[0.04, 0.04, (pierD * 0.7) / Math.max(1, posts - 1)]} />
                  <meshStandardMaterial color="#6a4828" />
                </mesh>
                <mesh
                  position={[pierW / 2 - 0.25, 0.85, pz + (pierD * 0.7) / (2 * Math.max(1, posts - 1))]}
                  castShadow
                >
                  <boxGeometry args={[0.04, 0.04, (pierD * 0.7) / Math.max(1, posts - 1)]} />
                  <meshStandardMaterial color="#6a4828" />
                </mesh>
              </>
            )}
            {/* 灯笼柱（Lv4+，每隔一根） */}
            {hl >= 4 && i % 2 === 0 && (
              <group position={[pierW / 2 - 0.25, 1.15, pz]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.04, 0.05, 0.55, 6]} />
                  <meshStandardMaterial color="#c9a227" metalness={0.35} roughness={0.4} />
                </mesh>
                <mesh position={[0, 0.35, 0]}>
                  <sphereGeometry args={[0.1, 10, 10]} />
                  <meshStandardMaterial
                    color="#fff0c8"
                    emissive="#ffb060"
                    emissiveIntensity={0.4}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
              </group>
            )}
          </group>
        )
      })}

      <group position={[0, 0, -0.15]} scale={stallScale}>
        <RoundedBox args={[2.4, 0.9, 1.25]} radius={0.05} position={[0, 0.85, 0]} castShadow>
          <meshStandardMaterial
            color={['#c49440', '#d4a24a', '#e0ae52', '#e8b85a', '#f0c262'][hl - 1]}
            roughness={0.65}
          />
        </RoundedBox>
        {/* 摊位立柱雕饰 */}
        {hl >= 2 && (
          <>
            <mesh position={[-1.1, 1.1, 0.55]} castShadow>
              <cylinderGeometry args={[0.06, 0.07, 1.0, 8]} />
              <meshStandardMaterial color="#6e4428" />
            </mesh>
            <mesh position={[1.1, 1.1, 0.55]} castShadow>
              <cylinderGeometry args={[0.06, 0.07, 1.0, 8]} />
              <meshStandardMaterial color="#6e4428" />
            </mesh>
          </>
        )}
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

      {/* 吊货臂（Lv4+） */}
      {hl >= 4 && (
        <group position={[-pierW / 2 + 0.6, 0.9, pierD * 0.75]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.1, 1.8, 8]} />
            <meshStandardMaterial color="#5c4030" />
          </mesh>
          <mesh position={[0.55, 0.7, 0]} rotation={[0, 0, -0.85]} castShadow>
            <boxGeometry args={[0.08, 1.2, 0.08]} />
            <meshStandardMaterial color="#6a4828" />
          </mesh>
          <mesh position={[1.05, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.9, 6]} />
            <meshStandardMaterial color="#c4a878" />
          </mesh>
          {hl >= 5 && (
            <mesh position={[1.05, -0.25, 0]} castShadow>
              <boxGeometry args={[0.22, 0.18, 0.22]} />
              <meshStandardMaterial color="#a07840" />
            </mesh>
          )}
        </group>
      )}

      {/* 码头灯柱（Lv6） */}
      {hl >= 6 && (
        <group position={[pierW / 2 - 0.45, 1.1, pierD * 0.55]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.05, 0.06, 1.6, 8]} />
            <meshStandardMaterial color="#5c4030" />
          </mesh>
          <mesh position={[0, 0.85, 0]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial
              color="#ffe8a0"
              emissive="#ffaa44"
              emissiveIntensity={0.35}
            />
          </mesh>
        </group>
      )}

      {/* 双层货棚顶（Lv7） */}
      {hl >= 7 && (
        <mesh position={[0, 1.55, -0.2]} castShadow>
          <boxGeometry args={[1.8, 0.08, 1.2]} />
          <meshStandardMaterial color="#c44b3c" roughness={0.65} />
        </mesh>
      )}

      {/* 码头旗阵（Lv8） */}
      {hl >= 8 && (
        <group position={[-pierW / 2 + 0.5, 1.4, pierD * 0.2]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.035, 1.4, 6]} />
            <meshStandardMaterial color="#8a6238" />
          </mesh>
          <mesh position={[0.25, 0.45, 0]} castShadow>
            <boxGeometry args={[0.45, 0.28, 0.03]} />
            <meshStandardMaterial color="#4a8fd0" />
          </mesh>
        </group>
      )}

      {/* 缆绳桩装饰（Lv2+） */}
      {hl >= 2 && (
        <group position={[pierW / 2 - 0.7, 0.35, pierD * 0.15]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.14, 0.35, 10]} />
            <meshStandardMaterial color="#5c4030" />
          </mesh>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0.4]} castShadow>
            <torusGeometry args={[0.14, 0.035, 6, 12]} />
            <meshStandardMaterial color="#c4a878" />
          </mesh>
        </group>
      )}

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
