/** 大事记类别（UI 着色） */
export type GameLogKind = 'crisis' | 'trade' | 'daily' | 'voyage' | 'major' | 'system'

export type GameLogEntry = {
  id: string
  day: number
  minuteOfDay: number
  kind: GameLogKind
  text: string
}

/** 最多保留条数（超出删最旧） */
export const GAME_LOG_LIMIT = 500

const KINDS = new Set<GameLogKind>([
  'crisis',
  'trade',
  'daily',
  'voyage',
  'major',
  'system',
])

let logSeq = 0

function nextLogId(): string {
  logSeq += 1
  return `log-${Date.now().toString(36)}-${logSeq.toString(36)}`
}

export function appendGameLog(
  log: GameLogEntry[],
  entry: {
    day: number
    minuteOfDay: number
    kind: GameLogKind
    text: string
  },
): GameLogEntry[] {
  const text = entry.text.trim()
  if (!text) return log
  const next: GameLogEntry[] = [
    ...log,
    {
      id: nextLogId(),
      day: Math.max(1, Math.floor(entry.day)),
      minuteOfDay: Math.max(0, Math.floor(entry.minuteOfDay)),
      kind: entry.kind,
      text,
    },
  ]
  if (next.length <= GAME_LOG_LIMIT) return next
  return next.slice(next.length - GAME_LOG_LIMIT)
}

export function appendGameLogs(
  log: GameLogEntry[],
  day: number,
  minuteOfDay: number,
  items: Array<{ kind: GameLogKind; text: string }>,
): GameLogEntry[] {
  let cur = log
  for (const it of items) {
    cur = appendGameLog(cur, { day, minuteOfDay, kind: it.kind, text: it.text })
  }
  return cur
}

export function sanitizeGameLog(raw: unknown): GameLogEntry[] {
  if (!Array.isArray(raw)) return []
  const out: GameLogEntry[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Partial<GameLogEntry>
    if (typeof r.text !== 'string' || !r.text.trim()) continue
    const kind = KINDS.has(r.kind as GameLogKind) ? (r.kind as GameLogKind) : 'system'
    out.push({
      id: typeof r.id === 'string' && r.id ? r.id : nextLogId(),
      day: Math.max(1, Math.floor(typeof r.day === 'number' ? r.day : 1)),
      minuteOfDay: Math.max(
        0,
        Math.floor(typeof r.minuteOfDay === 'number' ? r.minuteOfDay : 0),
      ),
      kind,
      text: r.text.trim().slice(0, 200),
    })
  }
  return out.length > GAME_LOG_LIMIT ? out.slice(out.length - GAME_LOG_LIMIT) : out
}

export function formatLogClock(minuteOfDay: number): string {
  const m = Math.floor(minuteOfDay) % (24 * 60)
  const h = Math.floor(m / 60)
  const min = Math.floor(m % 60)
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export const LOG_KIND_LABEL: Record<GameLogKind, string> = {
  crisis: '危急',
  trade: '交易',
  daily: '日结',
  voyage: '出海',
  major: '大事',
  system: '系统',
}

export const LOG_KIND_COLOR: Record<GameLogKind, string> = {
  crisis: '#ff8a70',
  trade: '#f0d78c',
  daily: '#c8dcc8',
  voyage: '#a8d4ff',
  major: '#f0a0d0',
  system: '#d0d0d0',
}

/** 病死 / 走失 / 全灭 / 海盗疫病流浪等需醒目标注 */
export function isSevereLogKind(kind: GameLogKind): boolean {
  return kind === 'crisis' || kind === 'major'
}

/** 条目标签补充（病死、海盗等） */
export function severeLogTag(entry: GameLogEntry): string | null {
  if (entry.kind === 'crisis') {
    if (entry.text.includes('离世') || entry.text.includes('因病')) return '病死'
    if (entry.text.includes('离开') || entry.text.includes('断粮') || entry.text.includes('走失'))
      return '走失'
    if (entry.text.includes('空无') || entry.text.includes('全灭')) return '全灭'
    return '危急'
  }
  if (entry.kind === 'major') {
    if (entry.text.includes('海盗')) return '海盗'
    if (entry.text.includes('疫病')) return '疫病'
    if (entry.text.includes('流浪')) return '流浪猫'
    return '大事'
  }
  return null
}
