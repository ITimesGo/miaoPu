import { useState, type CSSProperties } from 'react'
import { TREE_REGROW_DAYS, treeRegrowDays } from '../game/data/forest'
import { absoluteGameMinute, weatherLabel } from '../game/data/weather'
import { eventLabel, MINUTES_PER_YEAR } from '../game/data/events'
import { useGameStore } from '../game/state/gameStore'
import {
  BOAT_MAX_LEVEL,
  CHOP_DAILY_LIMIT,
  CHOP_SLOT_MINUTES,
  COTTAGE_MAX_LEVEL,
  FISH_DAILY_LIMIT,
  GRANARY_MAX_LEVEL,
  HARBOR_MAX_LEVEL,
  MINUTES_PER_DAY,
  ROLE_MAX_LEVEL,
  STUDY_DAILY_LIMIT,
  CRAFT_DAILY_LIMIT,
  catCapForCottage,
  type Season,
} from '../game/types'

const SEASONS: Array<{ id: Season; label: string }> = [
  { id: 'spring', label: '春' },
  { id: 'summer', label: '夏' },
  { id: 'autumn', label: '秋' },
  { id: 'winter', label: '冬' },
]

const panel: CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 300,
  zIndex: 40,
  pointerEvents: 'auto',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
  color: '#e8ffe8',
}

const box: CSSProperties = {
  width: 280,
  maxHeight: '78vh',
  overflowY: 'auto',
  padding: 12,
  borderRadius: 10,
  background: 'rgba(8, 28, 16, 0.92)',
  border: '1px solid #3d8f5a',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
}

const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 8,
}

const input: CSSProperties = {
  width: 88,
  padding: '4px 6px',
  borderRadius: 6,
  border: '1px solid #3a6350',
  background: '#0f2418',
  color: '#e8ffe8',
}

const btn: CSSProperties = {
  padding: '5px 8px',
  borderRadius: 6,
  border: '1px solid #3d8f5a',
  background: '#163525',
  color: '#e8ffe8',
  cursor: 'pointer',
  fontSize: 11,
}

const label: CSSProperties = { opacity: 0.85, flexShrink: 0 }

function NumField({
  name,
  value,
  onCommit,
  step = 1,
  min = 0,
  max,
}: {
  name: string
  value: number
  onCommit: (n: number) => void
  step?: number
  min?: number
  max?: number
}) {
  return (
    <div style={row}>
      <span style={label}>{name}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        style={input}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onCommit(n)
        }}
      />
    </div>
  )
}

