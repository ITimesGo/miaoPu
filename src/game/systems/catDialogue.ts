import {
  linesForSituation,
  type DialogueLine,
  type DialogueSituation,
} from '../data/catDialogue'
import type { CatRole } from '../types'

export const SPEECH_MAX_BUBBLES = 2
/** 单猫冷却（真实毫秒） */
export const SPEECH_CAT_COOLDOWN_MS = 52000
/** 全岛冷却（真实毫秒） */
export const SPEECH_ISLAND_COOLDOWN_MS = 22000
/** 气泡展示时长（真实毫秒） */
export const SPEECH_BUBBLE_MS = 5500
export const SPEECH_RECENT_ISLAND = 40
export const SPEECH_RECENT_CAT = 16

export const SPEECH_CHANCE: Record<DialogueSituation, number> = {
  morning_out: 0.28,
  rain: 0.22,
  farm_busy: 0.1,
  harvest: 0.28,
  soft_idle: 0.07,
}

export type SpeechBubble = {
  catId: string
  text: string
  lineId: string
  /** 真实时间戳（Date.now），到点移除 */
  expiresAtMs: number
}

export type SpeechStateSlice = {
  speechBubbles: SpeechBubble[]
  /** Date.now() */
  lastIslandSpeechAt: number
  /** catId → Date.now() */
  catSpeechAt: Record<string, number>
  catMorningOutDay: Record<string, number>
  recentLineIds: string[]
  catRecentLineIds: Record<string, string[]>
}

export function pruneExpiredBubbles(
  bubbles: SpeechBubble[],
  nowMs = Date.now(),
): SpeechBubble[] {
  return bubbles.filter((b) => b.expiresAtMs > nowMs)
}

export function canAttemptSpeech(
  slice: SpeechStateSlice,
  catId: string,
  nowMs = Date.now(),
): boolean {
  const bubbles = pruneExpiredBubbles(slice.speechBubbles, nowMs)
  if (bubbles.length >= SPEECH_MAX_BUBBLES) return false
  if (bubbles.some((b) => b.catId === catId)) return false
  if (nowMs - (slice.lastIslandSpeechAt || 0) < SPEECH_ISLAND_COOLDOWN_MS) return false
  if (nowMs - (slice.catSpeechAt[catId] ?? 0) < SPEECH_CAT_COOLDOWN_MS) return false
  return true
}

export function pickDialogueLine(
  situation: DialogueSituation,
  role: CatRole,
  recentIsland: string[],
  recentCat: string[],
  rng = Math.random,
): DialogueLine | null {
  const all = linesForSituation(situation, role)
  const blocked = new Set([...recentIsland, ...recentCat])
  let candidates = all.filter((l) => !blocked.has(l.id))
  if (candidates.length === 0) candidates = all
  if (candidates.length === 0) return null
  const i = Math.floor(rng() * candidates.length)
  return candidates[i] ?? null
}

export function rollSpeechChance(
  situation: DialogueSituation,
  force: boolean,
  rng = Math.random,
): boolean {
  if (force) return true
  return rng() < (SPEECH_CHANCE[situation] ?? 0.1)
}

export function nextSpeechState(
  slice: SpeechStateSlice,
  args: {
    catId: string
    situation: DialogueSituation
    role: CatRole
    force?: boolean
  },
  rng = Math.random,
): SpeechStateSlice | null {
  const nowMs = Date.now()
  const bubbles = pruneExpiredBubbles(slice.speechBubbles, nowMs)
  const working: SpeechStateSlice = { ...slice, speechBubbles: bubbles }

  if (!args.force && !canAttemptSpeech(working, args.catId, nowMs)) return null
  if (args.force) {
    while (working.speechBubbles.length >= SPEECH_MAX_BUBBLES) {
      working.speechBubbles = working.speechBubbles.slice(1)
    }
    working.speechBubbles = working.speechBubbles.filter((b) => b.catId !== args.catId)
  }

  if (!rollSpeechChance(args.situation, !!args.force, rng)) return null

  const line = pickDialogueLine(
    args.situation,
    args.role,
    working.recentLineIds,
    working.catRecentLineIds[args.catId] ?? [],
    rng,
  )
  if (!line) return null

  const bubble: SpeechBubble = {
    catId: args.catId,
    text: line.text,
    lineId: line.id,
    expiresAtMs: nowMs + SPEECH_BUBBLE_MS,
  }

  const islandRecent = [...working.recentLineIds, line.id].slice(-SPEECH_RECENT_ISLAND)
  const catRecent = [...(working.catRecentLineIds[args.catId] ?? []), line.id].slice(
    -SPEECH_RECENT_CAT,
  )

  return {
    ...working,
    speechBubbles: [...working.speechBubbles, bubble],
    lastIslandSpeechAt: nowMs,
    catSpeechAt: { ...working.catSpeechAt, [args.catId]: nowMs },
    recentLineIds: islandRecent,
    catRecentLineIds: { ...working.catRecentLineIds, [args.catId]: catRecent },
  }
}
