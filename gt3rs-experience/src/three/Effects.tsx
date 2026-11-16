import { forwardRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette, SMAA } from '@react-three/postprocessing'
import { BlendFunction, Effect, EffectAttribute, ToneMappingMode } from 'postprocessing'
import { Uniform, Vector2 } from 'three'
import { damp } from 'maath/easing'
import { shotAt } from '../scroll/scroll'
import { frame, useStore } from '../store'

// ---------------------------------------------------------------------------
// Effet maison (skill add-postprocessing, étape 5) : flou radial de vitesse +
// séparation chromatique proportionnels à la vitesse simulée et à la vélocité
// du scroll. Les bords s'étirent, le centre (la voiture) reste net.
// ---------------------------------------------------------------------------
const speedFrag = /* glsl */ `
uniform float uStrength;
uniform vec2 uCenter;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 dir = uv - uCenter;
  float d = length(dir);
  float amt = uStrength * smoothstep(0.12, 0.85, d);
  if (amt < 0.001) { outputColor = inputColor; return; }
  vec3 acc = vec3(0.0);
  const int N = 12;
  for (int i = 0; i < N; i++) {
    float t = float(i) / float(N - 1);
    vec2 o = dir * amt * 0.11 * t;
    acc.r += texture2D(inputBuffer, uv - o * 1.18).r;
    acc.g += texture2D(inputBuffer, uv - o).g;
    acc.b += texture2D(inputBuffer, uv - o * 0.82).b;
  }
  outputColor = vec4(acc / float(N), inputColor.a);
}`

class SpeedEffectImpl extends Effect {
  constructor() {
    super('SpeedEffect', speedFrag, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uStrength', new Uniform(0)],
        ['uCenter', new Uniform(new Vector2(0.5, 0.52))],
      ]),
    })
  }
}

const SpeedEffect = forwardRef<SpeedEffectImpl>(function SpeedEffect(_, ref) {
  const effect = useMemo(() => new SpeedEffectImpl(), [])
  useFrame((_, dt) => {
    const shot = shotAt(frame.scrollY)
    const u = effect.uniforms.get('uStrength')!
    const scrollKick = Math.min(1, Math.abs(frame.velocity) / 90) * 0.35
    const intro = frame.intro > 0 && frame.intro < 0.75 ? (0.75 - frame.intro) * 0.9 : 0
    damp(u, 'value', shot.speed * 0.85 + scrollKick + intro, 0.18, dt)
  })
  return <primitive ref={ref} object={effect} dispose={null} />
})

export function Effects() {
  const quality = useStore((s) => s.quality)
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <SpeedEffect />
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1.05} luminanceSmoothing={0.15} radius={0.7} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.28} darkness={0.72} eskil={false} />
      <Noise opacity={0.045} premultiply blendFunction={BlendFunction.SCREEN} />
      {quality === 'high' ? <SMAA /> : <></>}
    </EffectComposer>
  )
}
