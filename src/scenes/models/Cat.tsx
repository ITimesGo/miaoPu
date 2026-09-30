import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import { Color, DoubleSide, type Group } from 'three'
import type { CatPalette, CoatPattern, CatRole } from '../../game/types'

export type CatMotion = 'idle' | 'walk' | 'work' | 'chop' | 'farm' | 'fish' | 'sleep'
export type { CatRole }

interface CatModelProps {
  palette: CatPalette
  animOffset?: number
  motion?: CatMotion
  /** 即时动作（useFrame 内写入，不依赖 React 重渲染） */
  motionRef?: MutableRefObject<CatMotion>
  bodyScale?: number
  role?: CatRole
}

/**
 * 精致直立猫猫人：大头短身 + 花纹分层 + 职业小装。
 * chop = 拉锯；farm = 挥锄；work = 采矿等通用劳作。
 */
export function CatModel({
  palette,
  animOffset = 0,
  motion = 'idle',
  motionRef,
  bodyScale = 1,
  role = 'farmer',
}: CatModelProps) {
  const wrap = useRef<Group>(null)
  const root = useRef<Group>(null)
  const lArm = useRef<Group>(null)
  const rArm = useRef<Group>(null)
  const lLeg = useRef<Group>(null)
  const rLeg = useRef<Group>(null)
  const tail = useRef<Group>(null)
  const tool = useRef<Group>(null)
  const head = useRef<Group>(null)
  const backRod = useRef<Group>(null)
  const handRod = useRef<Group>(null)
  const bucket = useRef<Group>(null)

  const c = useMemo(() => tintPalette(palette), [palette])

  useFrame((state) => {
    const m = motionRef?.current ?? motion
    const walk = m === 'walk'
    const work = m === 'work'
    const chop = m === 'chop'
    const farm = m === 'farm'
    const fish = m === 'fish'
    const sleep = m === 'sleep'
    const speed = walk ? 9 : chop ? 10 : farm ? 8.5 : fish ? 6.2 : work ? 7.5 : 2.4
    const t = state.clock.elapsedTime * speed + animOffset
    const a = sleep ? 0 : Math.sin(t)
    const b = -a
    const swing = Math.sin(t)
    // 甩竿：抬起 → 向前抛
    const cast = Math.sin(t * 0.85)
    const castFwd = Math.max(0, cast)

    if (backRod.current) backRod.current.visible = role === 'fisher' && !fish && !sleep
    if (handRod.current) handRod.current.visible = role === 'fisher' && fish
    if (bucket.current) {
      bucket.current.visible = role === 'fisher' && !sleep
      if (fish) {
        bucket.current.position.set(-0.32, 0.06, 0.18)
        bucket.current.rotation.set(0, 0.4, 0)
      } else {
        bucket.current.position.set(-0.2, 0.28, 0.06)
        bucket.current.rotation.set(0.15, 0.2, 0.35)
      }
    }

    if (lArm.current) {
      if (sleep) lArm.current.rotation.set(0.4, 0, 0.15)
      else if (chop) lArm.current.rotation.set(0.2 + swing * 1.05, 0.35, 0.7)
      else if (farm) lArm.current.rotation.set(-1.1 + Math.max(0, swing) * 1.6, 0.1, 0.35)
      else if (fish) lArm.current.rotation.set(-1.15 - castFwd * 0.55, 0.25, 0.55 + cast * 0.2)
      else if (walk || work) lArm.current.rotation.set(a * 0.65, 0, 0.1)
      else lArm.current.rotation.set(Math.sin(t * 0.45) * 0.1 - 0.2, 0, 0.12)
    }
    if (rArm.current) {
      if (sleep) rArm.current.rotation.set(0.4, 0, -0.15)
      else if (chop) rArm.current.rotation.set(0.15 + swing * 0.9, -0.25, -0.55)
      else if (farm) rArm.current.rotation.set(-0.35 + Math.max(0, -swing) * 0.4, -0.1, -0.25)
      else if (fish) rArm.current.rotation.set(-0.35 + cast * 0.15, -0.2, -0.4)
      else if (walk || work) rArm.current.rotation.set(b * 0.65, 0, -0.1)
      else rArm.current.rotation.set(Math.sin(t * 0.45 + 1.2) * 0.1 - 0.2, 0, -0.12)
    }
    if (lLeg.current) {
      if (sleep) lLeg.current.rotation.x = 0.5
      else if (chop || farm || fish) lLeg.current.rotation.x = 0.12
      else if (walk) lLeg.current.rotation.x = b * 0.5
      else lLeg.current.rotation.x = 0
    }
    if (rLeg.current) {
      if (sleep) rLeg.current.rotation.x = 0.5
      else if (chop || farm || fish) rLeg.current.rotation.x = -0.08
      else if (walk) rLeg.current.rotation.x = a * 0.5
      else rLeg.current.rotation.x = 0
    }
    if (tail.current) {
      tail.current.rotation.z = Math.sin(t * 0.85) * (walk ? 0.5 : chop || farm || fish ? 0.35 : 0.28)
      tail.current.rotation.x = 0.55 + Math.sin(t * 0.55) * 0.1
    }
    if (head.current) {
      if (farm) {
        head.current.rotation.x = 0.25 + Math.max(0, swing) * 0.2
        head.current.rotation.y = 0
        head.current.rotation.z = 0
      } else if (chop) {
        head.current.rotation.x = 0.15
        head.current.rotation.y = swing * 0.06
        head.current.rotation.z = 0
      } else if (fish) {
        head.current.rotation.x = 0.28 + castFwd * 0.1
        head.current.rotation.y = 0
        head.current.rotation.z = 0
      } else {
        head.current.rotation.x = 0
        head.current.rotation.y = sleep ? 0 : Math.sin(t * 0.35) * 0.08
        head.current.rotation.z = sleep ? 0.15 : Math.sin(t * 0.5) * 0.04
      }
    }
    if (root.current) {
      if (sleep) {
        root.current.position.y = 0.08
        root.current.rotation.set(-0.15, 0, 1.05)
      } else if (chop) {
        root.current.position.y = Math.abs(swing) * 0.02
        root.current.rotation.set(0.08, 0, swing * 0.06)
      } else if (farm) {
        root.current.position.y = Math.max(0, swing) * 0.04
        root.current.rotation.set(0.35 + Math.max(0, swing) * 0.25, 0, 0)
      } else if (fish) {
        root.current.position.y = castFwd * 0.03
        root.current.rotation.set(0.18 + castFwd * 0.12, 0, cast * 0.05)
      } else if (walk) {
        root.current.position.y = Math.abs(Math.sin(t * 2)) * 0.03
        root.current.rotation.set(0, 0, 0)
      } else {
        root.current.position.y = Math.sin(t * 0.7) * 0.015
        root.current.rotation.set(0, 0, 0)
      }
    }
    if (tool.current) {
      if (chop) {
        tool.current.rotation.set(0.5 + swing * 0.45, 0.25, 1.1 + swing * 1.15)
      } else if (farm) {
        tool.current.rotation.set(-0.2 + Math.max(0, swing) * 1.4, 0.1, 0.85)
      } else if (fish) {
        tool.current.rotation.set(-0.4 - castFwd * 0.9, 0.15, 0.55 + cast * 0.35)
      } else if (work) {
        tool.current.rotation.set(0.1 + Math.sin(t + 0.4) * 0.2, 0, Math.sin(t) * 0.55 - 0.15)
      } else {
        tool.current.rotation.set(0.1, 0, -0.25)
      }
    }
    if (wrap.current) wrap.current.scale.setScalar(bodyScale * 1.05)
  })

  return (
    <group ref={wrap}>
      <group ref={root}>
        {/* —— 腿 —— */}
        <LimbLeg ref={lLeg} side={1} c={c} />
        <LimbLeg ref={rLeg} side={-1} c={c} />

        {/* —— 身子 —— */}
        <mesh position={[0, 0.42, 0]} castShadow scale={[1, 0.95, 0.78]}>
          <sphereGeometry args={[0.2, 14, 10]} />
          <meshStandardMaterial color={c.fur} roughness={0.56} />
        </mesh>
        {/* 肚皮 */}
        <mesh position={[0, 0.38, 0.08]} castShadow scale={[0.78, 0.72, 0.55]}>
          <sphereGeometry args={[0.15, 18, 14]} />
          <meshStandardMaterial color={c.belly} roughness={0.5} />
        </mesh>
        {/* 胸口绒毛 */}
        <mesh position={[0, 0.48, 0.12]} castShadow scale={[0.55, 0.45, 0.4]}>
          <sphereGeometry args={[0.1, 14, 12]} />
          <meshStandardMaterial color={c.belly} roughness={0.48} />
        </mesh>
        <CoatMarkings pattern={palette.pattern} c={c} accent={palette.accent} accent2={palette.accent2} />

        {/* —— 手臂 —— */}
        <group ref={lArm} position={[0.2, 0.5, 0.02]}>
          <mesh position={[0.04, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.048, 0.14, 8, 12]} />
            <meshStandardMaterial color={c.point} roughness={0.58} />
          </mesh>
          <PawHand position={[0.04, -0.2, 0]} c={c} />
          {(role === 'miner' || role === 'lumberjack' || role === 'farmer') && (
            <group ref={tool} position={[0.05, -0.22, 0.02]}>
              {role === 'miner' ? <CutePickaxe /> : role === 'lumberjack' ? <CuteSaw /> : <CuteHoe />}
            </group>
          )}
          {role === 'scholar' && (
            <group ref={tool} position={[0.06, -0.18, 0.04]} rotation={[0.2, 0.3, 0.15]}>
              <CuteBook />
            </group>
          )}
          {role === 'fisher' && (
            <group ref={handRod} visible={false}>
              <group ref={tool} position={[0.06, -0.2, 0.04]} rotation={[0.3, 0.2, 0.4]}>
                <CuteRod />
              </group>
            </group>
          )}
        </group>
        <group ref={rArm} position={[-0.2, 0.5, 0.02]}>
          <mesh position={[-0.04, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.048, 0.14, 8, 12]} />
            <meshStandardMaterial color={c.point} roughness={0.58} />
          </mesh>
          <PawHand position={[-0.04, -0.2, 0]} c={c} />
        </group>

        {/* —— 头 —— */}
        <group ref={head} position={[0, 0.72, 0.04]}>
          <mesh castShadow scale={[1.05, 0.98, 0.95]}>
            <sphereGeometry args={[0.24, 16, 12]} />
            <meshStandardMaterial color={c.fur} roughness={0.52} />
          </mesh>
          {/* 额头微凸 */}
          <mesh position={[0, 0.1, 0.1]} scale={[0.7, 0.45, 0.5]} castShadow>
            <sphereGeometry args={[0.14, 16, 12]} />
            <meshStandardMaterial color={c.fur} roughness={0.52} />
          </mesh>
          {/* 脸颊肉 */}
          <mesh position={[0.145, -0.02, 0.12]} castShadow scale={[0.72, 0.68, 0.55]}>
            <sphereGeometry args={[0.1, 14, 12]} />
            <meshStandardMaterial color={c.cheek} roughness={0.5} />
          </mesh>
          <mesh position={[-0.145, -0.02, 0.12]} castShadow scale={[0.72, 0.68, 0.55]}>
            <sphereGeometry args={[0.1, 14, 12]} />
            <meshStandardMaterial color={c.cheek} roughness={0.5} />
          </mesh>
          {/* 口鼻 */}
          <mesh position={[0, -0.04, 0.185]} castShadow scale={[0.88, 0.72, 0.62]}>
            <sphereGeometry args={[0.1, 16, 14]} />
            <meshStandardMaterial color={c.muzzle} roughness={0.45} />
          </mesh>

          {/* 耳朵 */}
          {([-1, 1] as const).map((s) => (
            <group key={s} position={[s * 0.155, 0.2, -0.02]} rotation={[0.15, 0, s * 0.32]}>
              <mesh castShadow scale={[0.72, 1.15, 0.38]}>
                <sphereGeometry args={[0.1, 14, 12]} />
                <meshStandardMaterial color={c.point} roughness={0.55} />
              </mesh>
              <mesh position={[0, 0.015, 0.028]} scale={[0.5, 0.75, 0.28]}>
                <sphereGeometry args={[0.085, 12, 10]} />
                <meshStandardMaterial color={c.ear} roughness={0.5} />
              </mesh>
              {/* 耳尖绒 */}
              <mesh position={[0, 0.1, 0]} scale={[0.35, 0.4, 0.25]}>
                <sphereGeometry args={[0.05, 10, 8]} />
                <meshStandardMaterial color={c.point} roughness={0.6} />
              </mesh>
            </group>
          ))}

          {/* 大眼睛 */}
          {([-1, 1] as const).map((s) => (
            <CuteEye key={`eye${s}`} side={s} c={c} />
          ))}

          {/* 鼻子 */}
          <mesh position={[0, 0.005, 0.26]} scale={[1.2, 0.78, 0.9]}>
            <sphereGeometry args={[0.03, 14, 12]} />
            <meshStandardMaterial color={c.nose} roughness={0.35} />
          </mesh>
          {/* 人中小线 */}
          <mesh position={[0, -0.025, 0.255]} scale={[0.25, 1, 0.4]}>
            <capsuleGeometry args={[0.006, 0.028, 2, 6]} />
            <meshStandardMaterial color={c.nose} roughness={0.45} transparent opacity={0.55} />
          </mesh>
          {/* 微笑 */}
          <mesh position={[0, -0.055, 0.235]} rotation={[0.4, 0, 0]}>
            <torusGeometry args={[0.042, 0.006, 8, 16, Math.PI]} />
            <meshStandardMaterial color={c.dark} roughness={0.5} />
          </mesh>

          {/* 胡须 */}
          {([-1, 1] as const).map((s) =>
            [-0.025, 0, 0.025].map((y, i) => (
              <mesh
                key={`${s}${i}`}
                position={[s * 0.15, y - 0.02, 0.2]}
                rotation={[0, s * (0.45 + i * 0.08), y * 4]}
              >
                <capsuleGeometry args={[0.003, 0.1, 2, 4]} />
                <meshStandardMaterial color="#3a2a22" roughness={0.7} transparent opacity={0.7} />
              </mesh>
            )),
          )}

          {/* 头花纹 */}
          <HeadMarkings pattern={palette.pattern} c={c} accent={palette.accent} accent2={palette.accent2} />

          {role === 'farmer' && <CuteFarmerHat />}
          {role === 'miner' && <CuteMinerHelm />}
          {role === 'lumberjack' && <CuteLumberScarf color={palette.collar} />}
          {role === 'fisher' && <CuteFisherBand color={palette.collar} />}
          {role === 'scholar' && <CuteScholarGlasses />}
          {role === 'sailor' && <CuteSailorHat />}
          {role === 'doctor' && <CuteDoctorCross />}
          {(role === 'farmer' ||
            role === 'civilian' ||
            role === 'miner' ||
            role === 'lumberjack' ||
            !role) &&
            palette.accessory !== 'strawhat' && <HeadAccent palette={palette} />}
        </group>

        {/* 职业胸前小装 */}
        {role === 'farmer' && <FarmerApron />}
        {role === 'miner' && <MinerVest />}
        {role === 'fisher' && <FisherVest />}
        {role === 'sailor' && <SailorVest />}
        {role === 'doctor' && <DoctorCoat />}

        {/* 渔夫：走路背竿+挎桶，钓鱼时手持竿、水桶放脚边 */}
        {role === 'fisher' && (
          <>
            <group ref={backRod} position={[0.14, 0.48, -0.14]} rotation={[0.25, 0.45, -0.75]} scale={1.15}>
              <CuteRod />
            </group>
            <group ref={bucket} position={[-0.2, 0.28, 0.06]}>
              <CuteBucket />
            </group>
          </>
        )}

        {/* 项圈铃铛 */}
        <mesh position={[0, 0.58, 0.06]} rotation={[0.45, 0, 0]}>
          <torusGeometry args={[0.1, 0.02, 10, 22]} />
          <meshStandardMaterial color={c.collar} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.515, 0.125]} castShadow>
          <sphereGeometry args={[0.032, 12, 10]} />
          <meshStandardMaterial color="#f0d060" metalness={0.65} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.5, 0.125]}>
          <sphereGeometry args={[0.01, 8, 6]} />
          <meshStandardMaterial color="#c9a020" metalness={0.5} roughness={0.35} />
        </mesh>

        {/* 尾巴 */}
        <group ref={tail} position={[0, 0.36, -0.12]}>
          <mesh position={[0, 0.04, -0.1]} rotation={[0.95, 0, 0]} castShadow>
            <capsuleGeometry args={[0.045, 0.22, 8, 12]} />
            <meshStandardMaterial color={c.point} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.1, -0.24]} castShadow scale={[1.2, 1.05, 1.2]}>
            <sphereGeometry args={[0.055, 14, 12]} />
            <meshStandardMaterial color={c.dark} roughness={0.58} />
          </mesh>
        </group>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.26, 20]} />
        <meshStandardMaterial color="#000" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

