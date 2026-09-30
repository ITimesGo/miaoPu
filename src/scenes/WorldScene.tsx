import { ContactShadows } from '@react-three/drei'
import { GameTicker } from '../game/systems/GameTicker'
import { IsoCamera } from './shared/Camera'
import { Lights } from './shared/Lights'
import { SkyCycle } from './shared/SkyCycle'
import { Precipitation } from './shared/Precipitation'
import { Rainbow } from './shared/Rainbow'
import { CottageZone } from './zones/CottageZone'
import { FarmZone } from './zones/FarmZone'
import { HarborZone } from './zones/HarborZone'
import { NatureZone } from './zones/NatureZone'
import { ForestZone } from './zones/ForestZone'
import { PathZone } from './zones/PathZone'
import { CatActor } from './zones/CatActor'
import { IslandGround } from './zones/IslandGround'
import { GranaryZone } from './zones/GranaryZone'
import { PondZone } from './zones/PondZone'

export function WorldScene() {
  return (
    <>
      <IsoCamera />
      <Lights />
      <GameTicker />
      <IslandGround />
      <PathZone />
      <CottageZone />
      <GranaryZone />
      <PondZone />
      <FarmZone />
      <HarborZone />
      <NatureZone />
      <ForestZone />
      <CatActor />
      <ContactShadows
        frames={1}
        position={[0, 0.01, 0]}
        opacity={0.3}
        scale={36}
        blur={2}
        far={10}
        resolution={128}
      />
      <SkyCycle />
      <Precipitation />
      <Rainbow />
    </>
  )
}
