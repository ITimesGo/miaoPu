import { useEffect, useState, type CSSProperties } from 'react'
import { getBreed } from '../game/data/breeds'
import { MAJOR_DECIDE_MS, plagueIsolateMedicineCost } from '../game/data/majorEvents'
import { fightBeatAt, PIRATE_FIGHT_MS } from '../game/data/pirates'
import { catCapForCottage } from '../game/types'
import { useGameStore } from '../game/state/gameStore'

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 55,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(6, 10, 14, 0.78)',
  pointerEvents: 'auto',
}

const card: CSSProperties = {
  width: 'min(440px, 92vw)',
  padding: '26px 28px',
  borderRadius: 14,
  background: 'linear-gradient(165deg, rgba(42, 28, 28, 0.97), rgba(22, 30, 34, 0.97))',
  border: '1px solid #a07050',
  boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
  color: '#f5efe6',
  textAlign: 'center',
  lineHeight: 1.55,
}

const btnBase: CSSProperties = {
  padding: '10px 18px',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  letterSpacing: '0.03em',
}

function formatRemain(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function MajorEventPanel() {
  const ev = useGameStore((s) => s.majorEvent)
  const cats = useGameStore((s) => s.cats)
  const cottageLevel = useGameStore((s) => s.cottage.level)
  const coins = useGameStore((s) => s.coins)
  const inventory = useGameStore((s) => s.inventory)
  const gameOver = useGameStore((s) => s.gameOver)
  const pirateTribute = useGameStore((s) => s.pirateTribute)
  const pirateFight = useGameStore((s) => s.pirateFight)
  const pirateRevealFight = useGameStore((s) => s.pirateRevealFight)
  const majorAck = useGameStore((s) => s.majorAck)
  const majorPlagueIsolate = useGameStore((s) => s.majorPlagueIsolate)
  const majorPlagueEndure = useGameStore((s) => s.majorPlagueEndure)
  const majorStrayAccept = useGameStore((s) => s.majorStrayAccept)
  const majorStrayReject = useGameStore((s) => s.majorStrayReject)

  const [now, setNow] = useState(() => Date.now())
  const [fightProg, setFightProg] = useState(0)

  useEffect(() => {
    if (ev.phase !== 'threat' && ev.phase !== 'fighting') return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [ev.phase])

  useEffect(() => {
    if (ev.kind !== 'pirate' || ev.phase !== 'fighting') {
      setFightProg(0)
      return
    }
    const started = ev.fightEndsAt - PIRATE_FIGHT_MS
    const tick = () => {
      const p = Math.min(1, Math.max(0, (Date.now() - started) / PIRATE_FIGHT_MS))
      setFightProg(p)
      if (p >= 1) pirateRevealFight()
    }
    tick()
    const id = window.setInterval(tick, 50)
    return () => window.clearInterval(id)
  }, [ev.kind, ev.phase, ev.fightEndsAt, pirateRevealFight])

  if (gameOver) return null
  if (ev.phase === 'idle' && !ev.needsAck) return null
  if (ev.phase === 'idle') return null

  const remain = ev.decideBy - now
  const urgent = ev.phase === 'threat' && remain < 60_000
  const medCost = plagueIsolateMedicineCost(cats)
  const medHave = inventory.medicine ?? 0
  const canIsolate = medHave >= medCost
  const strayBreed = ev.strayBreedId ? getBreed(ev.strayBreedId) : null
  const catCap = catCapForCottage(cottageLevel)
  const catFull = cats.length >= catCap
  const canAffordStray =
    coins >= ev.strayCostCoins && (inventory.fish ?? 0) >= ev.strayCostFish
  const canAcceptStray = !catFull && canAffordStray
  const acceptHint = catFull
    ? `猫口已满（${cats.length}/${catCap}），升级小屋后再收留`
    : !canAffordStray
      ? '鱼或金币不足'
      : ''

  const autoBanner =
    ev.kind === 'pirate'
      ? '你离开期间海盗来过！以下为自动献贡结果'
      : ev.kind === 'plague'
        ? '你离开期间疫病蔓延！以下为自动硬扛结果'
        : '你离开期间有流浪猫来访！以下为自动婉拒结果'

  return (
    <div style={overlay}>
      <div
        className="miaopu-scroll"
        style={{
          ...card,
          borderColor: ev.autoResolved || urgent ? '#e07050' : '#a07050',
          maxHeight: '86vh',
          overflowY: 'auto',
        }}
      >
        {ev.phase === 'threat' && ev.kind === 'pirate' && (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>
              海盗来袭
            </div>
            <div style={{ fontSize: 14, opacity: 0.92, marginBottom: 14 }}>
              黑帆逼近码头。献上贡品可保平安；奋起反抗则胜负难料——可能击退缴获，也可能折损猫口，极罕见会全岛失守。
            </div>
            <Countdown remain={remain} urgent={urgent} timeoutHint="超时将自动献贡。" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => pirateTribute()} style={softBtn}>
                献上贡品
              </button>
              <button type="button" onClick={() => pirateFight()} style={dangerBtn}>
                奋起反抗
              </button>
            </div>
          </>
        )}

        {ev.phase === 'threat' && ev.kind === 'plague' && (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>
              疫病潮
            </div>
            <div style={{ fontSize: 14, opacity: 0.92, marginBottom: 14 }}>
              岛上疫病扩散。隔离可压低未来两日生病风险并尝试立刻治愈；硬扛则未来三日风险升高。超时将自动硬扛。
            </div>
            <Countdown remain={remain} urgent={urgent} timeoutHint="超时将自动硬扛。" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={!canIsolate}
                onClick={() => majorPlagueIsolate()}
                style={{
                  ...softBtn,
                  opacity: canIsolate ? 1 : 0.45,
                  cursor: canIsolate ? 'pointer' : 'not-allowed',
                }}
              >
                隔离（药×{medCost}
                {!canIsolate ? ` · 差${medCost - medHave}` : ''}）
              </button>
              <button type="button" onClick={() => majorPlagueEndure()} style={dangerBtn}>
                硬扛
              </button>
            </div>
          </>
        )}

        {ev.phase === 'threat' && ev.kind === 'stray' && (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>
              流浪猫投奔
            </div>
            <div style={{ fontSize: 14, opacity: 0.92, marginBottom: 14 }}>
              {strayBreed
                ? `${strayBreed.title}「${strayBreed.name}」想留下。收留需鱼肉 ×${ev.strayCostFish}、金币 ×${ev.strayCostCoins}，加入后为散民。婉拒无惩罚。`
                : '有流浪猫想留下。婉拒无惩罚。'}
            </div>
            {acceptHint ? (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffb090',
                  marginBottom: 10,
                }}
              >
                {acceptHint}
              </div>
            ) : null}
            <Countdown remain={remain} urgent={urgent} timeoutHint="超时将自动婉拒。" />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={!canAcceptStray}
                onClick={() => majorStrayAccept()}
                style={{
                  ...softBtn,
                  opacity: canAcceptStray ? 1 : 0.45,
                  cursor: canAcceptStray ? 'pointer' : 'not-allowed',
                }}
              >
                收留
              </button>
              <button type="button" onClick={() => majorStrayReject()} style={dangerBtn}>
                婉拒
              </button>
            </div>
          </>
        )}

        {ev.phase === 'fighting' && ev.kind === 'pirate' && (
          <>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 10 }}>
              码头激战
            </div>
            <div style={{ fontSize: 15, minHeight: 28, marginBottom: 14, color: '#f0d78c' }}>
              {fightBeatAt(fightProg)}
            </div>
            <div
              style={{
                height: 14,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.12)',
                overflow: 'hidden',
                border: '1px solid #6a5040',
              }}
            >
              <div
                style={{
                  width: `${fightProg * 100}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, #a04838, #e09060)',
                  transition: 'width 0.05s linear',
                }}
              />
            </div>
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 10 }}>胜负揭晓中…</div>
          </>
        )}

        {ev.phase === 'result' && (
          <>
            {ev.autoResolved && (
              <div
                style={{
                  marginBottom: 12,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: 'rgba(180, 60, 40, 0.35)',
                  border: '1px solid #e07050',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {autoBanner}
              </div>
            )}
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.06em', marginBottom: 10 }}>
              {ev.resultTitle || '岛上大事'}
            </div>
            <div
              style={{
                fontSize: 14,
                opacity: 0.95,
                marginBottom: 20,
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
              }}
            >
              {ev.resultBody}
            </div>
            <button
              type="button"
              onClick={() => majorAck()}
              style={{
                ...btnBase,
                border: '2px solid #f0d78c',
                background: '#3d5c48',
                color: '#f5f0e6',
                padding: '10px 28px',
              }}
            >
              知道了
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Countdown({
  remain,
  urgent,
  timeoutHint,
}: {
  remain: number
  urgent: boolean
  timeoutHint: string
}) {
  return (
    <>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: urgent ? '#ffb090' : '#f0d78c',
          marginBottom: 6,
        }}
      >
        {formatRemain(remain)}
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 18 }}>
        真实时间倒计时（约 {Math.round(MAJOR_DECIDE_MS / 60000)} 分钟）。{timeoutHint}
      </div>
    </>
  )
}

const softBtn: CSSProperties = {
  ...btnBase,
  border: '2px solid #c0a060',
  background: '#4a4030',
  color: '#f5efe6',
}

const dangerBtn: CSSProperties = {
  ...btnBase,
  border: '2px solid #d06050',
  background: '#5a3030',
  color: '#ffe8e0',
}
