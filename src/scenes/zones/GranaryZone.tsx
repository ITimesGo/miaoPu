import { RoundedBox } from '@react-three/drei'
import { useGameStore } from '../../game/state/gameStore'
import { GRANARY_MAX_LEVEL, GRANARY_POS, granaryYaw } from '../../game/types'

export function GranaryZone() {
  const level = useGameStore((s) => s.granary.level)
  const condition = useGameStore((s) => s.granary.condition)

  if (level <= 0) return null

  const lv = Math.max(1, Math.min(GRANARY_MAX_LEVEL, level))
  const worn = condition < 40
  const wood = worn
    ? '#6a5040'
    : [
        '#8a6840',
        '#986e44',
        '#a87848',
        '#b48450',
        '#c09058',
        '#c89c60',
        '#d0a868',
        '#d8b470',
      ][lv - 1]!
  const roof = worn
    ? '#7a5048'
    : [
        '#b04038',
        '#c44b3c',
        '#d05444',
        '#dc6050',
        '#e87060',
        '#f07868',
        '#f88878',
        '#ff9888',
      ][lv - 1]!
  const trim = worn ? '#5a4030' : '#6e4a30'
  const yaw = granaryYaw()
  // 轻微变大，主要靠结构变复杂
  const scale = 0.92 + lv * 0.035
  const bodyH = 1.45 + lv * 0.12
  const bodyY = bodyH / 2 + 0.15

  return (
    <group position={[GRANARY_POS.x, 0, GRANARY_POS.z]} rotation={[0, yaw, 0]} scale={scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.15]} receiveShadow>
        <planeGeometry args={[2.8 + lv * 0.15, 2.6 + lv * 0.1]} />
        <meshStandardMaterial color="#6a8a55" roughness={1} />
      </mesh>

      {/* 石基 */}
      <RoundedBox
        args={[2.35, 0.28, 1.95]}
        radius={0.04}
        position={[0, 0.16, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={worn ? '#6a665c' : '#8a8680'} roughness={0.95} />
      </RoundedBox>

      <RoundedBox
        args={[2.15 + (lv >= 4 ? 0.2 : 0), bodyH, 1.75]}
        radius={0.06}
        position={[0, bodyY, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={wood} roughness={0.82} />
      </RoundedBox>

      {/* 木板横纹 */}
      {Array.from({ length: 2 + lv }, (_, i) => (
        <mesh
          key={`plank${i}`}
          position={[0, 0.55 + i * (bodyH / (2 + lv)), 0.88]}
          castShadow
        >
          <boxGeometry args={[2.05, 0.05, 0.04]} />
          <meshStandardMaterial color={trim} roughness={0.88} />
        </mesh>
      ))}

      {/* 四角立柱（Lv2+） */}
      {lv >= 2 &&
        [
          [-1.0, 0.95],
          [1.0, 0.95],
          [-1.0, -0.8],
          [1.0, -0.8],
        ].map(([ox, oz], i) => (
          <mesh key={`post${i}`} position={[ox!, bodyY, oz!]} castShadow>
            <boxGeometry args={[0.12, bodyH + 0.1, 0.12]} />
            <meshStandardMaterial color={trim} roughness={0.85} />
          </mesh>
        ))}

      {/* 屋顶：低级锥顶 → 高级双坡 */}
      {lv <= 2 ? (
        <mesh position={[0, bodyY + bodyH / 2 + 0.35, 0]} castShadow>
          <coneGeometry args={[1.55 + lv * 0.08, 0.85 + lv * 0.08, 4]} />
          <meshStandardMaterial color={roof} roughness={0.68} />
        </mesh>
      ) : (
        <group position={[0, bodyY + bodyH / 2 + 0.15, 0]}>
          <mesh position={[0, 0.35, 0]} rotation={[0, 0, 0.38]} castShadow>
            <boxGeometry args={[1.5, 0.12, 2.0]} />
            <meshStandardMaterial color={roof} roughness={0.62} />
          </mesh>
          <mesh position={[0, 0.35, 0]} rotation={[0, 0, -0.38]} castShadow>
            <boxGeometry args={[1.5, 0.12, 2.0]} />
            <meshStandardMaterial
              color={worn ? roof : '#c8483c'}
              roughness={0.62}
            />
          </mesh>
          <mesh position={[0, 0.62, 0]} castShadow>
            <boxGeometry args={[0.14, 0.12, 2.05]} />
            <meshStandardMaterial color="#8a3228" roughness={0.55} />
          </mesh>
        </group>
      )}

      {/* 侧仓筒（Lv3+） */}
      {lv >= 3 && (
        <group position={[1.35, 0.85, -0.15]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.45, 0.5, 1.5, 12]} />
            <meshStandardMaterial color={wood} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.85, 0]} castShadow>
            <coneGeometry args={[0.52, 0.4, 10]} />
            <meshStandardMaterial color={roof} roughness={0.65} />
          </mesh>
          {lv >= 4 && (
            <mesh position={[0.42, 0.2, 0]} castShadow>
              <boxGeometry args={[0.35, 0.08, 0.35]} />
              <meshStandardMaterial color={trim} />
            </mesh>
          )}
        </group>
      )}

      {/* 装货坡道（Lv4+） */}
      {lv >= 4 && (
        <mesh position={[0.9, 0.22, 1.15]} rotation={[-0.35, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.08, 1.1]} />
          <meshStandardMaterial color="#8a6a40" roughness={0.9} />
        </mesh>
      )}

      {/* 梯子（Lv2+） */}
      {lv >= 2 && (
        <group position={[-1.15, 0.9, 0.4]} rotation={[0, 0.15, 0]}>
          <mesh position={[-0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 1.6, 0.05]} />
            <meshStandardMaterial color={trim} />
          </mesh>
          <mesh position={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 1.6, 0.05]} />
            <meshStandardMaterial color={trim} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[0, -0.6 + i * 0.28, 0]} castShadow>
              <boxGeometry args={[0.28, 0.04, 0.05]} />
              <meshStandardMaterial color="#7a5530" />
            </mesh>
          ))}
        </group>
      )}

      {/* 通气窗（Lv3+） */}
      {lv >= 3 && (
        <mesh position={[0, bodyY + 0.35, 0.9]} castShadow>
          <boxGeometry args={[0.45, 0.35, 0.06]} />
          <meshStandardMaterial color="#5a4030" />
        </mesh>
      )}
      {lv >= 3 && (
        <mesh position={[0, bodyY + 0.35, 0.93]}>
          <boxGeometry args={[0.32, 0.22, 0.04]} />
          <meshStandardMaterial color="#7eb8d0" transparent opacity={0.45} roughness={0.2} />
        </mesh>
      )}

      <mesh position={[0, 0.55, 0.92]} castShadow>
        <boxGeometry args={[0.55, 0.7, 0.08]} />
        <meshStandardMaterial color="#5c4030" />
      </mesh>
      <mesh position={[0, 0.45, 1.15]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.08, 0.45]} />
        <meshStandardMaterial color="#8a6a40" roughness={0.9} />
      </mesh>

      {/* 门楣铜饰等级珠 */}
      {Array.from({ length: lv }, (_, i) => (
        <mesh key={i} position={[-0.55 + i * 0.28, bodyY + bodyH / 2 - 0.25, 0.92]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial
            color="#f0d78c"
            metalness={0.35}
            roughness={0.4}
            emissive="#806020"
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}

      {/* 风向标（Lv5） */}
      {lv >= 5 && (
        <group position={[0, bodyY + bodyH / 2 + 0.95, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.04, 0.5, 6]} />
            <meshStandardMaterial color="#c9a227" metalness={0.45} roughness={0.35} />
          </mesh>
          <mesh position={[0.2, 0.1, 0]} rotation={[0, 0, -0.25]} castShadow>
            <boxGeometry args={[0.4, 0.1, 0.04]} />
            <meshStandardMaterial color="#e8c040" metalness={0.35} roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* 粮袋堆（Lv4+） */}
      {lv >= 4 && (
        <group position={[-0.85, 0.35, 1.2]}>
          <mesh castShadow>
            <boxGeometry args={[0.35, 0.28, 0.28]} />
            <meshStandardMaterial color="#c4a878" />
          </mesh>
          <mesh position={[0.28, -0.02, 0.05]} castShadow>
            <boxGeometry args={[0.28, 0.22, 0.24]} />
            <meshStandardMaterial color="#b89860" />
          </mesh>
        </group>
      )}

      {/* 第二侧仓（Lv6） */}
      {lv >= 6 && (
        <group position={[-1.35, 0.85, -0.15]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.4, 0.45, 1.35, 12]} />
            <meshStandardMaterial color={wood} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.78, 0]} castShadow>
            <coneGeometry args={[0.48, 0.35, 10]} />
            <meshStandardMaterial color={roof} roughness={0.65} />
          </mesh>
        </group>
      )}

      {/* 屋顶天窗（Lv7） */}
      {lv >= 7 && (
        <mesh position={[0.35, bodyY + bodyH / 2 + 0.55, 0]} castShadow>
          <boxGeometry args={[0.35, 0.28, 0.5]} />
          <meshStandardMaterial color="#7eb8d0" transparent opacity={0.5} roughness={0.2} />
        </mesh>
      )}

      {/* 升降吊斗架（Lv8） */}
      {lv >= 8 && (
        <group position={[1.1, bodyY + 0.2, 1.0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.04, 0.05, 1.4, 6]} />
            <meshStandardMaterial color={trim} />
          </mesh>
          <mesh position={[0.35, 0.55, 0]} rotation={[0, 0, -0.7]} castShadow>
            <boxGeometry args={[0.06, 0.7, 0.06]} />
            <meshStandardMaterial color="#6a4828" />
          </mesh>
          <mesh position={[0.7, 0.15, 0]} castShadow>
            <boxGeometry args={[0.28, 0.22, 0.28]} />
            <meshStandardMaterial color="#a07840" />
          </mesh>
        </group>
      )}
    </group>
  )
}
