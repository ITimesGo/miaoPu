import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  filterManualSections,
  highlightSegments,
  MANUAL_SECTIONS,
} from '../game/data/manual'
import {
  DOCK_BOTTOM,
  DOCK_BTN_H,
  DOCK_GAP,
  DOCK_LEFT,
  MANUAL_FAB_LEFT,
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
  width: 'min(400px, calc(100vw - 24px))',
  maxHeight: 'min(78vh, 640px)',
  display: 'flex',
  flexDirection: 'column',
  padding: '10px 11px 9px',
  background: 'linear-gradient(160deg, rgba(22, 36, 28, 0.92), rgba(12, 22, 18, 0.9))',
  borderRadius: 12,
  border: '1px solid rgba(140, 170, 140, 0.28)',
  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
  color: '#f5f0e6',
  pointerEvents: 'auto',
  zIndex: 35,
}

const tocBtn: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e8ffe8',
  borderRadius: 6,
  padding: '3px 7px',
  fontSize: 11,
  cursor: 'pointer',
  lineHeight: 1.3,
}

export function ManualPanel() {
  const open = useDockStore((s) => s.open === 'manual')
  const toggleManual = useDockStore((s) => s.toggleManual)
  const closeDock = useDockStore((s) => s.close)
  const [query, setQuery] = useState('')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const visible = filterManualSections(MANUAL_SECTIONS, query)

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDock()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeDock])

  const jumpTo = (id: string) => {
    const el = sectionRefs.current[id]
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
              marginBottom: 8,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800 }}>说明书</span>
            <button
              type="button"
              onClick={() => closeDock()}
              style={{
                ...tocBtn,
                fontWeight: 700,
                padding: '4px 10px',
              }}
            >
              关闭
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="检索关键词…"
            style={{
              flexShrink: 0,
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: 8,
              padding: '7px 9px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(0,0,0,0.28)',
              color: '#f5f0e6',
              fontSize: 13,
              outline: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 5,
              marginBottom: 8,
              flexShrink: 0,
            }}
          >
            {visible.map((s) => (
              <button key={s.id} type="button" style={tocBtn} onClick={() => jumpTo(s.id)}>
                {s.title}
              </button>
            ))}
          </div>

          <div
            className="miaopu-scroll"
            style={{
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              paddingRight: 4,
            }}
          >
            {visible.length === 0 ? (
              <div style={{ fontSize: 12, opacity: 0.7, padding: '12px 4px' }}>无匹配内容</div>
            ) : (
              visible.map((s) => (
                <section
                  key={s.id}
                  id={`manual-${s.id}`}
                  ref={(el) => {
                    sectionRefs.current[s.id] = el
                  }}
                  style={{ marginBottom: 14 }}
                >
                  <h3
                    style={{
                      margin: '0 0 6px',
                      fontSize: 13,
                      fontWeight: 800,
                      color: '#f0d78c',
                    }}
                  >
                    {s.title}
                  </h3>
                  {s.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      style={{
                        margin: '0 0 6px',
                        fontSize: 12,
                        lineHeight: 1.55,
                        opacity: 0.92,
                      }}
                    >
                      {highlightSegments(p, query).map((seg, j) =>
                        seg.hit ? (
                          <mark
                            key={j}
                            style={{
                              background: 'rgba(240,215,140,0.45)',
                              color: 'inherit',
                              borderRadius: 2,
                              padding: '0 1px',
                            }}
                          >
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={j}>{seg.text}</span>
                        ),
                      )}
                    </p>
                  ))}
                </section>
              ))
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        style={{
          ...dockBtnOpen(open),
          position: 'absolute',
          left: MANUAL_FAB_LEFT,
          bottom: DOCK_BOTTOM,
          zIndex: 36,
          pointerEvents: 'auto',
        }}
        onClick={() => toggleManual()}
        title="打开或关闭说明书"
      >
        说明
      </button>
    </div>
  )
}