type Tint = ReturnType<typeof tintPalette>

function LimbLeg({
  ref,
  side,
  c,
}: {
  ref: React.RefObject<Group | null>
  side: 1 | -1
  c: Tint
}) {
  return (
    <group ref={ref} position={[side * 0.09, 0.28, 0]}>
      <mesh position={[0, -0.1, 0]} castShadow>
        <capsuleGeometry args={[0.058, 0.12, 8, 12]} />
        <meshStandardMaterial color={c.point} roughness={0.58} />
      </mesh>
      <mesh position={[0, -0.2, 0.025]} castShadow scale={[1.2, 0.55, 1.4]}>
        <sphereGeometry args={[0.065, 14, 12]} />
        <meshStandardMaterial color={c.paw} roughness={0.5} />
      </mesh>
      {/* 肉垫 */}
      <mesh position={[0, -0.225, 0.055]} scale={[0.7, 0.35, 0.55]}>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshStandardMaterial color={c.pad} roughness={0.55} />
      </mesh>
    </group>
  )
}

function PawHand({ position, c }: { position: [number, number, number]; c: Tint }) {
  return (
    <group position={position}>
      <mesh castShadow scale={[1.1, 0.9, 1.1]}>
        <sphereGeometry args={[0.055, 14, 12]} />
        <meshStandardMaterial color={c.paw} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.02, 0.03]} scale={[0.65, 0.4, 0.5]}>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshStandardMaterial color={c.pad} roughness={0.55} />
      </mesh>
    </group>
  )
}

