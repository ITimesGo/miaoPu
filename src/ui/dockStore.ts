import { create } from 'zustand'

export type DockPanel = 'none' | 'shop' | 'manual' | 'log'

type DockState = {
  open: DockPanel
  openShop: () => void
  openManual: () => void
  openLog: () => void
  close: () => void
  toggleShop: () => void
  toggleManual: () => void
  toggleLog: () => void
}

/** 左下角商店 / 说明 / 日志互斥 */
export const useDockStore = create<DockState>((set, get) => ({
  open: 'none',
  openShop: () => set({ open: 'shop' }),
  openManual: () => set({ open: 'manual' }),
  openLog: () => set({ open: 'log' }),
  close: () => set({ open: 'none' }),
  toggleShop: () => set({ open: get().open === 'shop' ? 'none' : 'shop' }),
  toggleManual: () => set({ open: get().open === 'manual' ? 'none' : 'manual' }),
  toggleLog: () => set({ open: get().open === 'log' ? 'none' : 'log' }),
}))
