import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  formatLogClock,
  GAME_LOG_LIMIT,
  isSevereLogKind,
  LOG_KIND_COLOR,
  LOG_KIND_LABEL,
  severeLogTag,
  type GameLogEntry,
} from '../game/data/gameLog'
import { useGameStore } from '../game/state/gameStore'
import {
  DOCK_BOTTOM,
  DOCK_BTN_H,
  DOCK_GAP,
  DOCK_LEFT,
  LOG_FAB_LEFT,
  dockBtnOpen,
} from './dockStyles'
import { useDockStore } from './dockStore'

const shell: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 35,
  pointerEvents: 'none',
}

const panel: CSSProperties = {
  position: 'absolute',
  left: DOCK_LEFT,
  bottom: DOCK_BTN_H + DOCK_GAP + DOCK_BOTTOM,
  width: 'min(380px, calc(100vw - 24px))',
  maxHeight: 'min(72vh, 520px)',
  display: 'flex',
  flexDirection: 'column',
  padding: '10px 11px 9px',
  background: 'linear-gradient(160deg, rgba(22, 36, 28, 0.94), rgba(12, 22, 18, 0.92))',
  borderRadius: 12,
  border: '1px solid rgba(140, 170, 140, 0.28)',
  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
  color: '#f5f0e6',
  pointerEvents: 'auto',
  zIndex: 35,
}

function LogRow({ entry }: { entry: GameLogEntry }) {
  const severe = isSevereLogKind(entry.kind)
  const tag = severeLogTag(entry)
  const color = LOG_KIND_COLOR[entry.kind]
  const crisis = entry.kind === 'crisis'

  return (
    <div
      style={{
        padding: severe ? '8px 9px' : '6px 8px',
        borderRadius: 7,
        background: crisis
          ? 'rgba(120, 28, 22, 0.55)'
          : entry.kind === 'major'
            ? 'rgba(90, 36, 72, 0.45)'
            : 'rgba(0,0,0,0.18)',
        border: crisis
          ? '1px solid rgba(255, 120, 90, 0.65)'
          : entry.kind === 'major'
            ? '1px solid rgba(240, 140, 200, 0.55)'
            : '1px solid rgba(255,255,255,0.06)',
        marginBottom: 5,
        boxShadow: severe ? '0 0 0 1px rgba(0,0,0,0.2)' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 5,
          marginBottom: 3,
          fontSize: 10,
        }}
      >
        {tag && (
          <span
            style={{
              padding: '1px 6px',
              borderRadius: 4,
              fontWeight: 900,
              letterSpacing: '0.04em',
              background: crisis ? 'rgba(255, 90, 60, 0.85)' : 'rgba(200, 80, 160, 0.75)',
              color: '#fff8f0',
              fontSize: 10,
            }}
          >
            {tag}
          </span>
        )}
        <span style={{ color, fontWeight: 800, opacity: severe ? 1 : 0.85 }}>
          {LOG_KIND_LABEL[entry.kind]}
        </span>
        <span style={{ opacity: 0.75 }}>
          第{entry.day}天 {formatLogClock(entry.minuteOfDay)}
        </span>
      </div>
      <div
        style={{
          fontSize: severe ? 13 : 12,
          lineHeight: 1.45,
          fontWeight: severe ? 700 : 500,
          color: crisis ? '#ffe0d4' : entry.kind === 'major' ? '#ffe8f4' : '#f5f0e6',
        }}
      >
        {entry.text}
      </div>
    </div>
  )
}

export function LogPanel() {
  const open = useDockStore((s) => s.open === 'log')
  const toggleLog = useDockStore((s) => s.toggleLog)
  const gameLog = useGameStore((s) => s.gameLog ?? [])
  const listRef = useRef<HTMLDivElement>(null)
  const [severeOnly, setSevereOnly] = useState(false)
  const [seenLen, setSeenLen] = useState(gameLog.length)

  const newestFirst = [...gameLog].reverse()
  const visible = severeOnly
    ? newestFirst.filter((e) => isSevereLogKind(e.kind))
    : newestFirst
  const severeCount = gameLog.filter((e) => isSevereLogKind(e.kind)).length
  const unreadSevere = !open && gameLog.length > seenLen
    ? gameLog.slice(seenLen).filter((e) => isSevereLogKind(e.kind)).length
    : 0

  useEffect(() => {
    if (!open) return
    setSeenLen(gameLog.length)
    if (listRef.current) listRef.current.scrollTop = 0
  }, [open, gameLog.length])

  return (
    <div style={shell}>
      {open && (
        <div style={panel}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.04em' }}>大事记</div>
            <div style={{ fontSize: 10, opacity: 0.65 }}>
              {gameLog.length}/{GAME_LOG_LIMIT}
              {severeCount > 0 ? ` · 严重 ${severeCount}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setSevereOnly(false)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                border: !severeOnly
                  ? '1px solid rgba(201, 162, 39, 0.7)'
                  : '1px solid rgba(255,255,255,0.12)',
                background: !severeOnly ? 'rgba(60, 80, 48, 0.9)' : 'rgba(0,0,0,0.2)',
                color: '#f5f0e6',
              }}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => setSevereOnly(true)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                border: severeOnly
                  ? '1px solid rgba(255, 120, 90, 0.75)'
                  : '1px solid rgba(255,255,255,0.12)',
                background: severeOnly ? 'rgba(100, 36, 28, 0.9)' : 'rgba(0,0,0,0.2)',
                color: severeOnly ? '#ffc8b4' : '#f5f0e6',
              }}
            >
              只看严重
            </button>
          </div>
          <div
            ref={listRef}
            className="miaopu-scroll"
            style={{
              flex: 1,
              minHeight: 120,
              maxHeight: 'min(54vh, 400px)',
              overflowY: 'auto',
              paddingRight: 2,
            }}
          >
            {visible.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.7, padding: '16px 4px' }}>
                {severeOnly
                  ? '暂无病死、走失或海盗/疫病等严重记录。'
                  : '暂无记录。日结、购买、病死、出海与大事会写在这里。'}
              </div>
            ) : (
              visible.map((e) => <LogRow key={e.id} entry={e} />)
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        style={{
          ...dockBtnOpen(open),
          position: 'absolute',
          left: LOG_FAB_LEFT,
          bottom: DOCK_BOTTOM,
          zIndex: 36,
          pointerEvents: 'auto',
          border:
            unreadSevere > 0
              ? '1px solid rgba(255, 120, 90, 0.85)'
              : dockBtnOpen(open).border,
        }}
        onClick={() => toggleLog()}
        title={
          unreadSevere > 0
            ? `大事记 · ${unreadSevere} 条新的严重事件`
            : '打开或关闭大事记'
        }
      >
        日志
        {unreadSevere > 0 && (
          <span
            style={{
              marginLeft: 4,
              padding: '0 5px',
              borderRadius: 999,
              background: '#c84830',
              color: '#fff',
              fontSize: 10,
              fontWeight: 900,
              lineHeight: '16px',
            }}
          >
            {unreadSevere > 9 ? '9+' : unreadSevere}
          </span>
        )}
      </button>
    </div>
  )
}