function CuteEye({ side, c }: { side: 1 | -1; c: Tint }) {
  return (
    <group position={[side * 0.088, 0.05, 0.2]}>
      {/* 白眼 */}
      <mesh scale={[0.98, 1.18, 0.48]}>
        <sphereGeometry args={[0.065, 16, 14]} />
        <meshStandardMaterial color="#fffef8" roughness={0.2} />
      </mesh>
      {/* 虹膜 */}
      <mesh position={[0, -0.004, 0.03]} scale={[0.72, 0.92, 0.48]}>
        <sphereGeometry args={[0.04, 14, 12]} />
        <meshStandardMaterial color={c.eye} roughness={0.18} metalness={0.08} />
      </mesh>
      {/* 瞳孔 */}
      <mesh position={[0, -0.004, 0.048]} scale={[0.35, 0.85, 0.35]}>
        <sphereGeometry args={[0.022, 12, 10]} />
        <meshStandardMaterial color="#1a1210" roughness={0.3} />
      </mesh>
      {/* 高光 */}
      <mesh position={[0.014, 0.02, 0.055]}>
        <sphereGeometry args={[0.014, 10, 8]} />
        <meshStandardMaterial color={c.eyeHi} roughness={0.05} />
      </mesh>
      <mesh position={[-0.01, -0.01, 0.052]}>
        <sphereGeometry args={[0.007, 8, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.05} transparent opacity={0.85} />
      </mesh>
      {/* 睫毛感 */}
      <mesh position={[0, 0.055, 0.02]} scale={[1.1, 0.25, 0.5]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshStandardMaterial color={c.fur} roughness={0.55} />
      </mesh>
    </group>
  )
}

function CoatMarkings({
  pattern,
  c,
  accent,
  accent2,
}: {
  pattern: CoatPattern
  c: Tint
  accent?: string
  accent2?: string
}) {
  if (pattern === 'tabby') {
    return (
      <group>
        {[0.08, 0, -0.08].map((z, i) => (
          <mesh key={i} position={[0.12, 0.45 + i * 0.02, z]} rotation={[0, 0.4, 0.3]} scale={[0.35, 0.9, 0.2]}>
            <capsuleGeometry args={[0.04, 0.08, 4, 8]} />
            <meshStandardMaterial color={c.dark} roughness={0.6} transparent opacity={0.55} />
          </mesh>
        ))}
        {[0.08, 0, -0.08].map((z, i) => (
          <mesh key={`l${i}`} position={[-0.12, 0.45 + i * 0.02, z]} rotation={[0, -0.4, -0.3]} scale={[0.35, 0.9, 0.2]}>
            <capsuleGeometry args={[0.04, 0.08, 4, 8]} />
            <meshStandardMaterial color={c.dark} roughness={0.6} transparent opacity={0.55} />
          </mesh>
        ))}
      </group>
    )
  }
  if (pattern === 'tuxedo') {
    return (
      <mesh position={[0, 0.4, 0.1]} scale={[0.7, 0.85, 0.45]}>
        <sphereGeometry args={[0.14, 14, 12]} />
        <meshStandardMaterial color={c.belly} roughness={0.5} />
      </mesh>
    )
  }
  if (pattern === 'calico') {
    return (
      <group>
        <mesh position={[0.12, 0.48, 0.05]} scale={[0.7, 0.55, 0.5]}>
          <sphereGeometry args={[0.08, 12, 10]} />
          <meshStandardMaterial color={accent ?? '#e85840'} roughness={0.55} />
        </mesh>
        <mesh position={[-0.1, 0.42, -0.05]} scale={[0.65, 0.5, 0.55]}>
          <sphereGeometry args={[0.075, 12, 10]} />
          <meshStandardMaterial color={accent2 ?? '#2a2a2e'} roughness={0.55} />
        </mesh>
      </group>
    )
  }
  return null
}

function HeadMarkings({
  pattern,
  c,
  accent,
  accent2,
}: {
  pattern: CoatPattern
  c: Tint
  accent?: string
  accent2?: string
}) {
  if (pattern === 'tabby') {
    return (
      <group>
        {/* M 字额纹 */}
        <mesh position={[0, 0.12, 0.18]} scale={[0.25, 0.7, 0.2]}>
          <capsuleGeometry args={[0.03, 0.06, 4, 8]} />
          <meshStandardMaterial color={c.dark} roughness={0.55} transparent opacity={0.65} />
        </mesh>
        <mesh position={[0.05, 0.1, 0.185]} rotation={[0, 0, 0.45]} scale={[0.2, 0.55, 0.18]}>
          <capsuleGeometry args={[0.025, 0.05, 4, 8]} />
          <meshStandardMaterial color={c.dark} roughness={0.55} transparent opacity={0.6} />
        </mesh>
        <mesh position={[-0.05, 0.1, 0.185]} rotation={[0, 0, -0.45]} scale={[0.2, 0.55, 0.18]}>
          <capsuleGeometry args={[0.025, 0.05, 4, 8]} />
          <meshStandardMaterial color={c.dark} roughness={0.55} transparent opacity={0.6} />
        </mesh>
      </group>
    )
  }
  if (pattern === 'calico') {
    return (
      <group>
        <mesh position={[0.1, 0.08, 0.12]} scale={[0.8, 0.6, 0.5]}>
          <sphereGeometry args={[0.07, 12, 10]} />
          <meshStandardMaterial color={accent ?? '#e85840'} roughness={0.55} />
        </mesh>
        <mesh position={[-0.12, 0.05, 0.05]} scale={[0.55, 0.5, 0.45]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshStandardMaterial color={accent2 ?? '#2a2a2e'} roughness={0.55} />
        </mesh>
      </group>
    )
  }
  if (pattern === 'siamese') {
    return (
      <mesh position={[0, -0.02, 0.1]} scale={[0.95, 0.7, 0.7]}>
        <sphereGeometry args={[0.18, 16, 14]} />
        <meshStandardMaterial color={c.dark} roughness={0.55} transparent opacity={0.35} />
      </mesh>
    )
  }
  return null
}

function tintPalette(p: CatPalette) {
  const fur = new Color(p.fur)
  const dark = new Color(p.furDark)
  const belly = new Color(p.belly)
  if (p.pattern === 'smoke') fur.lerp(dark, 0.18)
  else if (p.pattern === 'siamese') fur.lerp(belly, 0.2)
  else if (p.pattern === 'calico' && p.accent) fur.lerp(new Color(p.accent), 0.08)
  const muzzle = belly.clone().lerp(new Color('#fff5ec'), 0.35)
  const paw = belly.clone().lerp(new Color('#ffe8d8'), 0.2)
  const pad = new Color(p.earInner).lerp(new Color(p.nose), 0.35)
  const point = p.pattern === 'siamese' ? dark.clone() : fur.clone()
  return {
    fur: `#${fur.getHexString()}`,
    dark: p.furDark,
    belly: p.belly,
    cheek: p.cheek,
    ear: p.earInner,
    nose: p.nose,
    eye: p.eye,
    eyeHi: p.eyeHighlight,
    collar: p.collar,
    muzzle: `#${muzzle.getHexString()}`,
    paw: `#${paw.getHexString()}`,
    pad: `#${pad.getHexString()}`,
    point: `#${point.getHexString()}`,
  }
}

function CuteFarmerHat() {
  return (
    <group position={[0, 0.2, -0.02]}>
      <mesh castShadow>
        <sphereGeometry args={[0.145, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#e8c86a" roughness={0.68} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.13, 0.3, 28]} />
        <meshStandardMaterial color="#f2d98a" roughness={0.62} side={DoubleSide} />
      </mesh>
      {/* 帽带 */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.145, 0.012, 8, 24]} />
        <meshStandardMaterial color="#c9a227" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.04, 0.15]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.022, 0.045]} />
        <meshStandardMaterial color="#b8922a" roughness={0.5} />
      </mesh>
    </group>
  )
}

function CuteMinerHelm() {
  return (
    <group position={[0, 0.18, -0.01]}>
      <mesh castShadow scale={[1.05, 0.7, 1.05]}>
        <sphereGeometry args={[0.2, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#4a6a88" roughness={0.4} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.02, 0.16]} castShadow>
        <boxGeometry args={[0.06, 0.04, 0.05]} />
        <meshStandardMaterial color="#f0d060" emissive="#f0a020" emissiveIntensity={0.35} roughness={0.3} />
      </mesh>
      {/* 护目镜 */}
      <mesh position={[0.07, 0.02, 0.14]} scale={[1, 0.7, 0.5]}>
        <sphereGeometry args={[0.04, 12, 10]} />
        <meshStandardMaterial color="#7ec8e8" transparent opacity={0.55} metalness={0.3} roughness={0.2} />
      </mesh>
      <mesh position={[-0.07, 0.02, 0.14]} scale={[1, 0.7, 0.5]}>
        <sphereGeometry args={[0.04, 12, 10]} />
        <meshStandardMaterial color="#7ec8e8" transparent opacity={0.55} metalness={0.3} roughness={0.2} />
      </mesh>
    </group>
  )
}

function CuteLumberScarf({ color }: { color: string }) {
  return (
    <group position={[0, -0.12, 0.08]}>
      <mesh castShadow scale={[1.1, 0.35, 0.7]}>
        <torusGeometry args={[0.14, 0.045, 10, 20]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[0.08, -0.06, 0.08]} rotation={[0.3, 0.4, 0.2]} castShadow>
        <boxGeometry args={[0.06, 0.12, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      <mesh position={[-0.06, -0.05, 0.09]} rotation={[0.25, -0.3, -0.15]} castShadow>
        <boxGeometry args={[0.05, 0.1, 0.018]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
    </group>
  )
}

function FarmerApron() {
  return (
    <group position={[0, 0.38, 0.12]}>
      <mesh castShadow scale={[0.85, 0.9, 0.35]}>
        <boxGeometry args={[0.22, 0.2, 0.04]} />
        <meshStandardMaterial color="#f5efe0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.24, 0.03, 0.03]} />
        <meshStandardMaterial color="#d4c4a0" roughness={0.65} />
      </mesh>
    </group>
  )
}

function MinerVest() {
  return (
    <group position={[0, 0.42, 0.1]}>
      <mesh castShadow scale={[1, 0.85, 0.4]}>
        <boxGeometry args={[0.28, 0.16, 0.06]} />
        <meshStandardMaterial color="#3a4a58" roughness={0.55} />
      </mesh>
      <mesh position={[0.06, 0.02, 0.035]} scale={[0.6, 0.5, 0.4]}>
        <boxGeometry args={[0.06, 0.05, 0.02]} />
        <meshStandardMaterial color="#c9a227" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  )
}

function FisherVest() {
  return (
    <group position={[0, 0.42, 0.1]}>
      <mesh castShadow scale={[1, 0.8, 0.38]}>
        <boxGeometry args={[0.26, 0.15, 0.05]} />
        <meshStandardMaterial color="#2a6a78" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.02, 0.03]} castShadow>
        <boxGeometry args={[0.2, 0.04, 0.02]} />
        <meshStandardMaterial color="#e8d090" roughness={0.55} />
      </mesh>
    </group>
  )
}

function SailorVest() {
  return (
    <group position={[0, 0.42, 0.1]}>
      <mesh castShadow scale={[1, 0.85, 0.4]}>
        <boxGeometry args={[0.26, 0.16, 0.05]} />
        <meshStandardMaterial color="#1e3a5f" roughness={0.48} />
      </mesh>
      <mesh position={[0, 0.04, 0.03]} castShadow>
        <boxGeometry args={[0.22, 0.03, 0.015]} />
        <meshStandardMaterial color="#f4f6fa" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.03, 0.032]} castShadow>
        <boxGeometry args={[0.08, 0.05, 0.02]} />
        <meshStandardMaterial color="#c9a227" metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  )
}

function CuteDoctorCross() {
  return (
    <group position={[0, 0.18, 0.02]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.13, 0.14, 0.05, 16]} />
        <meshStandardMaterial color="#f7f7f7" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.04, 0.1, 0.02]} />
        <meshStandardMaterial color="#c44b3c" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.04, 0]} castShadow>
        <boxGeometry args={[0.1, 0.04, 0.02]} />
        <meshStandardMaterial color="#c44b3c" roughness={0.45} />
      </mesh>
    </group>
  )
}

