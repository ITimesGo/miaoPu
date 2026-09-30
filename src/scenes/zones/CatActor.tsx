import { useState, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getBreed } from '../../game/data/breeds'
import { isPrecipitating } from '../../game/data/weather'
import type { DialogueSituation } from '../../game/data/catDialogue'
import { FOREST_LAYOUT } from '../../game/data/forest'
import { pickCatTask, pruneCatClaims, releaseCatClaims, type CatTask } from '../../game/systems/catFarmAI'
import { useGameStore } from '../../game/state/gameStore'
import { CatModel, type CatMotion } from '../models/Cat'
import { CatSpeechBubble } from '../shared/CatSpeechBubble'
import { CatSickBadge } from '../shared/CatSickBadge'
import {
  POND_POS,
  cottageDoorOutside,
  cottageDoorThreshold,
  exitTurnMinute,
  sleepPosForCat,
  type CatInstance,
} from '../../game/types'

type Waypoint = { x: number; z: number }

function situationForTask(kind: CatTask['kind']): DialogueSituation | null {
  switch (kind) {
    case 'harvest':
      return 'harvest'
    case 'hoe':
    case 'plant':
    case 'water':
      return 'farm_busy'
    case 'mine':
    case 'chop':
    case 'fish':
    case 'study':
    case 'craft':
    case 'trade':
    case 'buySeed':
    case 'play':
    case 'eat':
    case 'watchFish':
    case 'wander':
      return 'soft_idle'
    default:
      return null
  }
}

function toMotion(task: CatTask, moving: boolean): CatMotion {
  if (moving) return 'walk'
  switch (task.kind) {
    case 'sleep':
      return task.behavior === 'sleep' ? 'sleep' : 'idle'
    case 'chop':
      return 'chop'
    case 'fish':
      return 'fish'
    case 'hoe':
    case 'plant':
    case 'water':
    case 'harvest':
      return 'farm'
    case 'mine':
    case 'play':
    case 'eat':
    case 'trade':
    case 'buySeed':
    case 'study':
    case 'craft':
      return 'work'
    case 'shelter':
      return 'idle'
    default:
      return 'idle'
  }
}

function dwellFor(kind: CatTask['kind'], waitingTurn: boolean): number {
  if (waitingTurn) return 0.9 + Math.random() * 0.6
  const jitter = (base: number, spread: number) => base + (Math.random() - 0.5) * 2 * spread
  switch (kind) {
    case 'sleep':
      return jitter(5.5, 1.2)
    case 'chop':
      return jitter(4.2, 0.8)
    case 'fish':
      return jitter(5.0, 1.0)
    case 'hoe':
    case 'plant':
    case 'water':
    case 'harvest':
      return jitter(1.2, 0.35)
    case 'mine':
      return jitter(1.0, 0.35)
    case 'study':
      return jitter(3.8, 0.9)
    case 'craft':
      return jitter(3.5, 0.8)
    case 'shelter':
      return jitter(2.8, 0.7)
    case 'watchFish':
      return jitter(3.6, 1.4)
    case 'wander':
      return jitter(2.8, 1.2)
    case 'waitGrow':
      return jitter(1.8, 0.7)
    case 'play':
    case 'eat':
      return jitter(2.2, 0.8)
    default:
      return jitter(0.85, 0.35)
  }
}

function performTask(current: CatTask, catId: string, g: Group) {
  const s = useGameStore.getState()
  switch (current.kind) {
    case 'hoe':
      s.catHoe(current.plotX, current.plotZ)
      break
    case 'plant':
      s.catPlant(current.plotX, current.plotZ)
      break
    case 'water':
      s.catWater(current.plotX, current.plotZ)
      break
    case 'harvest':
      s.catHarvest(current.plotX, current.plotZ)
      break
    case 'trade':
      s.catSellWheat(catId)
      break
    case 'buySeed':
      s.shopBuy('buy_seed')
      break
    case 'mine':
      s.catMine(catId)
      break
    case 'chop':
      s.catChop(catId, current.treeIndex)
      break
    case 'fish':
      s.catFish(catId)
      break
    case 'study':
      s.catStudy(catId)
      break
    case 'craft':
      s.catCraftMedicine(catId)
      break
    case 'play':
      s.catPlay()
      break
    case 'eat':
      s.catEat()
      break
    case 'watchFish': {
      const pdx = POND_POS.x - g.position.x
      const pdz = POND_POS.z - g.position.z
      if (Math.hypot(pdx, pdz) > 0.01) g.rotation.y = Math.atan2(pdx, pdz)
      break
    }
    default:
      break
  }
}

function faceWorkTarget(current: CatTask, g: Group) {
  if (current.kind === 'chop') {
    const spot = FOREST_LAYOUT[current.treeIndex]
    if (spot) {
      g.rotation.y = Math.atan2(spot.x - g.position.x, spot.z - g.position.z)
    }
  } else if (current.kind === 'fish') {
    // 面向外海（自岛心向外）
    g.rotation.y = Math.atan2(current.worldX, current.worldZ)
  }
}

