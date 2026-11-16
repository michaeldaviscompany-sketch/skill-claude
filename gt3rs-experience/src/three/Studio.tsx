import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, MeshReflectorMaterial } from '@react-three/drei'
import { AdditiveBlending, BackSide, Color, DoubleSide, Mesh, MeshBasicMaterial, ShaderMaterial } from 'three'
import { damp } from 'maath/easing'
import { shotAt } from '../scroll/scroll'
import { frame, useStore } from '../store'

// ---------------------------------------------------------------------------
// Studio dynamique : les reflets de la carrosserie viennent d'un environnement
// construit en temps réel (softbox, bandes, contre-jours) dont l'intensité suit
// la chorégraphie. Rien n'est « peint » : c'est de l'éclairage par l'image (IBL).
// ---------------------------------------------------------------------------
type Panel = { pos: [number, number, number]; rot: [number, number, number]; scale: [number, number, number]; color: string; role: 'studio' | 'rim' | 'red' | 'sweep' }

const PANELS: Panel[] = [
  // Plafond : trois longues bandes (le « strip light » de la photo automobile)
  { pos: [0, 6, 0], rot: [Math.PI / 2, 0, 0], scale: [1.4, 12, 1], color: '#ffffff', role: 'studio' },
  { pos: [-2.4, 5.6, 0], rot: [Math.PI / 2, 0.25, 0], scale: [0.6, 12, 1], color: '#ffffff', role: 'studio' },
  { pos: [2.4, 5.6, 0], rot: [Math.PI / 2, -0.25, 0], scale: [0.6, 12, 1], color: '#ffffff', role: 'studio' },
  // Grandes softbox latérales
  { pos: [-9, 2.2, 1], rot: [0, Math.PI / 2, 0], scale: [8, 2.6, 1], color: '#f4f6ff', role: 'studio' },
  { pos: [9, 2.6, -1], rot: [0, -Math.PI / 2, 0], scale: [8, 1.4, 1], color: '#ffffff', role: 'studio' },
  // Contre-jours
  { pos: [0, 2.5, -10], rot: [0, 0, 0], scale: [10, 0.35, 1], color: '#ffffff', role: 'rim' },
  { pos: [0, 0.6, 10], rot: [0, Math.PI, 0], scale: [12, 0.18, 1], color: '#ffffff', role: 'rim' },
  // Accent rouge (sol / arrière)
  { pos: [-7, 0.4, -6], rot: [0, Math.PI / 4, 0], scale: [6, 0.5, 1], color: '#ff1a1a', role: 'red' },
  // Bande de balayage (animée)
  { pos: [0, 3.5, 0], rot: [0, Math.PI / 2, 0], scale: [0.25, 7, 1], color: '#ffffff', role: 'sweep' },
]