function DoctorCoat() {
  return (
    <group position={[0, 0.42, 0.1]}>
      <mesh castShadow scale={[1, 0.9, 0.42]}>
        <boxGeometry args={[0.28, 0.18, 0.05]} />
        <meshStandardMaterial color="#f2f4f8" roughness={0.55} />
      </mesh>
      <mesh position={[0.06, 0.02, 0.03]} castShadow>
        <boxGeometry args={[0.05, 0.06, 0.02]} />
        <meshStandardMaterial color="#c44b3c" roughness={0.5} />
      </mesh>
    </group>
  )
}

function CuteFisherBand({ color }: { color: string }) {
  return (
    <group position={[0, 0.08, 0.02]}>
      <mesh castShadow rotation={[0.1, 0, 0]} scale={[1.05, 0.45, 0.95]}>
        <torusGeometry args={[0.2, 0.028, 8, 20]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0.16, 0.02, 0.08]} rotation={[0.2, 0.5, 0.3]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.015]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
    </group>
  )
}

function CuteScholarGlasses() {
  return (
    <group position={[0, 0.02, 0.18]}>
      <mesh position={[-0.055, 0, 0]} castShadow>
        <torusGeometry args={[0.035, 0.008, 6, 16]} />
        <meshStandardMaterial color="#3a3a48" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0.055, 0, 0]} castShadow>
        <torusGeometry args={[0.035, 0.008, 6, 16]} />
        <meshStandardMaterial color="#3a3a48" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.005, 0.04, 4, 6]} />
        <meshStandardMaterial color="#3a3a48" roughness={0.4} />
      </mesh>
    </group>
  )
}

