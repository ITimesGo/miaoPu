import { hash01 } from '../models/Decor'

export function PathZone() {
  const stones = Array.from({ length: 48 }, (_, i) => {
    const t = i / 48
    // polyline-ish path: cottage -> center -> farm -> harbor
    let x: number
    let z: number
    if (t < 0.35) {
      const u = t / 0.35
      x = -3.6 + u * 2.6
      z = 3.3 - u * 3.0
    } else if (t < 0.65) {
      const u = (t - 0.35) / 0.3
      x = -1 + u * 5
      z = 0.3 + u * 1.2
    } else {
      const u = (t - 0.65) / 0.35
      x = 4 + u * 6.5
      z = 1.5 - u * 9.0
    }
    x += (hash01(i * 3.1) - 0.5) * 0.55
    z += (hash01(i * 7.7) - 0.5) * 0.4
    return {
      x,
      z,
      rot: hash01(i) * Math.PI,
      sx: 0.35 + hash01(i + 2) * 0.25,
      sz: 0.28 + hash01(i + 5) * 0.2,
      shade: hash01(i + 9) > 0.5 ? '#d2b48c' : '#c4a574',
    }
  })

  return (
    <group>
      {/* soft dirt underlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1, 0.012, 0]} receiveShadow>
        <planeGeometry args={[3.2, 12]} />
        <meshStandardMaterial color="#b8956a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0.012, -2]} receiveShadow>
        <planeGeometry args={[10, 2.4]} />
        <meshStandardMaterial color="#b8956a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8.2, 0.012, -5.8]} receiveShadow>
        <planeGeometry args={[8.5, 2.2]} />
        <meshStandardMaterial color="#b8956a" roughness={1} />
      </mesh>

      {stones.map((s, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, s.rot]}
          position={[s.x, 0.025, s.z]}
          receiveShadow
          castShadow
        >
          <circleGeometry args={[Math.max(s.sx, s.sz) * 0.55, 7]} />
          <meshStandardMaterial color={s.shade} roughness={0.92} />
        </mesh>
      ))}
    </group>
  )
}
