import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  DataTexture,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  PlaneGeometry,
  RedFormat,
  ShaderMaterial,
  UnsignedByteType,
} from 'three'
import { damp } from 'maath/easing'
import { shotAt } from '../scroll/scroll'
import { frame, useStore } from '../store'

// ---------------------------------------------------------------------------
// VISUALISATION ARTISTIQUE des flux d'air (pas une simulation CFD).
// Une carte de hauteurs est calculée à partir de la géométrie réelle du modèle
// (vue de dessus) ; des milliers de traits lumineux la suivent dans le vertex
// shader, s'élèvent au-dessus du capot, longent le toit et sont déviés par
// l'aileron. Le volet supérieur de l'aileron module la déviation (DRS / airbrake).
// ---------------------------------------------------------------------------

export type HeightField = { tex: DataTexture; xMin: number; xMax: number; zMin: number; zMax: number; hMax: number }

/** Rasterise les sommets (espace voiture) en carte de hauteurs lissée. */
export function buildHeightField(points: Float32Array, opts = { nx: 64, nz: 160 }): HeightField {
  const { nx, nz } = opts
  let xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity, hMax = 0
  for (let i = 0; i < points.length; i += 3) {
    xMin = Math.min(xMin, points[i]); xMax = Math.max(xMax, points[i])
    zMin = Math.min(zMin, points[i + 2]); zMax = Math.max(zMax, points[i + 2])
    hMax = Math.max(hMax, points[i + 1])
  }
  const padX = 0.6, padZ = 1.2
  xMin -= padX; xMax += padX; zMin -= padZ; zMax += padZ
  const h = new Float32Array(nx * nz)
  for (let i = 0; i < points.length; i += 3) {
    const ix = Math.floor(((points[i] - xMin) / (xMax - xMin)) * (nx - 1))
    const iz = Math.floor(((points[i + 2] - zMin) / (zMax - zMin)) * (nz - 1))
    const k = iz * nx + ix
    if (points[i + 1] > h[k]) h[k] = points[i + 1]
  }
  // L'air « anticipe » l'obstacle : propagation vers l'avant (+Z) avec décroissance
  const out = new Float32Array(h)
  const dz = (zMax - zMin) / nz
  for (let ix = 0; ix < nx; ix++) {
    let carry = 0
    for (let iz = nz - 1; iz >= 0; iz--) {
      const k = iz * nx + ix
      carry = Math.max(h[k], carry - dz * 0.55)
      out[k] = Math.max(out[k], carry)
    }
    carry = 0
    for (let iz = 0; iz < nz; iz++) {
      const k = iz * nx + ix
      carry = Math.max(out[k], carry - dz * 0.35)
      out[k] = Math.max(out[k], carry)
    }
  }
  // Flou séparable
  const blur = (src: Float32Array, rx: number, rz: number) => {
    const tmp = new Float32Array(src.length)
    for (let iz = 0; iz < nz; iz++)
      for (let ix = 0; ix < nx; ix++) {
        let s = 0, c = 0
        for (let d = -rx; d <= rx; d++) {
          const x = ix + d
          if (x < 0 || x >= nx) continue
          s += src[iz * nx + x]; c++
        }
        tmp[iz * nx + ix] = s / c
      }
    const dst = new Float32Array(src.length)
    for (let iz = 0; iz < nz; iz++)
      for (let ix = 0; ix < nx; ix++) {
        let s = 0, c = 0
        for (let d = -rz; d <= rz; d++) {
          const z = iz + d
          if (z < 0 || z >= nz) continue
          s += tmp[z * nx + ix]; c++
        }
        dst[iz * nx + ix] = s / c
      }
    return dst
  }
  const sm = blur(blur(out, 2, 3), 1, 2)
  const bytes = new Uint8Array(nx * nz)
  for (let i = 0; i < sm.length; i++) bytes[i] = Math.min(255, Math.round((sm[i] / (hMax * 1.1)) * 255))
  const tex = new DataTexture(bytes, nx, nz, RedFormat, UnsignedByteType)
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.needsUpdate = true
  return { tex, xMin, xMax, zMin, zMax, hMax: hMax * 1.1 }
}