/** 船商：小船帽 */
function CuteSailorHat() {
  return (
    <group position={[0, 0.2, 0.02]}>
      <mesh castShadow position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.06, 16]} />
        <meshStandardMaterial color="#f4f6fa" roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.1, 0.11, 0.05, 16]} />
        <meshStandardMaterial color="#2a4a7a" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.04, 0.12]} castShadow>
        <boxGeometry args={[0.06, 0.02, 0.02]} />
        <meshStandardMaterial color="#c44b3c" roughness={0.5} />
      </mesh>
    </group>
  )
}

function CuteBook() {
  return (
    <group scale={0.95}>
      <mesh castShadow>
        <boxGeometry args={[0.1, 0.02, 0.14]} />
        <meshStandardMaterial color="#6b3a2a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.012, 0]} castShadow>
        <boxGeometry args={[0.09, 0.008, 0.12]} />
        <meshStandardMaterial color="#f2e6c8" roughness={0.85} />
      </mesh>
    </group>
  )
}

function CuteHoe() {
  return (
    <group rotation={[0.2, 0.15, 0.9]} scale={0.9}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <capsuleGeometry args={[0.012, 0.26, 6, 8]} />
        <meshStandardMaterial color="#6a4020" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.28, 0.02]} rotation={[0.9, 0, 0]} castShadow>
        <boxGeometry args={[0.09, 0.04, 0.02]} />
        <meshStandardMaterial color="#8a9aa8" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.3, 0.05]} rotation={[1.1, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.055, 0.012]} />
        <meshStandardMaterial color="#a8b4c0" metalness={0.55} roughness={0.28} />
      </mesh>
    </group>
  )
}

