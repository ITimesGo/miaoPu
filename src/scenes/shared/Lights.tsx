import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { AmbientLight, DirectionalLight, Fog, HemisphereLight } from 'three'
import { Color } from 'three'
import { useGameStore } from '../../game/state/gameStore'
import { celestialDir } from './SkyCycle'

type Pal = {
  bg: Color
  fog: Color
  sun: Color
  hemiSky: Color
  hemiGround: Color
  ambient: number
  sunIntensity: number
  hemi: number
  moon: number
  fogNear: number
  fogFar: number
}

function seasonDaySky(season: string): string {
  switch (season) {
    case 'winter':
      return '#b8cce0'
    case 'autumn':
      return '#d4c4a0'
    case 'summer':
      return '#87c8e8'
    default:
      return '#9ad0b8'
  }
}

function seasonHemiGround(season: string): string {
  switch (season) {
    case 'winter':
      return '#c8d4d0'
    case 'autumn':
      return '#6a5a38'
    case 'summer':
      return '#3a6a40'
    default:
      return '#5a8a48'
  }
}

function fillPal(
  out: Pal,
  season: string,
  kind: 'night' | 'dawn' | 'day' | 'dusk',
) {
  const ground = seasonHemiGround(season)
  switch (kind) {
    case 'dawn':
      out.bg.set('#f0a878')
      out.fog.set('#e89870')
      out.sun.set('#ffb080')
      out.hemiSky.set('#ffd0a8')
      out.hemiGround.set(ground)
      out.ambient = 0.48
      out.sunIntensity = 1.0
      out.hemi = 0.45
      out.moon = 0.08
      out.fogNear = 30
      out.fogFar = 80
      break
    case 'day':
      out.bg.set(seasonDaySky(season))
      out.fog.set(seasonDaySky(season))
      out.sun.set(season === 'winter' ? '#e8f0ff' : '#fff4d8')
      out.hemiSky.set(season === 'winter' ? '#d8e8f8' : '#e8f4ff')
      out.hemiGround.set(ground)
      out.ambient = 0.72
      out.sunIntensity = season === 'winter' ? 1.4 : 1.65
      out.hemi = 0.5
      out.moon = 0
      out.fogNear = 32
      out.fogFar = 85
      break
    case 'dusk':
      out.bg.set('#c06050')
      out.fog.set('#a85048')
      out.sun.set('#ff7040')
      out.hemiSky.set('#ff9070')
      out.hemiGround.set('#3a4048')
      out.ambient = 0.38
      out.sunIntensity = 0.9
      out.hemi = 0.35
      out.moon = 0.22
      out.fogNear = 28
      out.fogFar = 75
      break
    case 'night':
    default:
      out.bg.set('#0a1228')
      out.fog.set('#101828')
      out.sun.set('#4a5a90')
      out.hemiSky.set('#1a2848')
      out.hemiGround.set('#0c1018')
      out.ambient = 0.06
      out.sunIntensity = 0.05
      out.hemi = 0.12
      out.moon = 0.55
      out.fogNear = 28
      out.fogFar = 70
      break
  }
}

function makePal(): Pal {
  return {
    bg: new Color(),
    fog: new Color(),
    sun: new Color(),
    hemiSky: new Color(),
    hemiGround: new Color(),
    ambient: 0,
    sunIntensity: 0,
    hemi: 0,
    moon: 0,
    fogNear: 32,
    fogFar: 85,
  }
}

