import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { EYE_HEIGHT } from '../data/base'
import { setCanvas } from '../state/pointer'
import { Base } from './Base'
import { Effects } from './Effects'
import { Lighting } from './Lighting'
import { Moonscape } from './Moonscape'
import { Player } from './Player'
import { VISUALS } from './visuals'

export function Scene() {
  return (
    <Canvas
      className="scene"
      // PCFSoftShadowMap was removed from three.js; PCFShadowMap is now the soft-filtered type.
      shadows="percentage"
      dpr={[1, VISUALS.maxPixelRatio]}
      // Anti-aliasing is done by SMAA in the post-processing chain.
      gl={{ antialias: false }}
      camera={{ fov: 72, near: 0.05, far: 1200, position: [0, EYE_HEIGHT, 0] }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = VISUALS.exposure
        gl.outputColorSpace = SRGBColorSpace
        setCanvas(gl.domElement)
      }}
    >
      <color attach="background" args={['#000000']} />
      <Lighting />
      <Moonscape />
      <Base />
      <Player />
      <Effects />
    </Canvas>
  )
}
