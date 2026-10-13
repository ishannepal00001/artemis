// Every look-and-feel number worth tweaking lives here.

type Vec3 = [number, number, number]

export const VISUALS = {
  /** 'night': no Sun, Earthshine only. 'day': low Sun as the key light, Earthshine as fill. */
  timeOfDay: 'night' as 'night' | 'day',

  exposure: 0.82,
  maxPixelRatio: 2,

  /** Flat fill light. Keep it very low so shadows stay near-black. */
  ambient: 0.035,
  /** Strength of the dark environment map that metal surfaces reflect. */
  environmentIntensity: 0.1,

  sun: { intensity: 5, color: '#fff0dc', position: [95, 24, 60] as Vec3 },
  earthshine: { night: 1.5, day: 0.22, color: '#8fb2ff', position: [-120, 30, 10] as Vec3 },

  /** Shadow map of the one directional key light, and the half-width of the area it covers. */
  shadowMapSize: 2048,
  shadowExtent: 28,

  /** Multiplier on every interior ceiling fixture. */
  lampLevel: 1,
  /** Soft fill standing in for light bounced around the interior. */
  bounce: 0.28,
  /** Interior fixtures cast shadows. They are rendered once, but still cost a lookup per light. */
  interiorShadows: true,
  interiorShadowMapSize: 512,

  bloom: { strength: 0.2, radius: 0.5, threshold: 1.3 },
  ao: { radius: 0.55, intensity: 1, thickness: 1, distanceExponent: 1.4, samples: 12 },
  vignette: 0.32,
  grain: 0.03,

  dust: { count: 450, opacity: 0.35 },
  rocks: 520,
}
