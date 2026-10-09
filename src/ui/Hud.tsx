import { useState, type CSSProperties, type ReactNode } from 'react'
import { getBreed } from '../game/data/breeds'
import { CAT_BEHAVIOR_LABEL } from '../game/systems/catFarmAI'
import { granaryCapacity } from '../game/data/shop'
import { absoluteGameMinute, weatherLabel } from '../game/data/weather'
import { dailyFishNeed, medicinePerCure, ROLE_SHORT, clampRoleLevel } from '../game/data/careers'
import { goalRewardText, goalTitle, liveGoalProgress } from '../game/data/goals'
import { eventAlertText } from '../game/data/events'
import { coinSoftCap, softCapFor } from '../game/data/economy'
import { heatingWoodNeed } from '../game/data/heating'
import { countToolWorkers, toolMaintOreNeed } from '../game/data/tools'
import {
  catCapForCottage,
  MINUTES_PER_DAY,
  type Season,
} from '../game/types'
import { useGameStore } from '../game/state/gameStore'
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
  width: 312,
  padding: '9px 10px 8px',
  background: 'linear-gradient(160deg, rgba(22, 36, 28, 0.88), rgba(12, 22, 18, 0.84))',
  borderRadius: 12,
  border: '1px solid rgba(140, 170, 140, 0.28)',
  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
  color: '#f5f0e6',
  pointerEvents: 'auto',
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
  const [catsOpen, setCatsOpen] = useState(false)
  const day = useGameStore((s) => s.day)
  const season = useGameStore((s) => s.season)
  const weather = useGameStore((s) => s.weather)
  const rainbowUntil = useGameStore((s) => s.rainbowUntil)
  const gameEvent = useGameStore((s) => s.gameEvent)
  const majorEvent = useGameStore((s) => s.majorEvent)
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
  const toolsWorn = useGameStore((s) => s.toolsWorn)
  const gameOver = useGameStore((s) => s.gameOver)
  const setTimeScale = useGameStore((s) => s.setTimeScale)
  const restartGame = useGameStore((s) => s.restartGame)

  const progress = (minuteOfDay % MINUTES_PER_DAY) / MINUTES_PER_DAY
  const night = isNight(minuteOfDay)
  const cap = granaryCapacity(granary)
  const catCap = catCapForCottage(cottage.level)
  const buildings = {
    cottage: cottage.level,
    harbor: harbor.level,
    boat: boat.level,
    granary: granary.level,
  }
  const coinCap = coinSoftCap(buildings)
  const oreCap = softCapFor('ore', buildings)!
  const woodCap = softCapFor('wood', buildings)!
  const fishCap = softCapFor('fish', buildings)!
  const knowCap = softCapFor('knowledge', buildings)!
  const medCap = softCapFor('medicine', buildings)!
  const leadLabel = CAT_BEHAVIOR_LABEL[leadBehavior] ?? leadBehavior
  const fish = inventory.fish ?? 0
  const fishNeed = dailyFishNeed(cats)
  const fishShort = fish < fishNeed
  const wood = inventory.wood ?? 0
  const woodNeed = heatingWoodNeed(catCount, season)
  const woodShort = wood < woodNeed
  const ore = inventory.ore ?? 0
  const oreNeed = toolMaintOreNeed(cats)
  const oreShort = oreNeed > 0 && ore < oreNeed
  const eventKind = gameEvent?.kind ?? 'none'
  const eventActive = eventKind !== 'none'
  const alertText = eventActive ? eventAlertText(eventKind, season) : ''
  const hasRainbow = rainbowUntil > absoluteGameMinute(day, minuteOfDay)
  const seeds = inventory.wheat_seed ?? 0
  const seedShort = season !== 'winter' && seeds <= 0
  const med = inventory.medicine ?? 0
  const medNeed = sickCount * medicinePerCure(cats)
  const medShort = sickCount > 0 && med < medNeed
  const wheat = inventory.wheat ?? 0
  const nowAbs = absoluteGameMinute(day, minuteOfDay)
  const plagueDaysLeft =
    majorEvent.plagueUntil > nowAbs
      ? Math.max(1, Math.ceil((majorEvent.plagueUntil - nowAbs) / MINUTES_PER_DAY))
      : 0
  const voyageEtaMin =
    boatVoyage.phase === 'away' ? Math.max(0, Math.ceil((boatVoyage.returnAt - nowAbs) / 60)) : 0
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
  const speedScales = import.meta.env.DEV ? [1, 2, 4, 8] : [1, 2]

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', flexShrink: 0 }}>
            喵圃
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 11, opacity: 0.85 }}>
                第{day}天 · {SEASON_LABEL[season]} · {weatherLabel(weather)}
                {hasRainbow ? ' · 彩虹' : ''}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'ui-monospace, Cascadia Mono, Consolas, monospace',
                  letterSpacing: '0.02em',
                }}
              >
                {formatClock(minuteOfDay)}
                <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, marginLeft: 4 }}>
                  {periodLabel(minuteOfDay)}
                </span>
              </span>
            </div>
            <div
              style={{
                marginTop: 4,
                height: 3,
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
          </div>
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {speedScales.map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => setTimeScale(scale)}
                title={`流速 ×${scale}`}
                style={{
                  width: 28,
                  height: 26,
                  padding: 0,
                  borderRadius: 6,
                  border: timeScale === scale ? '2px solid #f0d78c' : '1px solid #4a6354',
                  background: timeScale === scale ? '#3d5c48' : 'rgba(12, 22, 18, 0.75)',
                  color: '#f5f0e6',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: timeScale === scale ? 800 : 500,
                }}
              >
                ×{scale}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 3, fontSize: 10, opacity: 0.65 }}>
          {season === 'winter' ? '休耕中' : '可种麦'} · {leadLabel}
        </div>

        <div style={row}>
          <Pill
            label="金币"
            value={`${coins}/${coinCap}`}
            tone="#f0d78c"
            warn={coins >= coinCap}
          />
          <Pill
            label="矿石"
            value={`${ore}/${oreCap}`}
            warn={oreShort || toolsWorn || ore >= oreCap}
          />
          <Pill
            label="木材"
            value={`${wood}/${woodCap}`}
            warn={woodShort || wood >= woodCap}
          />
          <Pill
            label="鱼肉"
            value={`${fish}/${fishCap}`}
            warn={fishShort || fish >= fishCap}
          />
          <Pill
            label="知识"
            value={`${inventory.knowledge ?? 0}/${knowCap}`}
            tone="#a8d4ff"
            warn={(inventory.knowledge ?? 0) >= knowCap}
          />
          <Pill
            label="药品"
            value={`${med}/${medCap}`}
            warn={medShort || med >= medCap}
            tone="#e8a0c8"
          />
          <Pill label="小麦" value={`${wheat}/${cap}`} warn={wheat >= cap} />
          <Pill label="麦种" value={seeds} warn={seedShort} />
          <Pill
            label="猫群"
            value={`${catCount}/${catCap}${sickCount > 0 ? ` ·病${sickCount}` : ''}`}
            warn={sickCount > 0 || catCount >= catCap}
          />
        </div>
        {fishShort && (
          <div style={{ marginTop: 3, fontSize: 10, color: '#ffb090', fontWeight: 600 }}>
            鱼偏低 {fish}/{fishNeed}
          </div>
        )}
        {woodShort && (
          <div style={{ marginTop: 3, fontSize: 10, color: '#ffb090', fontWeight: 600 }}>
            木偏低 {wood}/{woodNeed}
            {season === 'winter' ? '（冬）' : ''}
          </div>
        )}
        {(oreShort || toolsWorn) && (
          <div style={{ marginTop: 3, fontSize: 10, color: '#ffb090', fontWeight: 600 }}>
            {toolsWorn
              ? '工具偏钝 · 日结备矿可修好'
              : `矿偏低 ${ore}/${oreNeed}（户外工 ${countToolWorkers(cats)}）`}
          </div>
        )}

        <div style={{ ...row, marginTop: 6, gap: 4, alignItems: 'center' }}>
          <TinyTag>屋 {cottage.level}</TinyTag>
          <TinyTag>
            仓 {granary.level}
            {granary.level > 0 ? ` ·${Math.floor(granary.condition)}%` : ''}
          </TinyTag>
          <TinyTag>港 {harbor.level}</TinyTag>
          <TinyTag>船 {boat.level}</TinyTag>
          <button
            type="button"
            onClick={() => setCatsOpen((v) => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 8px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              background: sickCount > 0 ? 'rgba(140, 42, 32, 0.5)' : 'rgba(255,255,255,0.07)',
              border:
                sickCount > 0
                  ? '1px solid rgba(255,130,100,0.4)'
                  : '1px solid rgba(255,255,255,0.12)',
              color: sickCount > 0 ? '#ffc2b4' : '#f5f0e6',
            }}
            title={catsOpen ? '收起猫群名单' : '展开猫群名单'}
          >
            猫群 {catsOpen ? '▴' : '▾'}
            {sickCount > 0 ? ` ·病${sickCount}` : ''}
          </button>
        </div>
        {catsOpen && (
          <div style={{ ...row, marginTop: 4, gap: 4 }}>
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
        )}

        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            lineHeight: 1.4,
            padding: '5px 7px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {boatVoyage.phase === 'away' && (
            <div style={{ marginBottom: 2, color: '#a8d4ff' }}>
              出海中 · {voyageEtaMin} 时后回港
              {boatVoyage.expectedCoins > 0 ? ` · +${boatVoyage.expectedCoins}金` : ''}
            </div>
          )}
          {seasonGoal.completed ? (
            <span style={{ color: '#f0d78c' }}>
              目标完成 · {goalTitle(seasonGoal)}
              <span style={{ opacity: 0.8, fontWeight: 500 }}>
                {' '}
                （{goalRewardText(seasonGoal)}）
              </span>
            </span>
          ) : (
            <span>
              目标 · {goalTitle(seasonGoal)}{' '}
              <span style={{ color: '#f0d78c', fontWeight: 700 }}>
                {goalProg}/{seasonGoal.target}
              </span>
              <span style={{ opacity: 0.75, fontSize: 10, marginLeft: 4 }}>
                {goalRewardText(seasonGoal)}
              </span>
            </span>
          )}
          {plagueDaysLeft > 0 && (
            <div style={{ marginTop: 2, color: '#e8a090', fontWeight: 600 }}>
              疫病潮 · 约剩 {plagueDaysLeft} 日
              {majorEvent.plagueSickMult < 1
                ? '（风险降低）'
                : majorEvent.plagueSickMult > 1
                  ? '（风险升高）'
                  : ''}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: '1px solid rgba(255,255,255,0.09)',
            fontSize: 11,
            lineHeight: 1.35,
            opacity: 0.92,
            color: eventActive ? '#ff6a6a' : undefined,
            fontWeight: eventActive ? 700 : undefined,
          }}
        >
          {eventActive ? alertText : statusMessage}
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