/** 仅开发环境挂载：调季节 / 时间 / 资源等 */
export function DevToolbar() {
  const [open, setOpen] = useState(true)
  const day = useGameStore((s) => s.day)
  const season = useGameStore((s) => s.season)
  const minuteOfDay = useGameStore((s) => Math.floor(s.minuteOfDay))
  const timeScale = useGameStore((s) => s.timeScale)
  const coins = useGameStore((s) => s.coins)
  const inventory = useGameStore((s) => s.inventory)
  const granary = useGameStore((s) => s.granary)
  const harbor = useGameStore((s) => s.harbor)
  const boat = useGameStore((s) => s.boat)
  const cottage = useGameStore((s) => s.cottage)
  const cats = useGameStore((s) => s.cats)
  const trees = useGameStore((s) => s.trees)
  const cloudCount = useGameStore((s) => s.cloudCount)
  const cloudSpeed = useGameStore((s) => s.cloudSpeed)
  const weather = useGameStore((s) => s.weather)
  const nextWeatherAt = useGameStore((s) => s.nextWeatherAt)
  const weatherUntil = useGameStore((s) => s.weatherUntil)
  const rainbowUntil = useGameStore((s) => s.rainbowUntil)
  const gameEvent = useGameStore((s) => s.gameEvent)
  const celestialSize = useGameStore((s) => s.celestialSize)
  const skyOrbit = useGameStore((s) => s.skyOrbit)
  const devSet = useGameStore((s) => s.devSet)

  const hour = Math.floor(minuteOfDay / 60)
  const minute = Math.floor(minuteOfDay % 60)

  return (
    <div style={panel}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...btn,
          marginBottom: open ? 8 : 0,
          borderColor: '#c9a227',
          background: '#2a3a18',
          fontWeight: 700,
        }}
      >
        {open ? '▾ 开发者工具' : '▸ 开发者工具'}
      </button>

      {open && (
        <div className="miaopu-scroll" style={box}>
          <div style={{ marginBottom: 10, color: '#c9a227', fontWeight: 700 }}>DEV ONLY · Vite</div>

          <div style={row}>
            <span style={label}>季节</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {SEASONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  style={{
                    ...btn,
                    background: season === s.id ? '#2f6b40' : btn.background,
                    borderColor: season === s.id ? '#c9a227' : btn.borderColor,
                  }}
                  onClick={() => devSet({ season: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <NumField name="天数" value={day} min={1} onCommit={(n) => devSet({ day: n })} />

          <div style={row}>
            <span style={label}>时刻</span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="number"
                min={0}
                max={23}
                value={hour}
                style={{ ...input, width: 48 }}
                onChange={(e) => {
                  const h = Math.max(0, Math.min(23, Number(e.target.value) || 0))
                  devSet({ minuteOfDay: h * 60 + minute })
                }}
              />
              <span>:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={minute}
                style={{ ...input, width: 48 }}
                onChange={(e) => {
                  const m = Math.max(0, Math.min(59, Number(e.target.value) || 0))
                  devSet({ minuteOfDay: hour * 60 + m })
                }}
              />
            </div>
          </div>

          <div style={row}>
            <span style={label}>时辰快跳</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                [6, '清晨'],
                [8, '上午'],
                [12, '正午'],
                [18, '黄昏'],
                [21, '夜晚'],
              ].map(([h, name]) => (
                <button key={String(name)} type="button" style={btn} onClick={() => devSet({ minuteOfDay: Number(h) * 60 })}>
                  {name}
                </button>
              ))}
            </div>
          </div>

          <NumField
            name="流速"
            value={timeScale}
            step={0.5}
            min={0}
            onCommit={(n) => devSet({ timeScale: n })}
          />
          <div style={{ ...row, justifyContent: 'flex-start', gap: 4 }}>
            {[0, 1, 2, 4, 8].map((v) => (
              <button key={v} type="button" style={btn} onClick={() => devSet({ timeScale: v })}>
                {v === 0 ? '暂停' : `×${v}`}
              </button>
            ))}
          </div>

          <hr style={{ border: 0, borderTop: '1px solid #2a4a38', margin: '10px 0' }} />

          <div style={{ marginBottom: 6, color: '#9ad0b8', fontWeight: 700 }}>天气</div>
          <div style={{ marginBottom: 6, opacity: 0.85 }}>
            现在 {weatherLabel(weather)}
            {weather === 'clear'
              ? ` · 下一场约 ${Math.max(0, Math.round((nextWeatherAt - absoluteGameMinute(day, minuteOfDay)) / 60))} 小时后`
              : ` · 还约 ${Math.max(0, Math.round((weatherUntil - absoluteGameMinute(day, minuteOfDay)) / 60))} 小时`}
          </div>
          <div style={{ ...row, justifyContent: 'flex-start', gap: 4, flexWrap: 'wrap' }}>
            <button type="button" style={btn} onClick={() => devSet({ forcePrecip: true })}>
              {season === 'winter' ? '立刻下雪' : '立刻下雨'}
            </button>
            <button type="button" style={btn} onClick={() => devSet({ clearWeather: true })}>
              立刻放晴
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceRainbow: true })}>
              立刻彩虹
            </button>
            <button type="button" style={btn} onClick={() => devSet({ clearRainbow: true })}>
              清彩虹
            </button>
          </div>
          <div style={{ marginTop: 6, opacity: 0.8, fontSize: 11 }}>
            彩虹：
            {rainbowUntil > absoluteGameMinute(day, minuteOfDay)
              ? `有 · 还约 ${Math.max(0, Math.round((rainbowUntil - absoluteGameMinute(day, minuteOfDay)) / 60))} 小时`
              : '无 · 雨停后约 40% 白天出现'}
          </div>
          <div style={{ ...row, justifyContent: 'flex-start', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            <button type="button" style={btn} onClick={() => devSet({ forceEvent: 'merchant' })}>
              商船停靠
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceEvent: 'bountiful' })}>
              丰收日
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceEvent: 'lean' })}>
              欠收日
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceEvent: 'none' })}>
              清事件
            </button>
          </div>
          <div style={{ ...row, justifyContent: 'flex-start', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            <button type="button" style={btn} onClick={() => devSet({ forceVoyage: true })}>
              货船出海
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceVoyageReturn: true })}>
              货船回港
            </button>
            <button type="button" style={btn} onClick={() => devSet({ rerollGoal: true })}>
              重抽目标
            </button>
            <button type="button" style={btn} onClick={() => devSet({ completeGoal: true })}>
              完成目标
            </button>
            <button type="button" style={btn} onClick={() => devSet({ clearGoalHistory: true })}>
              清空目标历史
            </button>
          </div>
          <div style={{ marginTop: 6, opacity: 0.8, fontSize: 11 }}>
            偶发：{eventLabel(gameEvent.kind)}
            {gameEvent.kind !== 'none'
              ? ` · 还约 ${Math.max(0, Math.round((gameEvent.until - absoluteGameMinute(day, minuteOfDay)) / 60))} 时`
              : (() => {
                  const mins = Math.max(0, gameEvent.nextAt - absoluteGameMinute(day, minuteOfDay))
                  const years = mins / MINUTES_PER_YEAR
                  return ` · 下一场约 ${years < 0.15 ? `${Math.round(mins / MINUTES_PER_DAY)} 天后` : `${years.toFixed(1)} 年后`}`
                })()}
            <br />
            间隔按年抽：年内多件 / 一年一件 / 几年一件
          </div>

          <div style={{ marginBottom: 6, marginTop: 10, color: '#9ad0b8', fontWeight: 700 }}>天空</div>
          <NumField
            name="白云数量"
            value={cloudCount}
            min={0}
            max={16}
            onCommit={(n) => devSet({ cloudCount: n })}
          />
          <NumField
            name="云速"
            value={cloudSpeed}
            step={0.1}
            min={0}
            max={4}
            onCommit={(n) => devSet({ cloudSpeed: n })}
          />
          <NumField
            name="日月大小"
            value={celestialSize}
            step={0.1}
            min={0.4}
            max={2.5}
            onCommit={(n) => devSet({ celestialSize: n })}
          />
          <NumField
            name="背景远近"
            value={skyOrbit}
            step={1}
            min={28}
            max={90}
            onCommit={(n) => devSet({ skyOrbit: n })}
          />

          <hr style={{ border: 0, borderTop: '1px solid #2a4a38', margin: '10px 0' }} />

          <NumField name="金币" value={coins} step={10} onCommit={(n) => devSet({ coins: n })} />
          <NumField name="矿石" value={inventory.ore ?? 0} step={1} onCommit={(n) => devSet({ ore: n })} />
          <NumField name="木材" value={inventory.wood ?? 0} step={1} onCommit={(n) => devSet({ wood: n })} />
          <NumField name="鱼肉" value={inventory.fish ?? 0} step={1} onCommit={(n) => devSet({ fish: n })} />
          <NumField
            name="知识"
            value={inventory.knowledge ?? 0}
            step={1}
            onCommit={(n) => devSet({ knowledge: n })}
          />
          <NumField
            name="药品"
            value={inventory.medicine ?? 0}
            step={1}
            onCommit={(n) => devSet({ medicine: n })}
          />
          <NumField name="小麦" value={inventory.wheat ?? 0} step={1} onCommit={(n) => devSet({ wheat: n })} />
          <NumField name="麦种" value={inventory.wheat_seed ?? 0} step={1} onCommit={(n) => devSet({ wheat_seed: n })} />
          <NumField name="玩具" value={inventory.toy ?? 0} step={1} onCommit={(n) => devSet({ toy: n })} />
          <NumField name="零食" value={inventory.snack ?? 0} step={1} onCommit={(n) => devSet({ snack: n })} />

          <div style={{ ...row, justifyContent: 'flex-start', gap: 4, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={btn}
              onClick={() =>
                devSet({ coins: 9999, ore: 30, wood: 12, fish: 20, knowledge: 30, medicine: 20 })
              }
            >
              富豪包
            </button>
            <button
              type="button"
              style={btn}
              onClick={() =>
                devSet({ coins: 0, ore: 0, wood: 0, wheat: 0, fish: 0, knowledge: 0, medicine: 0 })
              }
            >
              清空经济
            </button>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid #2a4a38', margin: '10px 0' }} />

          <NumField
            name="粮仓等级"
            value={granary.level}
            min={0}
            max={GRANARY_MAX_LEVEL}
            onCommit={(n) => devSet({ granaryLevel: n })}
          />
          <NumField
            name="粮仓完好"
            value={granary.condition}
            min={0}
            max={100}
            onCommit={(n) => devSet({ granaryCondition: n })}
          />
          <NumField
            name="小屋等级"
            value={cottage.level}
            min={1}
            max={COTTAGE_MAX_LEVEL}
            onCommit={(n) => devSet({ cottageLevel: n })}
          />
          <NumField
            name="港口等级"
            value={harbor.level}
            min={1}
            max={HARBOR_MAX_LEVEL}
            onCommit={(n) => devSet({ harborLevel: n })}
          />
          <NumField
            name="船等级"
            value={boat.level}
            min={1}
            max={BOAT_MAX_LEVEL}
            onCommit={(n) => devSet({ boatLevel: n })}
          />
          <NumField
            name="职业等级"
            value={Math.max(1, ...cats.map((c) => c.roleLevel ?? 1))}
            min={1}
            max={ROLE_MAX_LEVEL}
            onCommit={(n) => devSet({ allRoleLevel: n })}
          />

          <hr style={{ border: 0, borderTop: '1px solid #2a4a38', margin: '10px 0' }} />

          <div style={{ ...row, justifyContent: 'flex-start', gap: 4, flexWrap: 'wrap' }}>
            <button type="button" style={btn} onClick={() => devSet({ matureAllCrops: true })}>
              麦子全熟
            </button>
            <button type="button" style={btn} onClick={() => devSet({ clearFarm: true })}>
              清空农田
            </button>
            <button type="button" style={btn} onClick={() => devSet({ matureAllTrees: true })}>
              树木全熟
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceChopOne: true })}>
              砍一棵成桩
            </button>
            <button type="button" style={btn} onClick={() => devSet({ clearForest: true })}>
              全砍成桩
            </button>
          </div>

          <div style={{ ...row, justifyContent: 'flex-start', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
            <button type="button" style={btn} onClick={() => devSet({ ensureMiner: true })}>
              补一名矿工
            </button>
            <button type="button" style={btn} onClick={() => devSet({ ensureLumberjack: true })}>
              补一名伐木工
            </button>
            <button type="button" style={btn} onClick={() => devSet({ ensureFisher: true })}>
              补一名渔夫
            </button>
            <button type="button" style={btn} onClick={() => devSet({ ensureScholar: true })}>
              补一名学者
            </button>
            <button type="button" style={btn} onClick={() => devSet({ ensureSailor: true })}>
              补一名船商
            </button>
            <button type="button" style={btn} onClick={() => devSet({ ensureDoctor: true })}>
              补一名医生
            </button>
            <button type="button" style={btn} onClick={() => devSet({ ensureFarmer: true })}>
              保一名农夫
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceSickOne: true })}>
              随机生病
            </button>
            <button type="button" style={btn} onClick={() => devSet({ cureAll: true })}>
              全部治愈
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceDeathSick: true })}>
              病猫死亡
            </button>
            <button type="button" style={btn} onClick={() => devSet({ clearSpeechCooldown: true })}>
              清闲聊冷却
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceSpeechSituation: 'morning_out' })}>
              聊·出门
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceSpeechSituation: 'rain' })}>
              聊·雨
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceSpeechSituation: 'harvest' })}>
              聊·收获
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceSpeechSituation: 'farm_busy' })}>
              聊·农忙
            </button>
            <button type="button" style={btn} onClick={() => devSet({ forceSpeechSituation: 'soft_idle' })}>
              聊·闲逛
            </button>
            <button type="button" style={btn} onClick={() => useGameStore.getState().restartGame()}>
              重开一局
            </button>
            <button type="button" style={btn} onClick={() => devSet({ allCatsRole: 'miner' })}>
              全员矿工
            </button>
            <button type="button" style={btn} onClick={() => devSet({ allCatsRole: 'lumberjack' })}>
              全员伐木
            </button>
            <button type="button" style={btn} onClick={() => devSet({ allCatsRole: 'fisher' })}>
              全员渔夫
            </button>
            <button type="button" style={btn} onClick={() => devSet({ allCatsRole: 'scholar' })}>
              全员学者
            </button>
            <button type="button" style={btn} onClick={() => devSet({ allCatsRole: 'sailor' })}>
              全员船商
            </button>
            <button type="button" style={btn} onClick={() => devSet({ allCatsRole: 'doctor' })}>
              全员医生
            </button>
            <button type="button" style={btn} onClick={() => devSet({ allCatsRole: 'farmer' })}>
              全员农夫
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 11, lineHeight: 1.4 }}>
            猫 {cats.length}/{catCapForCottage(cottage.level)}（农{' '}
            {cats.filter((c) => (c.role ?? 'farmer') === 'farmer').length} / 矿{' '}
            {cats.filter((c) => c.role === 'miner').length} / 伐{' '}
            {cats.filter((c) => c.role === 'lumberjack').length} / 渔{' '}
            {cats.filter((c) => c.role === 'fisher').length} / 学{' '}
            {cats.filter((c) => c.role === 'scholar').length} / 船{' '}
            {cats.filter((c) => c.role === 'sailor').length} / 医{' '}
            {cats.filter((c) => c.role === 'doctor').length}）
            <br />
            今日伐木{' '}
            {cats
              .filter((c) => c.role === 'lumberjack')
              .map((c) => `${c.chopsToday ?? 0}/${CHOP_DAILY_LIMIT}`)
              .join(' · ') || `0/${CHOP_DAILY_LIMIT}`}{' '}
            · 间隔约 {Math.round(CHOP_SLOT_MINUTES / 60)} 时
            <br />
            今日钓鱼{' '}
            {cats
              .filter((c) => c.role === 'fisher')
              .map((c) => `${c.castsToday ?? 0}/${FISH_DAILY_LIMIT}`)
              .join(' · ') || `0/${FISH_DAILY_LIMIT}`}
            <br />
            今日研读{' '}
            {cats
              .filter((c) => c.role === 'scholar')
              .map((c) => `${c.studiesToday ?? 0}/${STUDY_DAILY_LIMIT}`)
              .join(' · ') || `0/${STUDY_DAILY_LIMIT}`}
            <br />
            今日炼药{' '}
            {cats
              .filter((c) => c.role === 'doctor')
              .map((c) => `${c.craftsToday ?? 0}/${CRAFT_DAILY_LIMIT}`)
              .join(' · ') || `0/${CRAFT_DAILY_LIMIT}`}
            <br />
            日结：吃鱼 → 药品治病；病猫无药翌日离世（药不当饭）
            <br />
            矿工/船商更易生病；麦种告罄与断粮有低概率减员
            <br />
            生病 {cats.filter((c) => c.sick).length}/{cats.length}
            <br />
            成材树 {trees.filter((t) => t.stage >= 3).length}/{trees.length} · 再生{' '}
            {treeRegrowDays(season) == null
              ? '冬天停长'
              : `约 ${treeRegrowDays(season)} 日（春${TREE_REGROW_DAYS.spring}/夏${TREE_REGROW_DAYS.summer}/秋${TREE_REGROW_DAYS.autumn}）`}
            <br />
            一天 {MINUTES_PER_DAY} 游戏分钟 · 生产构建不打包此面板
          </div>
        </div>
      )}
    </div>
  )
}