function CutePickaxe() {
  return (
    <group rotation={[0.15, 0.2, 1.1]} scale={0.85}>
      <mesh position={[0, 0.1, 0]} castShadow>
        <capsuleGeometry args={[0.014, 0.24, 6, 8]} />
        <meshStandardMaterial color="#6a4020" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.25, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.026, 0.15, 6, 10]} />
        <meshStandardMaterial color="#8a9aa8" metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[0.11, 0.25, 0]} rotation={[0, 0, 0.95]} castShadow>
        <coneGeometry args={[0.032, 0.1, 7]} />
        <meshStandardMaterial color="#c0cad2" metalness={0.6} roughness={0.25} />
      </mesh>
      <mesh position={[-0.09, 0.25, 0]} rotation={[0, 0, -0.95]} castShadow>
        <coneGeometry args={[0.028, 0.08, 7]} />
        <meshStandardMaterial color="#b0bac2" metalness={0.55} roughness={0.28} />
      </mesh>
    </group>
  )
}

function CuteSaw() {
  return (
    <group rotation={[0.1, -0.3, 1.35]} scale={0.8}>
      <mesh position={[0, 0.04, 0]} castShadow>
        <capsuleGeometry args={[0.018, 0.07, 6, 8]} />
        <meshStandardMaterial color="#7a4a22" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.025, 0.008, 8, 12]} />
        <meshStandardMaterial color="#5a3820" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.17, 0]} castShadow>
        <boxGeometry args={[0.026, 0.24, 0.01]} />
        <meshStandardMaterial color="#c5ced6" metalness={0.5} roughness={0.3} />
      </mesh>
      {[0.07, 0.1, 0.13, 0.16, 0.19, 0.22].map((y, i) => (
        <mesh key={i} position={[0.015, y, 0]} rotation={[0, 0, -0.55]}>
          <coneGeometry args={[0.009, 0.02, 3]} />
          <meshStandardMaterial color="#d8dee4" metalness={0.55} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

/** 背 / 手持鱼竿 */
function CuteRod() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow>
        <capsuleGeometry args={[0.012, 0.58, 6, 8]} />
        <meshStandardMaterial color="#7a4a22" roughness={0.68} />
      </mesh>
      <mesh position={[0, -0.05, 0]} castShadow>
        <capsuleGeometry args={[0.02, 0.07, 6, 8]} />
        <meshStandardMaterial color="#4a2e14" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.028, 0.008, 8, 12]} />
        <meshStandardMaterial color="#a8b4c0" metalness={0.5} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.022, 0.006, 8, 12]} />
        <meshStandardMaterial color="#8a9aa8" metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0.02, 0.58, 0]} rotation={[0, 0, 0.4]} castShadow>
        <capsuleGeometry args={[0.005, 0.1, 4, 6]} />
        <meshStandardMaterial color="#d0d8e0" metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[0.06, 0.64, 0.01]} castShadow>
        <sphereGeometry args={[0.016, 8, 6]} />
        <meshStandardMaterial color="#e8a040" roughness={0.38} />
      </mesh>
      {/* 短鱼线 */}
      <mesh position={[0.08, 0.52, 0.04]} rotation={[0.9, 0.2, 0.1]}>
        <capsuleGeometry args={[0.003, 0.16, 3, 4]} />
        <meshStandardMaterial color="#c8d0d8" roughness={0.4} transparent opacity={0.75} />
      </mesh>
    </group>
  )
}

