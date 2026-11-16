import {
  Color,
  Matrix4,
  MeshPhysicalMaterial,
  type IUniform,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import { GLSL_CARBON, GLSL_NOISE } from './shaders/common'

// ---------------------------------------------------------------------------
// Uniforms partagés : matrice inverse de la voiture (espace « voiture » stable
// même quand le groupe tourne), temps, etc.
// ---------------------------------------------------------------------------
export const carUniforms = {
  uCarInv: { value: new Matrix4() } as IUniform<Matrix4>,
  uTime: { value: 0 } as IUniform<number>,
}

const VERT_HEAD = /* glsl */ `
#include <common>
uniform mat4 uCarInv;
varying vec3 vCarPos;
varying vec3 vCarNrm;
`
const VERT_BODY = /* glsl */ `
#include <project_vertex>
vCarPos = (uCarInv * modelMatrix * vec4(transformed, 1.0)).xyz;
vCarNrm = normalize((uCarInv * modelMatrix * vec4(objectNormal, 0.0)).xyz);
`

function patchVertex(shader: WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', VERT_HEAD)
    .replace('#include <project_vertex>', VERT_BODY)
}

/** Projection triplanaire dans l'espace voiture → coordonnées de tissage. */
const GLSL_TRIPLANAR_CARBON = /* glsl */ `
vec3 gtCarbon(vec3 p, vec3 n, float scale) {
  vec3 w = abs(n);
  w = pow(w, vec3(6.0));
  w /= (w.x + w.y + w.z + 1e-5);
  vec3 a = gtTwill(p.zy * scale);
  vec3 b = gtTwill(p.xz * scale);
  vec3 c = gtTwill(p.xy * scale);
  return a * w.x + b * w.y + c * w.z;
}
`

// ---------------------------------------------------------------------------
// PEINTURE — MeshPhysical + vernis (clearcoat), paillettes procédurales pour
// les teintes métallisées, et transition « balayage » entre deux teintes avec
// liseré lumineux. Les zones Weissach passent en carbone apparent via masque.
// ---------------------------------------------------------------------------
export type PaintUniforms = {
  uColorA: IUniform<Color>
  uColorB: IUniform<Color>
  uMetalA: IUniform<number>
  uMetalB: IUniform<number>
  uWipe: IUniform<number>
  uWeissach: IUniform<number>
}

export function createPaintUniforms(): PaintUniforms {
  return {
    uColorA: { value: new Color('#a3aaac') },
    uColorB: { value: new Color('#a3aaac') },
    uMetalA: { value: 0 },
    uMetalB: { value: 0 },
    uWipe: { value: 1 },
    uWeissach: { value: 0 },
  }
}

/** part = true : pièce concernée par le pack Weissach (bascule peinture ↔ carbone apparent). */
export function createPaintMaterial(u: PaintUniforms, part = false) {
  const partU = { uPart: { value: part ? 1 : 0 } }
  const mat = new MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    envMapIntensity: 1.15,
  })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, carUniforms, partU)
    patchVertex(shader)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        ${GLSL_NOISE}
        ${GLSL_CARBON}
        ${GLSL_TRIPLANAR_CARBON}
        uniform vec3 uColorA; uniform vec3 uColorB;
        uniform float uMetalA; uniform float uMetalB;
        uniform float uWipe; uniform float uWeissach; uniform float uTime;
        uniform float uPart;
        varying vec3 vCarPos; varying vec3 vCarNrm;
        float gtSeam; float gtMetal; float gtCarbonMask; vec3 gtCarbonV;`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        // Balayage : la nouvelle teinte avance de l'avant (+Z) vers l'arrière.
        float n = gtNoise(vCarPos * 6.0) * 0.18 + gtNoise(vCarPos * 23.0) * 0.05;
        float front = mix(2.7, -2.9, uWipe) + n;
        float m = smoothstep(front - 0.015, front + 0.015, vCarPos.z);
        gtSeam = (1.0 - smoothstep(0.0, 0.045, abs(vCarPos.z - front))) * step(0.002, uWipe) * step(uWipe, 0.998);
        vec3 paint = mix(uColorA, uColorB, m);
        gtMetal = mix(uMetalA, uMetalB, m);
        // Pack Weissach : la pièce passe en carbone apparent par un balayage avant → arrière
        float wfront = mix(2.6, -2.6, uWeissach) + n * 0.5;
        gtCarbonMask = uPart * smoothstep(wfront - 0.03, wfront + 0.03, vCarPos.z);
        gtCarbonV = gtCarbon(vCarPos, vCarNrm, 150.0);
        vec3 carbon = vec3(0.012, 0.013, 0.015) + vec3(0.05, 0.052, 0.058) * gtCarbonV.x * mix(0.7, 1.15, gtCarbonV.y);
        diffuseColor.rgb = mix(paint, carbon, gtCarbonMask);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        /* glsl */ `#include <metalnessmap_fragment>
        metalnessFactor = mix(gtMetal * 0.75, 0.25, gtCarbonMask);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(0.36, 0.3, gtMetal), mix(0.42, 0.22, gtCarbonV.x), gtCarbonMask);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        // Paillettes : micro-facettes aléatoires sous le vernis, atténuées avec la distance (anti-aliasing).
        float px = length(fwidth(vCarPos));
        float flakeFade = 1.0 - smoothstep(0.0008, 0.004, px);
        vec3 fl = gtHash33(floor(vCarPos * 1400.0)) - 0.5;
        normal = normalize(normal + fl * 0.22 * gtMetal * flakeFade);
        // Relief du tissage carbone (sous le vernis)
        normal = normalize(normal + gtCarbonMask * 0.18 * gtCarbonV.z * (mat3(viewMatrix) * (gtCarbonV.y > 0.5 ? vec3(1.0,0.0,0.0) : vec3(0.0,0.0,1.0))));`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.09, 0.06) * gtSeam * 6.0;`,
      )
  }
  mat.customProgramCacheKey = () => 'gt-paint-v2'
  return mat
}

