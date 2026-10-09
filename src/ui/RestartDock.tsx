import { useState, type CSSProperties } from 'react'
import { useGameStore } from '../game/state/gameStore'
import {
  DOCK_BOTTOM,
  DOCK_BTN_MIN_W,
  RESTART_FAB_LEFT,
  dockBtnBase,
} from './dockStyles'
import { useDockStore } from './dockStore'

const confirmBtn: CSSProperties = {
  padding: '8px 18px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: '0.03em',
}

export function RestartDock() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const gameOver = useGameStore((s) => s.gameOver)
  const restartGame = useGameStore((s) => s.restartGame)
  const closeDock = useDockStore((s) => s.close)

  if (gameOver) return null

  const openConfirm = () => {
    closeDock()
    setConfirmOpen(true)
  }

  const doRestart = () => {
    setConfirmOpen(false)
    restartGame()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 35, pointerEvents: 'none' }}>
      <button
        type="button"
        style={{
          ...dockBtnBase,
          position: 'absolute',
          left: RESTART_FAB_LEFT,
          bottom: DOCK_BOTTOM,
          zIndex: 36,
          pointerEvents: 'auto',
          border: '1px solid rgba(200, 120, 100, 0.55)',
          minWidth: DOCK_BTN_MIN_W,
        }}
        onClick={openConfirm}
        title="清空存档并开新局"
      >
        重开
      </button>

      {confirmOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 55,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(8, 14, 12, 0.65)',
            pointerEvents: 'auto',
          }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="restart-title"
            style={{
              maxWidth: 360,
              padding: '22px 24px',
              borderRadius: 12,
              background: 'rgba(28, 42, 34, 0.96)',
              border: '1px solid #6a8a6a',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              color: '#f5f0e6',
              textAlign: 'center',
              lineHeight: 1.55,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              id="restart-title"
              style={{
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: '0.04em',
                marginBottom: 10,
                color: '#f5f0e6',
              }}
            >
              确认重开？
            </div>
            <div style={{ fontSize: 13, opacity: 0.92, marginBottom: 18, color: '#e8ffe8' }}>
              清空本浏览器存档并开新局。此操作不可撤销。
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                style={{
                  ...confirmBtn,
                  border: '1px solid rgba(255,255,255,0.25)',
                  background: 'rgba(0,0,0,0.25)',
                  color: '#e8ffe8',
                }}
                onClick={() => setConfirmOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                style={{
                  ...confirmBtn,
                  border: '2px solid #e8a090',
                  background: '#5c3830',
                  color: '#f5f0e6',
                }}
                onClick={doRestart}
              >
                确认重开
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
