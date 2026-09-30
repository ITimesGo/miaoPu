import { useState, type CSSProperties } from 'react'
import { getBreed } from '../game/data/breeds'
import {
  JOB_ROLES,
  ROLE_LABEL,
  ROLE_SHORT,
  clampRoleLevel,
  countByRole,
} from '../game/data/careers'
import { getShopActions, type ShopCategory } from '../game/data/shop'
import {
  SELL_HINT,
  SELL_LABEL,
  SELL_RESOURCES,
  sellPreview,
  type SellAmountMode,
  type SellResourceId,
} from '../game/data/sell'
import type { CatInstance, CatRole } from '../game/types'
import { useGameStore } from '../game/state/gameStore'
import { useDockStore } from './dockStore'
import { DOCK_BOTTOM, DOCK_BTN_H, DOCK_GAP, DOCK_LEFT, dockBtnOpen } from './dockStyles'

const TABS: Array<{ id: ShopCategory; label: string }> = [
  { id: 'item', label: '物品' },
  { id: 'sell', label: '回收' },
  { id: 'building', label: '建筑' },
  { id: 'cat', label: '猫咪' },
]

const PANEL_W = 286

const stepBtn: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 5,
  border: '1px solid #3d8f5a',
  background: '#163525',
  color: '#e8ffe8',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  padding: 0,
}

