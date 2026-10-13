import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2 } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { VISUALS } from './visuals'

/** Vignette and film grain, applied last on the finished image. */
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignette: { value: VISUALS.vignette },
    grain: { value: VISUALS.grain },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float vignette;
    uniform float grain;
    varying vec2 vUv;

    float hash(vec2 p) {
      vec3 q = fract(vec3(p.xyx) * 0.1031);
      q += dot(q, q.yzx + 33.33);
      return fract((q.x + q.y) * q.z);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, d);
      float n = hash(gl_FragCoord.xy + fract(time) * 917.0) - 0.5;
      color.rgb += n * grain;
      gl_FragColor = color;
    }
  `,
}

/**
 * Post-processing chain: ambient occlusion, bloom on the emissive lights,
 * tone mapping, anti-aliasing, then vignette and grain.
 */
export function Effects() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)

  const { composer, finish } = useMemo(() => {
    const composer = new EffectComposer(gl)
    composer.addPass(new RenderPass(scene, camera))

    const ao = new GTAOPass(scene, camera)
    ao.blendIntensity = VISUALS.ao.intensity
    ao.updateGtaoMaterial({
      radius: VISUALS.ao.radius,
      thickness: VISUALS.ao.thickness,
      distanceExponent: VISUALS.ao.distanceExponent,
      samples: VISUALS.ao.samples,
    })
    composer.addPass(ao)

    // The image is still linear HDR here, so a threshold above 1 picks out only emissive surfaces.
    const { strength, radius, threshold } = VISUALS.bloom
    composer.addPass(new UnrealBloomPass(new Vector2(256, 256), strength, radius, threshold))

    composer.addPass(new OutputPass())
    composer.addPass(new SMAAPass())

    const finish = new ShaderPass(FinishShader)
    composer.addPass(finish)

    return { composer, finish }
  }, [gl, scene, camera])

  useEffect(() => {
    composer.setPixelRatio(dpr)
    composer.setSize(size.width, size.height)
  }, [composer, size, dpr])

  useEffect(() => () => composer.dispose(), [composer])

  // A positive priority takes over rendering from react-three-fiber.
  useFrame((_, dt) => {
    finish.uniforms.time.value += dt
    composer.render(dt)
  }, 1)

  return null
}
