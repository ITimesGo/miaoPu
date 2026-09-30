import type { CSSProperties } from 'react'

/** 左下角「商店 / 说明」统一尺寸 */
export const DOCK_BTN_H = 40
export const DOCK_BTN_MIN_W = 64
export const DOCK_GAP = 8
export const DOCK_LEFT = 12
export const DOCK_BOTTOM = 12

/** 说明按钮：紧挨商店右侧 */
export const MANUAL_FAB_LEFT = DOCK_LEFT + DOCK_BTN_MIN_W + DOCK_GAP

export const dockBtnBase: CSSProperties = {
  boxSizing: 'border-box',
  height: DOCK_BTN_H,
  minWidth: DOCK_BTN_MIN_W,
  padding: '0 14px',
  borderRadius: 10,
  border: '1px solid rgba(201, 162, 39, 0.55)',
  background: 'linear-gradient(160deg, rgba(28, 42, 32, 0.92), rgba(16, 26, 20, 0.9))',
  color: '#f5f0e6',
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: '0.06em',
  lineHeight: 1,
  boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
}

export function dockBtnOpen(open: boolean): CSSProperties {
  return {
    ...dockBtnBase,
    border: open
      ? '1px solid rgba(201, 162, 39, 0.85)'
      : '1px solid rgba(201, 162, 39, 0.55)',
    background: open
      ? 'linear-gradient(160deg, rgba(48, 62, 32, 0.95), rgba(28, 40, 22, 0.92))'
      : dockBtnBase.background,
  }
}
