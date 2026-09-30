import type { CSSProperties, ReactNode } from 'react'
import { getBreed } from '../game/data/breeds'
import { CAT_BEHAVIOR_LABEL } from '../game/systems/catFarmAI'
import { granaryCapacity } from '../game/data/shop'
import { absoluteGameMinute, weatherLabel } from '../game/data/weather'
import { dailyFishNeed, ROLE_SHORT, clampRoleLevel } from '../game/data/careers'
import { goalRewardText, goalTitle, liveGoalProgress } from '../game/data/goals'
import { eventAlertText } from '../game/data/events'
import { catCapForCottage } from '../game/types'
import { useGameStore } from '../game/state/gameStore'
import { MINUTES_PER_DAY, type Season } from '../game/types'
import { ShopToolbar } from './ShopToolbar'

const SEASON_LABEL: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}

function formatClock(minuteOfDay: number): string {
  const m = Math.floor(minuteOfDay) % MINUTES_PER_DAY
  const h = Math.floor(m / 60)
  const min = Math.floor(m % 60)
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function periodLabel(minuteOfDay: number): string {
  const h = minuteOfDay / 60
  if (h >= 5 && h < 7) return '清晨'
  if (h >= 7 && h < 11) return '上午'
  if (h >= 11 && h < 14) return '中午'
  if (h >= 14 && h < 17) return '下午'
  if (h >= 17 && h < 20) return '黄昏'
  return '夜晚'
}

function isNight(minuteOfDay: number): boolean {
  const h = minuteOfDay / 60
  return h < 5 || h >= 20
}

const panel: CSSProperties = {
  position: 'absolute',
  top: 12,
  left: 12,
  width: 286,
  padding: '10px 11px 9px',
  background: 'linear-gradient(160deg, rgba(22, 36, 28, 0.86), rgba(12, 22, 18, 0.82))',
  borderRadius: 12,
  border: '1px solid rgba(140, 170, 140, 0.28)',
  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
  color: '#f5f0e6',
}

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 5,
  marginTop: 6,
}

function Pill({
  label,
  value,
  warn,
  tone,
}: {
  label: string
  value: ReactNode
  warn?: boolean
  tone?: string
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 7,
        background: warn ? 'rgba(140, 42, 32, 0.5)' : 'rgba(255,255,255,0.06)',
        border: warn ? '1px solid rgba(255,130,100,0.45)' : '1px solid rgba(255,255,255,0.07)',
        lineHeight: 1.25,
      }}
    >
      <span style={{ fontSize: 10, opacity: 0.62, letterSpacing: '0.02em' }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: warn ? '#ffc2b4' : tone ?? '#f5f0e6',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function TinyTag({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '2px 7px',
        borderRadius: 999,
        fontSize: 11,
        background: warn ? 'rgba(140, 42, 32, 0.5)' : 'rgba(255,255,255,0.07)',
        border: warn ? '1px solid rgba(255,130,100,0.4)' : '1px solid rgba(255,255,255,0.08)',
        color: warn ? '#ffc2b4' : undefined,
      }}
    >
      {children}
    </span>
  )
}