function lerpPal(out: Pal, a: Pal, b: Pal, t: number) {
  out.bg.lerpColors(a.bg, b.bg, t)
  out.fog.lerpColors(a.fog, b.fog, t)
  out.sun.lerpColors(a.sun, b.sun, t)
  out.hemiSky.lerpColors(a.hemiSky, b.hemiSky, t)
  out.hemiGround.lerpColors(a.hemiGround, b.hemiGround, t)
  out.ambient = a.ambient + (b.ambient - a.ambient) * t
  out.sunIntensity = a.sunIntensity + (b.sunIntensity - a.sunIntensity) * t
  out.hemi = a.hemi + (b.hemi - a.hemi) * t
  out.moon = a.moon + (b.moon - a.moon) * t
  out.fogNear = a.fogNear + (b.fogNear - a.fogNear) * t
  out.fogFar = a.fogFar + (b.fogFar - a.fogFar) * t
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** 按时辰关键帧连续混合，避免 dawn/day/dusk/night 硬切闪变 */
function samplePalette(out: Pal, a: Pal, b: Pal, minuteOfDay: number, season: string) {
  const h = ((minuteOfDay % 1440) + 1440) % 1440 / 60
  // 关键帧：夜→黎明→昼→黄昏→夜（小时）
  const keys: Array<{ h: number; kind: 'night' | 'dawn' | 'day' | 'dusk' }> = [
    { h: 0, kind: 'night' },
    { h: 4.5, kind: 'night' },
    { h: 6.2, kind: 'dawn' },
    { h: 8.0, kind: 'day' },
    { h: 16.5, kind: 'day' },
    { h: 18.2, kind: 'dusk' },
    { h: 20.5, kind: 'night' },
    { h: 24, kind: 'night' },
  ]

  let i = 0
  while (i < keys.length - 1 && h >= keys[i + 1]!.h) i++
  const k0 = keys[i]!
  const k1 = keys[i + 1]!
  fillPal(a, season, k0.kind)
  fillPal(b, season, k1.kind)
  const t = smoothstep(k0.h, k1.h, h)
  lerpPal(out, a, b, t)
}

function applyWeather(out: Pal, wet: number, snow: number) {
  if (wet <= 0.001) return
  const dim = 1 - wet * 0.42
  out.ambient *= 1 - wet * 0.28
  out.sunIntensity *= dim
  out.hemi *= 1 - wet * 0.3
  out.moon *= 1 - wet * 0.3
  out.fogNear = out.fogNear + (18 - out.fogNear) * wet
  out.fogFar = out.fogFar + (55 - out.fogFar) * wet

  _tmpA.set('#6e8498').lerp(_tmpB.set('#8ea0b4'), snow)
  out.bg.lerp(_tmpA, wet * 0.85)
  _tmpA.set('#7a90a4').lerp(_tmpB.set('#a8b8c8'), snow)
  out.fog.lerp(_tmpA, wet * 0.85)
  out.sun.lerp(_tmpA.set('#c5d0dc'), wet * 0.7)
  out.hemiSky.lerp(_tmpA.set('#9aa8b8'), wet * 0.65)
}

const lightDist = 40
const _tmpA = new Color()
const _tmpB = new Color()

function mixToward(cur: Pal, target: Pal, alpha: number) {
  cur.bg.lerp(target.bg, alpha)
  cur.fog.lerp(target.fog, alpha)
  cur.sun.lerp(target.sun, alpha)
  cur.hemiSky.lerp(target.hemiSky, alpha)
  cur.hemiGround.lerp(target.hemiGround, alpha)
  cur.ambient += (target.ambient - cur.ambient) * alpha
  cur.sunIntensity += (target.sunIntensity - cur.sunIntensity) * alpha
  cur.hemi += (target.hemi - cur.hemi) * alpha
  cur.moon += (target.moon - cur.moon) * alpha
  cur.fogNear += (target.fogNear - cur.fogNear) * alpha
  cur.fogFar += (target.fogFar - cur.fogFar) * alpha
}

/** Imperative light/sky updates — continuous blends, no period flash. */
export function Lights() {
  const season = useGameStore((s) => s.season)
  const ambientRef = useRef<AmbientLight>(null)
  const hemiRef = useRef<HemisphereLight>(null)
  const sunRef = useRef<DirectionalLight>(null)
  const moonRef = useRef<DirectionalLight>(null)

  const scratchA = useMemo(() => makePal(), [])
  const scratchB = useMemo(() => makePal(), [])
  const target = useMemo(() => makePal(), [])
  const current = useMemo(() => {
    const p = makePal()
    const m = useGameStore.getState().minuteOfDay
    samplePalette(p, scratchA, scratchB, m, season)
    return p
  }, [scratchA, scratchB, season])
  const wetSmooth = useRef(0)
  const snowSmooth = useRef(0)
  const booted = useRef(false)

  useFrame(({ scene }, delta) => {
    const { minuteOfDay, season: s, weather } = useGameStore.getState()
    samplePalette(target, scratchA, scratchB, minuteOfDay, s)

    const wantWet = weather === 'rain' || weather === 'snow' ? 1 : 0
    const wantSnow = weather === 'snow' ? 1 : 0
    const wAlpha = 1 - Math.exp(-delta * 1.6)
    wetSmooth.current += (wantWet - wetSmooth.current) * wAlpha
    snowSmooth.current += (wantSnow - snowSmooth.current) * wAlpha
    applyWeather(target, wetSmooth.current, snowSmooth.current)

    // 跟随时辰连续目标；略作平滑，吞掉季节/天气跳变
    const alpha = booted.current ? 1 - Math.exp(-delta * 5) : 1
    booted.current = true
    mixToward(current, target, alpha)

    const sun = celestialDir(minuteOfDay, 0)
    const moon = celestialDir(minuteOfDay, Math.PI)
    const pal = current

    if (sunRef.current) {
      sunRef.current.position.set(
        sun.x * lightDist,
        Math.max(4, sun.y * lightDist),
        sun.z * lightDist,
      )
      sunRef.current.intensity = pal.sunIntensity
      sunRef.current.color.copy(pal.sun)
    }
    if (moonRef.current) {
      moonRef.current.position.set(
        moon.x * lightDist,
        Math.max(4, moon.y * lightDist),
        moon.z * lightDist,
      )
      moonRef.current.intensity = pal.moon
      moonRef.current.visible = pal.moon > 0.02
    }
    if (ambientRef.current) ambientRef.current.intensity = pal.ambient
    if (hemiRef.current) {
      hemiRef.current.intensity = pal.hemi
      hemiRef.current.color.copy(pal.hemiSky)
      hemiRef.current.groundColor.copy(pal.hemiGround)
    }

    scene.background = pal.bg
    const fog = scene.fog as Fog | null
    if (fog) {
      fog.color.copy(pal.fog)
      fog.near = pal.fogNear
      fog.far = pal.fogFar
    }
  })

  return (
    <>
      <color attach="background" args={[current.bg.getStyle()]} />
      <fog attach="fog" args={[current.fog.getStyle(), current.fogNear, current.fogFar]} />
      <ambientLight ref={ambientRef} intensity={current.ambient} />
      <hemisphereLight
        ref={hemiRef}
        args={[current.hemiSky.getStyle(), current.hemiGround.getStyle(), current.hemi]}
      />
      <directionalLight
        ref={sunRef}
        castShadow
        color={current.sun.getStyle()}
        intensity={current.sunIntensity}
        position={[20, 30, 10]}
        shadow-mapSize={[256, 256]}
      />
      <directionalLight ref={moonRef} color="#a8c0ff" intensity={0} position={[-20, 20, -10]} />
    </>
  )
}