function RoleRoster() {
  const cats = useGameStore((s) => s.cats)
  const adjustRoleCount = useGameStore((s) => s.adjustRoleCount)
  const counts = countByRole(cats)

  const canPlus = (_role: CatRole) => {
    if (cats.length === 0) return false
    return counts.civilian > 0
  }

  const canMinus = (role: CatRole) => counts[role] > 0

  const plusHint =
    counts.civilian <= 0 ? '没有散民可分配' : '从散民就任'

  return (
    <div
      style={{
        marginBottom: 8,
        padding: '7px 8px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(201, 162, 39, 0.35)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700 }}>职业编制</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>就任 / 解除均免费</span>
      </div>
      {counts.civilian <= 0 && (
        <div style={{ marginBottom: 6, fontSize: 10, opacity: 0.7, lineHeight: 1.35 }}>
          没有散民：先用 − 解除职业，再 + 就任。
        </div>
      )}
      <div
        style={{
          marginBottom: 6,
          padding: '5px 8px',
          borderRadius: 7,
          background: counts.civilian > 0 ? 'rgba(160, 190, 220, 0.12)' : 'rgba(0,0,0,0.16)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>
            <span style={{ fontWeight: 700 }}>散</span>
            <span style={{ opacity: 0.75 }}> 散民</span>
            <span style={{ opacity: 0.55, fontSize: 10, marginLeft: 6 }}>闲逛待分配</span>
          </span>
          <span style={{ fontWeight: 800, color: '#a8d4ff', fontVariantNumeric: 'tabular-nums' }}>
            {counts.civilian}
          </span>
        </div>
        {cats.filter((c) => c.role === 'civilian').length > 0 && (
          <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {cats
              .filter((c) => c.role === 'civilian')
              .map((c) => {
                const b = getBreed(c.breedId)
                return (
                  <span
                    key={c.id}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(160, 190, 220, 0.3)',
                    }}
                  >
                    {b?.name ?? c.breedId}
                    {c.sick ? ' · 病' : ''}
                  </span>
                )
              })}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {JOB_ROLES.map((role) => {
          const plus = canPlus(role)
          const minus = canMinus(role)
          const members = cats.filter((c) => (c.role ?? 'farmer') === role)
          return (
            <div
              key={role}
              style={{
                padding: '5px 6px',
                borderRadius: 7,
                background: counts[role] > 0 ? 'rgba(240, 215, 140, 0.1)' : 'rgba(0,0,0,0.16)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 700, marginRight: 4 }}>{ROLE_SHORT[role]}</span>
                  <span style={{ opacity: 0.75 }}>{ROLE_LABEL[role]}</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <button
                    type="button"
                    style={{ ...stepBtn, opacity: minus ? 1 : 0.3 }}
                    disabled={!minus}
                    onClick={() => adjustRoleCount(role, -1)}
                    title="解除为散民"
                  >
                    −
                  </button>
                  <span
                    style={{
                      minWidth: 16,
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: 13,
                      color: '#f0d78c',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {counts[role]}
                  </span>
                  <button
                    type="button"
                    style={{ ...stepBtn, opacity: plus ? 1 : 0.3 }}
                    disabled={!plus}
                    onClick={() => adjustRoleCount(role, 1)}
                    title={plusHint}
                  >
                    +
                  </button>
                </div>
              </div>
              {members.length > 0 && (
                <div
                  style={{
                    marginTop: 4,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                  }}
                >
                  {members.map((c) => {
                    const b = getBreed(c.breedId)
                    const lv = clampRoleLevel(c.roleLevel)
                    return (
                      <span
                        key={c.id}
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 999,
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid rgba(240, 215, 140, 0.25)',
                        }}
                      >
                        {b?.name ?? c.breedId}{' '}
                        <span style={{ color: '#f0d78c', fontWeight: 700 }}>Lv.{lv}</span>
                        {c.sick ? ' · 病' : ''}
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SellPanel() {
  const inventory = useGameStore((s) => s.inventory)
  const cats = useGameStore((s) => s.cats)
  const shopSell = useGameStore((s) => s.shopSell)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, opacity: 0.7, lineHeight: 1.4, marginBottom: 2 }}>
        折价回收，低于码头/出海；鱼肉会预留明日口粮。有船商时单价略高。
      </div>
      {SELL_RESOURCES.map((id) => (
        <SellRow key={id} id={id} inventory={inventory} cats={cats} onSell={shopSell} />
      ))}
    </div>
  )
}

function SellRow({
  id,
  inventory,
  cats,
  onSell,
}: {
  id: SellResourceId
  inventory: Record<string, number>
  cats: CatInstance[]
  onSell: (resource: SellResourceId, mode: SellAmountMode) => boolean
}) {
  const stock = inventory[id] ?? 0
  const one = sellPreview(id, 'one', inventory, cats)
  const modes: Array<{ mode: SellAmountMode; label: string }> = [
    { mode: 'one', label: '卖1' },
    { mode: 'half', label: '一半' },
    { mode: 'all', label: '全卖' },
  ]

  return (
    <div
      style={{
        padding: '8px 10px',
        borderRadius: 9,
        border: '1px solid rgba(180, 140, 80, 0.4)',
        background: one.max > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.2)',
        opacity: one.max > 0 ? 1 : 0.55,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          alignItems: 'baseline',
          marginBottom: 2,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>{SELL_LABEL[id]}</span>
        <span style={{ fontSize: 11, color: '#f0d78c' }}>
          库存 {stock} · 可售 {one.max} · 单价 {one.unit}金
        </span>
      </div>
      <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 6 }}>{SELL_HINT[id]}</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {modes.map(({ mode, label }) => {
          const p = sellPreview(id, mode, inventory, cats)
          const can = p.qty > 0
          return (
            <button
              key={mode}
              type="button"
              disabled={!can}
              onClick={() => onSell(id, mode)}
              title={can ? `出售 ${p.qty} → +${p.earn} 金` : '无可售'}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: 7,
                border: can ? '1px solid rgba(201,162,39,0.5)' : '1px solid rgba(80,90,80,0.4)',
                background: can ? 'rgba(100, 75, 20, 0.55)' : 'rgba(0,0,0,0.25)',
                color: '#f5f0e6',
                cursor: can ? 'pointer' : 'default',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {label}
              {can ? ` +${p.earn}` : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ShopToolbar() {
  const open = useDockStore((s) => s.open === 'shop')
  const toggleShop = useDockStore((s) => s.toggleShop)
  const closeDock = useDockStore((s) => s.close)
  const [tab, setTab] = useState<ShopCategory>('item')
  const coins = useGameStore((s) => s.coins)
  const granary = useGameStore((s) => s.granary)
  const harbor = useGameStore((s) => s.harbor)
  const boat = useGameStore((s) => s.boat)
  const cottage = useGameStore((s) => s.cottage)
  const inventory = useGameStore((s) => s.inventory)
  const cats = useGameStore((s) => s.cats)
  const shopBuy = useGameStore((s) => s.shopBuy)
  const owned = cats.map((c) => c.breedId)
  const actions =
    tab === 'sell'
      ? []
      : getShopActions({
          granary,
          harbor,
          boat,
          cottage,
          ownedBreedIds: owned,
          catCount: cats.length,
          cats,
        }).filter((a) => a.category === tab)
  const ore = inventory.ore ?? 0
  const wood = inventory.wood ?? 0
  const knowledge = inventory.knowledge ?? 0

  return (
    <div
      style={{
        position: 'absolute',
        left: DOCK_LEFT,
        bottom: DOCK_BOTTOM,
        zIndex: 25,
        pointerEvents: 'none',
      }}
    >
      {open && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: DOCK_BTN_H + DOCK_GAP,
            pointerEvents: 'auto',
            width: PANEL_W,
            maxHeight: 'min(52vh, 420px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '9px 10px 10px',
            borderRadius: 12,
            background: 'linear-gradient(160deg, rgba(22, 36, 28, 0.94), rgba(12, 22, 18, 0.92))',
            border: '1px solid rgba(140, 170, 140, 0.3)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
            color: '#f5f0e6',
          }}
        >
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
        <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.06em' }}>商店</span>
        <button
          type="button"
          onClick={() => closeDock()}
          style={{
            padding: '4px 10px',
            borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: '#f5f0e6',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          收起
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: 7,
                border: active ? '1px solid #c9a227' : '1px solid transparent',
                background: active ? 'rgba(100, 75, 20, 0.85)' : 'rgba(255,255,255,0.05)',
                color: '#f5f0e6',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 8, flexShrink: 0 }}>
        金 {coins} · 矿 {ore} · 木 {wood} · 知 {knowledge}
      </div>

      <div
        className="miaopu-scroll"
        style={{ overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: 4 }}
      >
        {tab === 'cat' && <RoleRoster />}
        {tab === 'sell' ? (
          <SellPanel />
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {actions.length === 0 && (
            <div style={{ fontSize: 12, opacity: 0.65, padding: '4px 2px' }}>
              {tab === 'cat' ? '暂无招募/升级项' : '此分类暂无可购项'}
            </div>
          )}
          {actions.map((a) => {
            const needOre = a.oreCost ?? 0
            const needWood = a.woodCost ?? 0
            const needKnow = a.knowledgeCost ?? 0
            const can =
              coins >= a.price && ore >= needOre && wood >= needWood && knowledge >= needKnow
            const costParts = [
              a.price > 0 ? `${a.price}金` : null,
              needOre > 0 ? `${needOre}矿` : null,
              needWood > 0 ? `${needWood}木` : null,
              needKnow > 0 ? `${needKnow}知` : null,
            ].filter(Boolean)
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => shopBuy(a.id)}
                title={a.desc}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 9,
                  border: `1px solid ${
                    a.category === 'cat'
                      ? 'rgba(201,162,39,0.55)'
                      : a.category === 'building'
                        ? 'rgba(126,200,232,0.45)'
                        : can
                          ? 'rgba(106,143,116,0.55)'
                          : 'rgba(80,90,80,0.45)'
                  }`,
                  background: can ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.22)',
                  color: '#f5f0e6',
                  cursor: can ? 'pointer' : 'default',
                  opacity: can ? 1 : 0.55,
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    justifyContent: 'space-between',
                    gap: 8,
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{a.label}</span>
                  <span style={{ fontSize: 11, color: '#f0d78c', whiteSpace: 'nowrap' }}>
                    {costParts.length > 0 ? costParts.join(' · ') : '免费'}
                  </span>
                </div>
                <span style={{ fontSize: 10, opacity: 0.72, lineHeight: 1.35 }}>{a.desc}</span>
              </button>
            )
          })}
        </div>
        )}
      </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => toggleShop()}
        style={{ ...dockBtnOpen(open), pointerEvents: 'auto', position: 'relative', zIndex: 26 }}
      >
        商店
      </button>
    </div>
  )
}