function StudioPanels() {
  const refs = useRef<(Mesh | null)[]>([])
  const levels = useRef({ studio: 0, rim: 0, red: 0 })
  const base = useMemo(() => PANELS.map((p) => new Color(p.color)), [])

  useFrame((state, dt) => {
    const shot = shotAt(frame.scrollY)
    const intro = frame.intro
    const L = levels.current
    damp(L, 'studio', shot.studio * Math.min(1, intro * 1.4), 0.25, dt)
    damp(L, 'rim', shot.rim, 0.3, dt)
    damp(L, 'red', shot.red, 0.3, dt)
    const t = state.clock.elapsedTime
    PANELS.forEach((p, i) => {
      const m = refs.current[i]
      if (!m) return
      const mat = m.material as MeshBasicMaterial
      let k = 0
      if (p.role === 'studio') k = L.studio * (i === 0 ? 3.2 : 2.2)
      if (p.role === 'rim') k = L.rim * 4
      if (p.role === 'red') k = L.red * 6
      if (p.role === 'sweep') {
        // Une bande lumineuse traverse la carrosserie : révèle les volumes.
        const sweep = ((t * 0.12) % 1) * 2 - 1
        m.position.z = sweep * 9
        k = (0.6 + L.rim * 2.5) * (1 - Math.abs(sweep)) * 3
      }
      mat.color.copy(base[i]).multiplyScalar(k)
    })
  })

  return (
    <>
      {PANELS.map((p, i) => (
        <mesh key={i} ref={(m) => (refs.current[i] = m)} position={p.pos} rotation={p.rot} scale={p.scale}>
          <planeGeometry />
          <meshBasicMaterial color={p.color} side={DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

export function StudioEnvironment() {
  const quality = useStore((s) => s.quality)
  return (
    <Environment resolution={quality === 'high' ? 256 : 128} frames={Infinity} background={false}>
      <color attach="background" args={['#030304']} />
      <StudioPanels />
    </Environment>
  )
}

// ---------------------------------------------------------------------------
// Cyclorama : fond infini dégradé + grain de lumière (GLSL), réagit au studio.
// ---------------------------------------------------------------------------
const cycloVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const cycloFrag = /* glsl */ `
uniform float uStudio; uniform float uRed; uniform float uTime;
varying vec3 vDir;
float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  float y = vDir.y;
  // halo de studio au-dessus de la voiture
  float halo = smoothstep(-0.15, 0.6, y) * (1.0 - smoothstep(0.6, 1.0, y));
  vec3 col = vec3(0.012, 0.012, 0.014);
  col += vec3(0.05, 0.052, 0.058) * halo * uStudio;
  // horizon : fine ligne lumineuse qui sépare sol et fond
  col += vec3(0.08) * exp(-abs(y - 0.02) * 60.0) * uStudio;
  // accent rouge bas, côté arrière
  col += vec3(0.25, 0.01, 0.01) * uRed * smoothstep(0.25, -0.05, y) * smoothstep(-0.2, -0.9, vDir.z) * 0.6;
  col += (h(gl_FragCoord.xy + uTime) - 0.5) * 0.012;
  gl_FragColor = vec4(col, 1.0);
}`

export function Cyclorama() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: cycloVert,
        fragmentShader: cycloFrag,
        uniforms: { uStudio: { value: 0 }, uRed: { value: 0 }, uTime: { value: 0 } },
        side: BackSide,
        depthWrite: false,
      }),
    [],
  )
  useFrame((state, dt) => {
    const shot = shotAt(frame.scrollY)
    damp(mat.uniforms.uStudio, 'value', shot.studio * frame.intro, 0.3, dt)
    damp(mat.uniforms.uRed, 'value', shot.red * frame.intro, 0.3, dt)
    mat.uniforms.uTime.value = state.clock.elapsedTime
  })
  return (
    <mesh material={mat} scale={60} renderOrder={-10}>
      <sphereGeometry args={[1, 48, 24]} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Sol : béton laqué noir réfléchissant (drei MeshReflectorMaterial) + traînées
// de vitesse procédurales pour la section Performance.
// ---------------------------------------------------------------------------
export function Floor() {
  const quality = useStore((s) => s.quality)
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        resolution={quality === 'high' ? 1024 : 512}
        blur={[420, 120]}
        mixBlur={1.1}
        mixStrength={3.2}
        mixContrast={1.05}
        mirror={0.75}
        depthScale={1.2}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.3}
        roughness={0.9}
        metalness={0.55}
        color="#09090a"
      />
    </mesh>
  )
}

const streakFrag = /* glsl */ `
uniform float uSpeed; uniform float uOffset;
varying vec2 vUv;
float h(float x){ return fract(sin(x * 127.1) * 43758.5453); }
void main() {
  vec2 p = (vUv - 0.5) * vec2(24.0, 60.0);
  float lane = floor(p.x * 1.2);
  float lx = fract(p.x * 1.2);
  float r = h(lane);
  float seg = fract((p.y + uOffset * (0.6 + r)) * 0.08 + r * 7.0);
  float line = smoothstep(0.5, 0.48, abs(lx - 0.5)) * smoothstep(0.035, 0.0, abs(lx - 0.5) - 0.0);
  float dash = smoothstep(0.0, 0.05, seg) * smoothstep(0.55, 0.25, seg);
  float side = smoothstep(1.4, 3.0, abs(p.x)) * (1.0 - smoothstep(9.0, 12.0, abs(p.x)));
  float a = line * dash * side * step(0.55, r) * uSpeed;
  a *= smoothstep(30.0, 6.0, abs(p.y));
  gl_FragColor = vec4(vec3(0.9, 0.92, 1.0) * a * 1.2, a);
}`

export function SpeedStreaks() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: streakFrag,
        uniforms: { uSpeed: { value: 0 }, uOffset: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )
  useFrame((_, dt) => {
    const shot = shotAt(frame.scrollY)
    damp(mat.uniforms.uSpeed, 'value', shot.speed, 0.35, dt)
    mat.uniforms.uOffset.value += dt * 60 * mat.uniforms.uSpeed.value
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.004} material={mat}>
      <planeGeometry args={[24, 60]} />
    </mesh>
  )
}
