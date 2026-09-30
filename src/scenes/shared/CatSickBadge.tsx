import { Html } from '@react-three/drei'
import { useGameStore } from '../../game/state/gameStore'

/** 生病常驻小标：挂在猫头上方 */
export function CatSickBadge({ catId }: { catId: string }) {
  const sick = useGameStore((s) => s.cats.find((c) => c.id === catId)?.sick === true)
  if (!sick) return null

  return (
    <Html
      position={[0, 1.55, 0]}
      center
      distanceFactor={8}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      zIndexRange={[18, 0]}
    >
      <div
        title="生病"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 28,
          height: 28,
          padding: '0 7px',
          borderRadius: 999,
          background: 'rgba(140, 42, 32, 0.92)',
          border: '1px solid rgba(255, 160, 130, 0.55)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.28)',
          color: '#ffe8e0',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        病
      </div>
    </Html>
  )
}
