import { AdaptiveDpr, AdaptiveEvents } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { WorldScene } from './scenes/WorldScene'
import { DevToolbar } from './ui/DevToolbar'
import { Hud } from './ui/Hud'
import { ManualPanel } from './ui/ManualPanel'
import { LogPanel } from './ui/LogPanel'
import { MajorEventPanel } from './ui/MajorEventPanel'
import { RestartDock } from './ui/RestartDock'

export default function App() {
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.25]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#1a2f28')
        }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <WorldScene />
      </Canvas>
      <Hud />
      <MajorEventPanel />
      <ManualPanel />
      <LogPanel />
      <RestartDock />
      {import.meta.env.DEV && <DevToolbar />}
    </>
  )
}