/** 进出小屋：门外 → 门槛 → 床；出门反向 */
function buildDoorPath(task: CatTask, indoors: boolean): Waypoint[] {
  const dest = { x: task.worldX, z: task.worldZ }
  const doorOut = cottageDoorOutside()
  const doorThr = cottageDoorThreshold()

  if (task.kind === 'shelter' || task.kind === 'sleep') {
    if (indoors) return [dest]
    return [doorOut, doorThr, dest]
  }
  if (indoors) return [doorThr, doorOut, dest]
  return [dest]
}

function SingleCat({ cat, index }: { cat: CatInstance; index: number }) {
  const group = useRef<Group>(null)
  const task = useRef<CatTask | null>(null)
  const waypoints = useRef<Waypoint[]>([])
  const wpIndex = useRef(0)
  const indoors = useRef(false)
  const waitingTurn = useRef(false)
  const dwellUntil = useRef(0)
  const dwellLen = useRef(0.55)
  const walkSpeed = useRef(1.85)
  const actionDone = useRef(false)
  const syncedBehavior = useRef(cat.behavior)
  const placed = useRef(false)
  const [motion, setMotion] = useState<CatMotion>('idle')
  const motionRef = useRef<CatMotion>('idle')
  const lastMotion = useRef<CatMotion>('idle')
  const prevTaskKind = useRef<CatTask['kind'] | null>(null)
  const prevPrecip = useRef(false)
  const breed = getBreed(cat.breedId)

  useLayoutEffect(() => {
    const g = group.current
    if (!g || placed.current) return
    g.position.set(cat.x, 0.12, cat.z)
    placed.current = true
  }, [cat.x, cat.z])

  useFrame((state, delta) => {
    const g = group.current
    if (!g || !breed) return

    const store = useGameStore.getState()
    const now = state.clock.elapsedTime
    const minute = store.minuteOfDay
    const hour = minute / 60
    const isNight = hour < 6 || hour >= 20

    const precipitating = isPrecipitating(store.weather)
    const bedNow = sleepPosForCat(index)
    const shelteringInside =
      task.current?.kind === 'shelter' &&
      Math.hypot(task.current.worldX - bedNow.x, task.current.worldZ - bedNow.z) < 0.35
    if (
      precipitating &&
      !isNight &&
      task.current &&
      !shelteringInside &&
      !(task.current.kind === 'sleep' && indoors.current)
    ) {
      releaseCatClaims(cat.id)
      task.current = null
    }

    if (!task.current) {
      pruneCatClaims(store.cats.map((c) => c.id))
      const farmers = store.cats.filter((c) => (c.role ?? 'farmer') === 'farmer')
      const live = store.cats.find((c) => c.id === cat.id)
      const bed = sleepPosForCat(index)
      const doorOut = cottageDoorOutside()
      waitingTurn.current = false

      let nextTask: CatTask

      if (precipitating && !isNight) {
        // 雨雪停工：进屋里等，不堵在门口
        nextTask = { kind: 'shelter', worldX: bed.x, worldZ: bed.z, behavior: 'idle' }
      } else if (isNight) {
        // 谁先到谁进门，不排队
        nextTask = { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
      } else if (indoors.current && minute < exitTurnMinute(index)) {
        // 白天还没轮到出门：继续睡
        waitingTurn.current = true
        nextTask = { kind: 'sleep', worldX: bed.x, worldZ: bed.z, behavior: 'sleep' }
      } else if (
        live?.sick &&
        (live.role ?? cat.role ?? 'farmer') !== 'doctor'
      ) {
        // 生病歇工（医生除外）：回屋养病
        nextTask = { kind: 'shelter', worldX: bed.x, worldZ: bed.z, behavior: 'idle' }
      } else {
        nextTask = pickCatTask({
          minuteOfDay: minute,
          season: store.season,
          plots: store.plots,
          trees: store.trees,
          inventory: store.inventory,
          granary: store.granary,
          catId: cat.id,
          catIndex: index,
          coins: store.coins,
          role: live?.role ?? cat.role ?? 'farmer',
          farmerCount: farmers.length,
          chopsToday: live?.chopsToday ?? cat.chopsToday ?? 0,
          castsToday: live?.castsToday ?? cat.castsToday ?? 0,
          studiesToday: live?.studiesToday ?? cat.studiesToday ?? 0,
          craftsToday: live?.craftsToday ?? cat.craftsToday ?? 0,
          merchantHere: store.gameEvent?.kind === 'merchant',
        })
        if (nextTask.kind === 'sleep' && !indoors.current) {
          nextTask = {
            kind: 'wander',
            worldX: doorOut.x,
            worldZ: doorOut.z + 0.4,
            behavior: 'wander',
          }
        }
      }

      task.current = nextTask
      waypoints.current = buildDoorPath(nextTask, indoors.current)
      wpIndex.current = 0
      actionDone.current = false
      dwellUntil.current = 0
      dwellLen.current = 0.55
      walkSpeed.current = 1.55 + index * 0.06 + Math.random() * 0.55

      // 头顶闲聊：任务边沿试一次（各职业干活都能触发，不限农夫）
      {
        const wasPrecip = prevPrecip.current
        const prevKind = prevTaskKind.current
        const rainEdge =
          precipitating &&
          nextTask.kind === 'shelter' &&
          (prevKind !== 'shelter' || !wasPrecip)

        if (rainEdge) {
          store.tryCatSpeech({ catId: cat.id, situation: 'rain' })
        } else if (
          !precipitating &&
          !waitingTurn.current &&
          nextTask.kind !== 'shelter' &&
          nextTask.kind !== 'sleep'
        ) {
          const workSit = situationForTask(nextTask.kind)
          const morningPending =
            minute >= exitTurnMinute(index) && store.catMorningOutDay[cat.id] !== store.day
          // 当日首次出门只试 morning，不再同拍叠干活句，避免一早上连珠炮
          if (morningPending) {
            store.tryCatSpeech({ catId: cat.id, situation: 'morning_out' })
          } else if (workSit) {
            store.tryCatSpeech({ catId: cat.id, situation: workSit })
          }
        }
        prevTaskKind.current = nextTask.kind
      }
    }

    // 雨边沿 (b)：已在屋内时降水刚开始
    if (
      precipitating &&
      !prevPrecip.current &&
      (indoors.current || shelteringInside) &&
      task.current?.kind === 'shelter'
    ) {
      store.tryCatSpeech({ catId: cat.id, situation: 'rain' })
    }
    prevPrecip.current = precipitating

    const current = task.current
    const target = waypoints.current[wpIndex.current] ?? { x: current.worldX, z: current.worldZ }
    const dx = target.x - g.position.x
    const dz = target.z - g.position.z
    const dist = Math.hypot(dx, dz)
    const atWp = dist <= 0.11
    const lastWp = wpIndex.current >= waypoints.current.length - 1

    if (!atWp) {
      const midDoor = waypoints.current.length > 1 && !lastWp
      const base = midDoor ? 1.25 : current.kind === 'sleep' ? 1.5 : walkSpeed.current
      const speed = base
      const step = Math.min(dist, speed * delta)
      g.position.x += (dx / dist) * step
      g.position.z += (dz / dist) * step
      g.rotation.y = dampYaw(g.rotation.y, Math.atan2(dx, dz), delta)
      if (syncedBehavior.current !== 'walk') {
        syncedBehavior.current = 'walk'
        store.setCatPose(cat.id, g.position.x, g.position.z, 'walk')
      }
    } else if (!lastWp) {
      wpIndex.current += 1
    } else {
      // 最终点
      if (dwellUntil.current === 0) {
        dwellLen.current = dwellFor(current.kind, waitingTurn.current)
        dwellUntil.current = now + dwellLen.current
        syncedBehavior.current = current.behavior
        store.setCatPose(cat.id, g.position.x, g.position.z, current.behavior)
        faceWorkTarget(current, g)

        if (current.kind === 'sleep' || current.kind === 'shelter') {
          indoors.current = true
        } else {
          indoors.current = false
        }
      }

      const started = dwellUntil.current - dwellLen.current
      const progress = Math.min(1, Math.max(0, (now - started) / Math.max(0.001, dwellLen.current)))

      if (!actionDone.current && progress >= 0.2) {
        performTask(current, cat.id, g)
        actionDone.current = true
      }

      if (now >= dwellUntil.current) {
        if (!actionDone.current) {
          performTask(current, cat.id, g)
          actionDone.current = true
        }
        releaseCatClaims(cat.id)
        task.current = null
      }
    }

    g.position.y = 0.12

    const moving = !(atWp && lastWp)
    const motionNext = toMotion(current, moving)
    motionRef.current = motionNext
    if (motionNext !== lastMotion.current) {
      lastMotion.current = motionNext
      setMotion(motionNext)
    }
  })

  if (!breed) return null

  const visualRole =
    motion === 'chop' || motionRef.current === 'chop'
      ? 'lumberjack'
      : motion === 'farm'
        ? 'farmer'
        : motion === 'fish' || motionRef.current === 'fish'
          ? 'fisher'
          : (cat.role ?? 'farmer')

  return (
    <group ref={group}>
      <CatModel
        palette={breed.palette}
        animOffset={index * 1.7}
        motion={motion}
        motionRef={motionRef}
        bodyScale={breed.palette.bodyScale}
        role={visualRole}
      />
      <CatSickBadge catId={cat.id} />
      <CatSpeechBubble catId={cat.id} />
    </group>
  )
}

function dampYaw(current: number, target: number, delta: number): number {
  let diff = target - current
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  const t = 1 - Math.exp(-10 * delta)
  return current + diff * t
}

export function CatActor() {
  const cats = useGameStore((s) => s.cats)
  return (
    <>
      {cats.map((cat, i) => (
        <SingleCat key={`${cat.id}-${cat.role ?? 'farmer'}`} cat={cat} index={i} />
      ))}
    </>
  )
}