export function Hud() {
  const day = useGameStore((s) => s.day)
  const season = useGameStore((s) => s.season)
  const weather = useGameStore((s) => s.weather)
  const rainbowUntil = useGameStore((s) => s.rainbowUntil)
  const gameEvent = useGameStore((s) => s.gameEvent)
  const minuteOfDay = useGameStore((s) => Math.floor(s.minuteOfDay))
  const coins = useGameStore((s) => s.coins)
  const timeScale = useGameStore((s) => s.timeScale)
  const leadBehavior = useGameStore((s) => s.cats[0]?.behavior ?? 'idle')
  const cats = useGameStore((s) => s.cats)
  const catCount = cats.length
  const sickCount = cats.filter((c) => c.sick).length
  const inventory = useGameStore((s) => s.inventory)
  const granary = useGameStore((s) => s.granary)
  const cottage = useGameStore((s) => s.cottage)
  const harbor = useGameStore((s) => s.harbor)
  const boat = useGameStore((s) => s.boat)
  const boatVoyage = useGameStore((s) => s.boatVoyage)
  const seasonGoal = useGameStore((s) => s.seasonGoal)
  const statusMessage = useGameStore((s) => s.statusMessage)
  const gameOver = useGameStore((s) => s.gameOver)
  const setTimeScale = useGameStore((s) => s.setTimeScale)
  const restartGame = useGameStore((s) => s.restartGame)

  const progress = (minuteOfDay % MINUTES_PER_DAY) / MINUTES_PER_DAY
  const night = isNight(minuteOfDay)
  const cap = granaryCapacity(granary)
  const catCap = catCapForCottage(cottage.level)
  const leadLabel = CAT_BEHAVIOR_LABEL[leadBehavior] ?? leadBehavior
  const yieldPct = Math.round((1 + Math.max(0, catCount - 1) * 0.5) * 100)
  const fish = inventory.fish ?? 0
  const fishNeed = dailyFishNeed(cats)
  const fishShort = fish < fishNeed
  const eventKind = gameEvent?.kind ?? 'none'
  const eventActive = eventKind !== 'none'
  const alertText = eventActive ? eventAlertText(eventKind, season) : ''
  const hasRainbow = rainbowUntil > absoluteGameMinute(day, minuteOfDay)
  const seeds = inventory.wheat_seed ?? 0
  const seedShort = season !== 'winter' && seeds <= 0
  const med = inventory.medicine ?? 0
  const medShort = sickCount > 0 && med < sickCount
  const wheat = inventory.wheat ?? 0
  const nowAbs = absoluteGameMinute(day, minuteOfDay)
  const voyageEtaMin =
    boatVoyage.phase === 'away' ? Math.max(0, Math.ceil((boatVoyage.returnAt - nowAbs) / 60)) : 0
  const voyageCooldownMin =
    boatVoyage.phase === 'docked' && boatVoyage.readyAt > nowAbs
      ? Math.max(0, Math.ceil((boatVoyage.readyAt - nowAbs) / 60))
      : 0
  const goalProg = liveGoalProgress(seasonGoal, {
    fish,
    wheat,
    ore: inventory.ore ?? 0,
    wood: inventory.wood ?? 0,
    knowledge: inventory.knowledge ?? 0,
    coins,
    cottageLevel: cottage.level,
    harborLevel: harbor.level,
    boatLevel: boat.level,
    catCount,
  })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        color: '#f5f0e6',
        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: night
            ? 'radial-gradient(ellipse at center, transparent 35%, rgba(4,10,28,0.55) 100%)'
            : 'transparent',
          transition: 'background 0.8s ease',
          pointerEvents: 'none',
        }}
      />

      {eventActive && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            maxWidth: 'min(480px, 70vw)',
            padding: '8px 16px',
            borderRadius: 10,
            background: 'rgba(48, 8, 8, 0.92)',
            border: '2px solid #e84848',
            color: '#ff5a5a',
            fontSize: 14,
            fontWeight: 800,
            textAlign: 'center',
            animation: 'miaopu-event-pulse 1.6s ease-in-out infinite',
          }}
        >
          {alertText}
        </div>
      )}

      <style>{`
        @keyframes miaopu-event-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.82; }
        }
      `}</style>

      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.08em' }}>喵圃</div>
          <div style={{ fontSize: 11, opacity: 0.82, textAlign: 'right' }}>
            第{day}天 · {SEASON_LABEL[season]} · {weatherLabel(weather)}
            {hasRainbow ? ' · 彩虹' : ''}
          </div>
        </div>
        <div style={{ marginTop: 2, fontSize: 11, opacity: 0.7 }}>
          {season === 'winter' ? '休耕中' : '可种麦'} · {leadLabel}
        </div>

        <div style={row}>
          <Pill label="金币" value={coins} tone="#f0d78c" />
          <Pill label="矿石" value={inventory.ore ?? 0} />
          <Pill label="木材" value={inventory.wood ?? 0} />
          <Pill label="鱼肉" value={fishShort ? `${fish}/${fishNeed}` : fish} warn={fishShort} />
          <Pill label="知识" value={inventory.knowledge ?? 0} tone="#a8d4ff" />
          <Pill label="药品" value={med} warn={medShort} tone="#e8a0c8" />
        </div>

        <div style={row}>
          <Pill label="小麦" value={`${wheat}/${cap}`} />
          <Pill label="麦种" value={seeds} warn={seedShort} />
          <Pill label="玩具" value={inventory.toy ?? 0} />
          <Pill label="零食" value={inventory.snack ?? 0} />
          <Pill label="猫群" value={`${catCount}/${catCap}`} warn={sickCount > 0} />
          <Pill label="产量" value={`${yieldPct}%`} />
        </div>

        <div style={{ ...row, marginTop: 7, gap: 4 }}>
          <TinyTag>屋 {cottage.level}</TinyTag>
          <TinyTag>仓 {granary.level}</TinyTag>
          <TinyTag>港 {harbor.level}</TinyTag>
          <TinyTag>船 {boat.level}</TinyTag>
          {cats.map((c) => {
            const b = getBreed(c.breedId)
            const tag = ROLE_SHORT[c.role ?? 'farmer']
            const lv = clampRoleLevel(c.roleLevel)
            return (
              <TinyTag key={c.id} warn={c.sick}>
                {b?.name ?? c.breedId}
                <span style={{ opacity: 0.75, margin: '0 3px' }}>·</span>
                {tag}
                <span style={{ color: '#f0d78c', fontWeight: 800, marginLeft: 2 }}>Lv.{lv}</span>
                {c.sick ? ' · 病' : ''}
              </TinyTag>
            )
          })}
        </div>

        <div
          style={{
            marginTop: 7,
            fontSize: 11,
            lineHeight: 1.45,
            padding: '5px 8px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div>
            {boatVoyage.phase === 'away' ? (
              <span style={{ color: '#a8d4ff' }}>
                货船出海中 · 约 {voyageEtaMin} 时后回港
                {boatVoyage.expectedCoins > 0 ? ` · 预计 +${boatVoyage.expectedCoins}金` : ''}
              </span>
            ) : voyageCooldownMin > 0 ? (
              <span style={{ opacity: 0.8 }}>货船停泊 · {voyageCooldownMin} 时后可再出航</span>
            ) : (
              <span style={{ opacity: 0.8 }}>货船停泊 · 船商备货后可出航</span>
            )}
          </div>
          <div style={{ marginTop: 3 }}>
            {seasonGoal.completed ? (
              <span style={{ color: '#f0d78c' }}>
                目标已完成 · {goalTitle(seasonGoal)}
                <span style={{ opacity: 0.85, fontWeight: 500 }}>
                  {' '}
                  （已领 {goalRewardText(seasonGoal)}）
                </span>
              </span>
            ) : (
              <>
                <div>
                  季节目标 · {goalTitle(seasonGoal)}{' '}
                  <span style={{ color: '#f0d78c', fontWeight: 700 }}>
                    {goalProg}/{seasonGoal.target}
                  </span>
                </div>
                <div style={{ marginTop: 2, opacity: 0.85, fontSize: 10.5 }}>
                  奖励 {goalRewardText(seasonGoal)}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            paddingTop: 7,
            borderTop: '1px solid rgba(255,255,255,0.09)',
            fontSize: 11.5,
            lineHeight: 1.4,
            opacity: 0.92,
            color: eventActive ? '#ff6a6a' : undefined,
            fontWeight: eventActive ? 700 : undefined,
          }}
        >
          {eventActive ? alertText : statusMessage}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          minWidth: 172,
          padding: '10px 14px',
          background: night ? 'rgba(12, 18, 36, 0.88)' : 'rgba(20, 35, 28, 0.78)',
          borderRadius: 12,
          border: night ? '1px solid #3a5080' : '1px solid #4a6354',
          lineHeight: 1.4,
          pointerEvents: 'auto',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 2 }}>当前时间</div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
            fontFamily: 'ui-monospace, "Cascadia Mono", Consolas, monospace',
          }}
        >
          {formatClock(minuteOfDay)}
        </div>
        <div style={{ fontSize: 12, marginTop: 2 }}>{periodLabel(minuteOfDay)}</div>
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>一倍速：24 时 ≈ 6 分</div>
        <div
          style={{
            marginTop: 8,
            height: 5,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              borderRadius: 999,
              background: night
                ? 'linear-gradient(90deg, #4a6ab0, #a8c0ff)'
                : 'linear-gradient(90deg, #f0c060, #ffe8a0)',
              transition: 'width 0.2s linear',
            }}
          />
        </div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 10, marginBottom: 5 }}>流速</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1, 2, 4, 8].map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setTimeScale(scale)}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: 6,
                border: timeScale === scale ? '2px solid #f0d78c' : '1px solid #4a6354',
                background: timeScale === scale ? '#3d5c48' : 'rgba(12, 22, 18, 0.75)',
                color: '#f5f0e6',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: timeScale === scale ? 700 : 500,
              }}
            >
              ×{scale}
            </button>
          ))}
        </div>
      </div>

      <ShopToolbar />

      {gameOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(8, 14, 12, 0.72)',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: 420,
              padding: '28px 32px',
              borderRadius: 14,
              background: 'rgba(28, 42, 34, 0.96)',
              border: '1px solid #6a8a6a',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              textAlign: 'center',
              lineHeight: 1.55,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 10 }}>
              喵圃暂歇
            </div>
            <div style={{ fontSize: 14, opacity: 0.92, marginBottom: 8 }}>
              猫猫们都离开了。备足鱼肉、麦种与药品，日子会轻松许多。
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 20 }}>
              坚持到第 {day} 天 · {SEASON_LABEL[season]}
            </div>
            <button
              type="button"
              onClick={() => restartGame()}
              style={{
                padding: '10px 28px',
                borderRadius: 10,
                border: '2px solid #f0d78c',
                background: '#3d5c48',
                color: '#f5f0e6',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.04em',
              }}
            >
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