function CuteBucket() {
  return (
    <group scale={0.95}>
      <mesh castShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.055, 0.048, 0.1, 12]} />
        <meshStandardMaterial color="#3a6a88" roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.012, 12]} />
        <meshStandardMaterial color="#2a5570" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.055, 0.008, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#c9a227" metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0.02, 0.13, 0.01]} castShadow>
        <sphereGeometry args={[0.022, 8, 6]} />
        <meshStandardMaterial color="#6eb0d8" roughness={0.25} metalness={0.1} />
      </mesh>
    </group>
  )
}

function HeadAccent({ palette: p }: { palette: CatPalette }) {
  if (p.accessory === 'bow') {
    return (
      <group position={[0.14, 0.14, 0.06]} scale={0.85}>
        <mesh position={[-0.04, 0, 0]} scale={[1, 0.7, 0.45]}>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshStandardMaterial color={p.collar} roughness={0.45} />
        </mesh>
        <mesh position={[0.04, 0, 0]} scale={[1, 0.7, 0.45]}>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshStandardMaterial color={p.collar} roughness={0.45} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.025, 10, 8]} />
          <meshStandardMaterial color="#fff4d0" roughness={0.4} />
        </mesh>
      </group>
    )
  }
  if (p.accessory === 'flower') {
    return (
      <group position={[-0.16, 0.12, 0.08]} scale={0.7}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[Math.cos((i / 5) * Math.PI * 2) * 0.038, Math.sin((i / 5) * Math.PI * 2) * 0.038, 0]}
          >
            <sphereGeometry args={[0.028, 10, 8]} />
            <meshStandardMaterial color="#e85a8c" roughness={0.45} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.02, 10, 8]} />
          <meshStandardMaterial color="#f0d060" roughness={0.4} />
        </mesh>
      </group>
    )
  }
  if (p.accessory === 'bandana') {
    return (
      <mesh position={[0, 0.02, 0.02]} rotation={[0.2, 0, 0]}>
        <torusGeometry args={[0.2, 0.018, 8, 24]} />
        <meshStandardMaterial color={p.collar} roughness={0.5} />
      </mesh>
    )
  }
  if (p.accessory === 'scarf') {
    return (
      <group position={[0, -0.14, 0.06]}>
        <mesh scale={[1, 0.4, 0.7]}>
          <torusGeometry args={[0.13, 0.035, 8, 18]} />
          <meshStandardMaterial color={p.collar} roughness={0.55} />
        </mesh>
      </group>
    )
  }
  return null
}