const vert = /* glsl */ `
uniform sampler2D uHeight;
uniform vec4 uBounds; // xMin, xMax, zMin, zMax
uniform float uHMax;
uniform float uTime;
uniform float uWing;   // -1 DRS (plat) → 0 → 1 airbrake
uniform float uWingZ;
uniform float uWingY;
attribute vec3 aSeed;  // x, y, phase
attribute float aRand;
varying float vAlpha;
varying float vHeat;
varying float vAlong;

float hAt(vec2 xz) {
  vec2 uv = vec2((xz.x - uBounds.x) / (uBounds.y - uBounds.x), (xz.y - uBounds.z) / (uBounds.w - uBounds.z));
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture2D(uHeight, uv).r * uHMax;
}

vec3 flowPos(float t) {
  float z = mix(4.2, -5.2, t);
  float x = aSeed.x;
  float h = hAt(vec2(x, z));
  float y = max(aSeed.y, h + 0.035 + aRand * 0.05);
  // sillage : l'air redescend après l'aileron (déflexion selon l'angle du volet)
  float behind = smoothstep(uWingZ + 0.1, uWingZ - 1.6, z);
  float wingInfluence = (1.0 - smoothstep(0.0, 0.5, abs(y - uWingY))) * smoothstep(0.75, 0.2, abs(x));
  y += behind * wingInfluence * (0.22 + 0.32 * uWing);
  y -= smoothstep(uWingZ - 0.6, uWingZ - 3.0, z) * 0.18 * (1.0 + uWing) * step(0.25, y);
  // contournement latéral léger
  x += sign(x) * smoothstep(0.55, 0.0, abs(aSeed.y - h)) * 0.05;
  return vec3(x, y, z);
}

void main() {
  float speed = 0.16 + aRand * 0.05;
  float t = fract(aSeed.z + uTime * speed);
  vec3 p0 = flowPos(t);
  vec3 p1 = flowPos(t + 0.075);
  vec3 dir = p1 - p0;
  // ruban orienté face caméra
  vec3 wp = (modelMatrix * vec4(p0, 1.0)).xyz;
  vec3 view = transpose(mat3(modelMatrix)) * normalize(cameraPosition - wp); // vue → espace voiture
  vec3 side = normalize(cross(dir, view)) * 0.0028;
  vec3 pos = mix(p0, p1, position.y + 0.5) + side * position.x * 2.0;
  vAlong = position.y + 0.5;
  vAlpha = smoothstep(0.0, 0.08, t) * smoothstep(0.9, 0.62, t);
  float h = hAt(p0.xz);
  // rouge = zone de l'aileron (appui), blanc ailleurs
  vHeat = smoothstep(uWingZ + 0.7, uWingZ - 0.2, p0.z) * smoothstep(0.55, 0.05, abs(p0.y - uWingY)) * smoothstep(1.1, 0.4, abs(p0.x));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`

const frag = /* glsl */ `
uniform float uOpacity;
varying float vAlpha; varying float vHeat; varying float vAlong;
void main() {
  float a = vAlpha * vAlong * uOpacity * 0.85;
  vec3 cold = vec3(0.75, 0.82, 0.95);
  vec3 hot = vec3(1.0, 0.12, 0.08);
  vec3 c = mix(cold, hot, clamp(vHeat, 0.0, 1.0));
  gl_FragColor = vec4(c * a * 1.6, a);
}`

export function Airflow({ field, wingZ, wingY }: { field: HeightField; wingZ: number; wingY: number }) {
  const quality = useStore((s) => s.quality)
  const count = quality === 'high' ? 1800 : 900
  const { geo, mat } = useMemo(() => {
    const plane = new PlaneGeometry(1, 1, 1, 1)
    const g = new InstancedBufferGeometry()
    g.index = plane.index
    g.setAttribute('position', plane.getAttribute('position'))
    const seeds = new Float32Array(count * 3)
    const rand = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      seeds[i * 3] = (Math.random() * 2 - 1) * 0.95
      seeds[i * 3 + 1] = 0.1 + Math.pow(Math.random(), 1.8) * 1.3
      seeds[i * 3 + 2] = Math.random()
      rand[i] = Math.random()
    }
    g.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 3))
    g.setAttribute('aRand', new InstancedBufferAttribute(rand, 1))
    g.instanceCount = count
    const m = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uHeight: { value: field.tex },
        uBounds: { value: [field.xMin, field.xMax, field.zMin, field.zMax] },
        uHMax: { value: field.hMax },
        uTime: { value: 0 },
        uWing: { value: 0 },
        uWingZ: { value: wingZ },
        uWingY: { value: wingY },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    return { geo: g, mat: m }
  }, [field, count, wingZ, wingY])

  useFrame((state, dt) => {
    const shot = shotAt(frame.scrollY)
    const st = useStore.getState()
    const visible = st.airflow ? shot.air : 0
    damp(mat.uniforms.uOpacity, 'value', visible, 0.35, dt)
    const target = st.aero === 'drs' ? -1 : st.aero === 'airbrake' ? 1 : st.aero === 'high' ? 0.45 : 0
    damp(mat.uniforms.uWing, 'value', target, 0.3, dt)
    mat.uniforms.uTime.value = state.clock.elapsedTime
  })

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />
}
