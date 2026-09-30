import { create } from 'zustand'

export type DockPanel = 'none' | 'shop' | 'manual'

type DockState = {
  open: DockPanel
  openShop: () => void
  openManual: () => void
  close: () => void
  toggleShop: () => void
  toggleManual: () => void
}

/** 左下角商店 / 说明互斥：打开一侧即关闭另一侧 */
export const useDockStore = create<DockState>((set, get) => ({
  open: 'none',
  openShop: () => set({ open: 'shop' }),
  openManual: () => set({ open: 'manual' }),
  close: () => set({ open: 'none' }),
  toggleShop: () => set({ open: get().open === 'shop' ? 'none' : 'shop' }),
  toggleManual: () => set({ open: get().open === 'manual' ? 'none' : 'manual' }),
}))
