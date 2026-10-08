import { Html } from '@react-three/drei'
import { useEffect } from 'react'
import { useGameStore } from '../../game/state/gameStore'

/** 单行优先；超出后自动折成最多约两行 */
const BUBBLE_MAX_WIDTH = 280

export function CatSpeechBubble({ catId }: { catId: string }) {
  const bubble = useGameStore((s) => s.speechBubbles.find((b) => b.catId === catId))
  const sick = useGameStore((s) => s.cats.find((c) => c.id === catId)?.sick === true)

  // 真实时间到期时主动清一次，避免只靠游戏 tick
  useEffect(() => {
    if (!bubble) return
    const left = bubble.expiresAtMs - Date.now()
    if (left <= 0) {
      useGameStore.setState((s) => ({
        speechBubbles: s.speechBubbles.filter((b) => b.catId !== catId),
      }))
      return
    }
    const t = window.setTimeout(() => {
      useGameStore.setState((s) => ({
        speechBubbles: s.speechBubbles.filter(
          (b) => b.catId !== catId || b.expiresAtMs > Date.now(),
        ),
      }))
    }, left + 16)
    return () => window.clearTimeout(t)
  }, [bubble, catId])

  if (!bubble) return null

  return (
    <Html
      position={[0, sick ? 1.95 : 1.35, 0]}
      center
      distanceFactor={8}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      zIndexRange={[20, 0]}
    >
      <div
        style={{
          display: 'inline-block',
          width: 'max-content',
          maxWidth: BUBBLE_MAX_WIDTH,
          padding: '8px 14px',
          borderRadius: 12,
          background: 'rgba(245, 240, 230, 0.94)',
          border: '1px solid rgba(80, 100, 70, 0.35)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
          color: '#243028',
          fontSize: 16,
          lineHeight: 1.45,
          fontWeight: 600,
          textAlign: 'center',
          whiteSpace: 'normal',
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}
      >
        {bubble.text}
      </div>
    </Html>
  )
}