// ---------------------------------------------------------------------------
// CARBONE APPARENT — vernis brillant (extérieur) ou satiné (intérieur).
// ---------------------------------------------------------------------------
export function createCarbonMaterial(opts: { satin?: boolean; scale?: number } = {}) {
  const mat = new MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0.2,
    roughness: 0.35,
    clearcoat: opts.satin ? 0.35 : 1,
    clearcoatRoughness: opts.satin ? 0.35 : 0.04,
    envMapIntensity: 1,
  })
  const scale = opts.scale ?? 150
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, carUniforms)
    patchVertex(shader)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\n${GLSL_CARBON}\n${GLSL_TRIPLANAR_CARBON}\nvarying vec3 vCarPos; varying vec3 vCarNrm; vec3 gtC;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        gtC = gtCarbon(vCarPos, vCarNrm, ${scale.toFixed(1)});
        diffuseColor.rgb = vec3(0.012, 0.013, 0.015) + vec3(0.05, 0.052, 0.058) * gtC.x * mix(0.7, 1.15, gtC.y);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\nroughnessFactor = mix(0.45, 0.22, gtC.x);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>\nnormal = normalize(normal + 0.18 * gtC.z * (mat3(viewMatrix) * (gtC.y > 0.5 ? vec3(1.0,0.0,0.0) : vec3(0.0,0.0,1.0))));`,
      )
  }
  mat.customProgramCacheKey = () => `gt-carbon-${opts.satin ? 's' : 'g'}-${scale}`
  return mat
}

// ---------------------------------------------------------------------------
// Matériaux génériques
// ---------------------------------------------------------------------------
export const createGlass = () =>
  new MeshPhysicalMaterial({
    color: '#0b0d10',
    metalness: 0,
    roughness: 0.02,
    transmission: 0,
    transparent: true,
    opacity: 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0,
    envMapIntensity: 1.6,
    depthWrite: false,
  })

export const createLensGlass = () =>
  new MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0,
    roughness: 0.02,
    transparent: true,
    opacity: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0,
    envMapIntensity: 2,
    depthWrite: false,
  })

export const createTyre = () =>
  new MeshPhysicalMaterial({ color: '#0d0d0e', metalness: 0, roughness: 0.82, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new Color('#222222') })

export const createRim = () =>
  new MeshPhysicalMaterial({ color: '#7b7f85', metalness: 1, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.1 })

export const createDarkMetal = () =>
  new MeshPhysicalMaterial({ color: '#2a2c2f', metalness: 1, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.12 })

export const createBrushedAlu = () =>
  new MeshPhysicalMaterial({ color: '#c8cbcf', metalness: 1, roughness: 0.22 })

export const createBlackTrim = () =>
  new MeshPhysicalMaterial({ color: '#0b0b0c', metalness: 0, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.3 })

export const createGlossBlack = () =>
  new MeshPhysicalMaterial({ color: '#050506', metalness: 0, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 })

export const createDisc = () =>
  new MeshPhysicalMaterial({ color: '#6b6d70', metalness: 1, roughness: 0.42 })

export const createCaliper = () =>
  new MeshPhysicalMaterial({ color: '#1b1c1e', metalness: 0.3, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.1 })

export const createInterior = () =>
  new MeshPhysicalMaterial({ color: '#111113', metalness: 0, roughness: 0.75, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new Color('#333') })

export const createChrome = () => new MeshPhysicalMaterial({ color: '#e8eaee', metalness: 1, roughness: 0.06 })

export const createRedLens = () =>
  new MeshPhysicalMaterial({ color: '#5a0608', metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.92 })

export const createUnder = () => new MeshPhysicalMaterial({ color: '#070708', metalness: 0, roughness: 0.9 })

export const createMeshGrille = () => new MeshPhysicalMaterial({ color: '#0e0e10', metalness: 0.6, roughness: 0.5 })

export const createInteriorPlastic = () => new MeshPhysicalMaterial({ color: '#141416', metalness: 0, roughness: 0.62 })

export const createBelt = () => new MeshPhysicalMaterial({ color: '#101012', metalness: 0, roughness: 0.85, sheen: 0.5, sheenColor: new Color('#2a2a2a') })

export const createStitch = () => new MeshPhysicalMaterial({ color: '#8d9096', metalness: 0, roughness: 0.7 })

export const createYellow = () => new MeshPhysicalMaterial({ color: '#f5c400', metalness: 0, roughness: 0.5 })

export const createScreen = () => new MeshPhysicalMaterial({ color: '#050608', emissive: new Color('#9fb2c8'), emissiveIntensity: 0.25, roughness: 0.1 })

export const createSteelCage = () => new MeshPhysicalMaterial({ color: '#2b2d31', metalness: 0.7, roughness: 0.38, clearcoat: 0.4 })

export const createLightEmissive = (color = '#ffffff', intensity = 0) =>
  new MeshPhysicalMaterial({ color: '#1a1a1a', emissive: new Color(color), emissiveIntensity: intensity, roughness: 0.2, toneMapped: true })
