import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, BufferAttribute, BufferGeometry, Float32BufferAttribute, Group, Mesh, Object3D, Vector3, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { damp } from 'maath/easing'
import { PAINTS } from '../data/paints'
import { shotAt } from '../scroll/scroll'
import { frame, useStore } from '../store'
import { Airflow, buildHeightField } from './Airflow'
import { Hotspots } from './Hotspots'
import {
  carUniforms,
  createBelt,
  createBlackTrim,
  createBrushedAlu,
  createCaliper,
  createCarbonMaterial,
  createChrome,
  createDarkMetal,
  createDisc,
  createGlass,
  createGlossBlack,
  createInterior,
  createInteriorPlastic,
  createLensGlass,
  createLightEmissive,
  createMeshGrille,
  createPaintMaterial,
  createPaintUniforms,
  createRedLens,
  createRim,
  createScreen,
  createSteelCage,
  createStitch,
  createTyre,
  createUnder,
  createYellow,
} from './materials'
import { MODEL_URL, SPLITS, classify, type Role } from './modelConfig'

export const CAR_LENGTH = 4.572 // m — longueur publiée, sert à caler l'échelle du modèle

/** Extrait d'un mesh indexé les triangles qui satisfont `keep` (espace voiture). */
function splitMesh(mesh: Mesh, keep: (c: [number, number, number], ny: number) => boolean): Mesh | null {
  const g = mesh.geometry
  const pos = g.getAttribute('position')
  const index = g.getIndex()
  if (!index) return null
  const m = mesh.matrixWorld
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), e1 = new Vector3(), e2 = new Vector3()
  const inside: number[] = []
  const outside: number[] = []
  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i), ib = index.getX(i + 1), ic = index.getX(i + 2)
    a.fromBufferAttribute(pos, ia).applyMatrix4(m)
    b.fromBufferAttribute(pos, ib).applyMatrix4(m)
    c.fromBufferAttribute(pos, ic).applyMatrix4(m)
    const ny = e1.subVectors(b, a).cross(e2.subVectors(c, a)).normalize().y
    const cen: [number, number, number] = [(a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3]
    ;(keep(cen, ny) ? inside : outside).push(ia, ib, ic)
  }
  if (!inside.length) return null
  const mk = (arr: number[]) => {
    const ng = new BufferGeometry()
    for (const [name, attr] of Object.entries(g.attributes)) ng.setAttribute(name, attr)
    ng.setIndex(new BufferAttribute(pos.count > 65535 ? new Uint32Array(arr) : new Uint16Array(arr), 1))
    ng.computeBoundingBox()
    ng.computeBoundingSphere()
    return ng
  }
  mesh.geometry = mk(outside)
  const part = new Mesh(mk(inside), mesh.material)
  part.name = `${mesh.name}__split`
  mesh.parent!.add(part)
  part.position.copy(mesh.position)
  part.quaternion.copy(mesh.quaternion)
  part.scale.copy(mesh.scale)
  part.updateMatrixWorld(true)
  return part
}

const rig_wheels_and_flap = (wheels: Object3D[], flap: Object3D | null) => (flap ? [...wheels, flap] : wheels)

/** Géométrie « à plat » (float32, transformée) pour la fusion par matériau. */
function bakeGeometry(mesh: Mesh): BufferGeometry {
  const src = mesh.geometry
  const pos = src.getAttribute('position')
  const g = new BufferGeometry()
  const p = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    p[i * 3] = pos.getX(i)
    p[i * 3 + 1] = pos.getY(i)
    p[i * 3 + 2] = pos.getZ(i)
  }
  g.setAttribute('position', new Float32BufferAttribute(p, 3))
  const nrm = src.getAttribute('normal')
  if (nrm) {
    const n = new Float32Array(nrm.count * 3)
    for (let i = 0; i < nrm.count; i++) {
      n[i * 3] = nrm.getX(i)
      n[i * 3 + 1] = nrm.getY(i)
      n[i * 3 + 2] = nrm.getZ(i)
    }
    g.setAttribute('normal', new Float32BufferAttribute(n, 3))
  }
  const idx = src.getIndex()
  if (idx) g.setIndex(new BufferAttribute(Uint32Array.from({ length: idx.count }, (_, i) => idx.getX(i)), 1))
  if (!nrm) g.computeVertexNormals()
  g.applyMatrix4(mesh.matrixWorld)
  return g
}

type GLTFScene = Group

/** Préparation coûteuse (découpes, fusion, carte de hauteurs) : faite UNE fois par modèle,
 *  même si le composant est remonté (Suspense, StrictMode). */
const prepared = new WeakMap<GLTFScene, ReturnType<typeof prepareCar>>()

function prepareCar(gltfScene: GLTFScene) {
  const paintU = createPaintUniforms()
  const mats = {
      paint: createPaintMaterial(paintU, false),
      paintWeissach: createPaintMaterial(paintU, true),
      carbon: createCarbonMaterial(),
      carbonSatin: createCarbonMaterial({ satin: true, scale: 190 }),
      steelCage: createSteelCage(),
      glass: createGlass(),
      lens: createLensGlass(),
      redLens: createRedLens(),
      chrome: createChrome(),
      tyre: createTyre(),
      rim: createRim(),
      rimDark: createGlossBlack(),
      alu: createBrushedAlu(),
      aluDark: createDarkMetal(),
      disc: createDisc(),
      caliper: createCaliper(),
      trim: createBlackTrim(),
      gloss: createGlossBlack(),
      under: createUnder(),
      mesh: createMeshGrille(),
      interior: createInterior(),
      interiorPlastic: createInteriorPlastic(),
      belt: createBelt(),
      stitch: createStitch(),
      yellow: createYellow(),
      screen: createScreen(),
      head: createLightEmissive('#eef3ff', 0),
      tail: createLightEmissive('#ff0303', 0),
    }

  // échelle, matériaux, découpes, pivots, carte de hauteurs, fusion
  {
    const src = gltfScene.clone(true)
    const holder = new Group()
    holder.add(src)
    holder.updateMatrixWorld(true)
    let b = new Box3().setFromObject(holder)
    const k = CAR_LENGTH / (b.max.z - b.min.z)
    src.scale.multiplyScalar(k)
    holder.updateMatrixWorld(true)
    b = new Box3().setFromObject(holder)
    const c = b.getCenter(new Vector3())
    src.position.set(-c.x, -b.min.y, -c.z)
    holder.updateMatrixWorld(true)

    const roleMat: Record<Exclude<Role, 'hide'>, Material> = {
      paint: mats.paint,
      paintWeissach: mats.paintWeissach,
      carbon: mats.carbon,
      carbonSatin: mats.carbonSatin,
      rollcage: mats.carbonSatin,
      glass: mats.glass,
      lens: mats.lens,
      redLens: mats.redLens,
      chrome: mats.chrome,
      tyre: mats.tyre,
      rim: mats.rim,
      rimDark: mats.rimDark,
      alu: mats.alu,
      aluDark: mats.aluDark,
      disc: mats.disc,
      caliper: mats.caliper,
      trim: mats.trim,
      gloss: mats.gloss,
      under: mats.under,
      mesh: mats.mesh,
      interior: mats.interior,
      interiorPlastic: mats.interiorPlastic,
      belt: mats.belt,
      stitch: mats.stitch,
      yellow: mats.yellow,
      screen: mats.screen,
      head: mats.head,
      tail: mats.tail,
    }
    const wheelMeshes: Record<string, Mesh[]> = { lf: [], rf: [], lr: [], rr: [] }
    const tyres: Record<string, Mesh> = {}
    const rollcage: Mesh[] = []
    let body: Mesh | null = null
    const meshes: Mesh[] = []
    holder.traverse((o) => {
      if ((o as Mesh).isMesh) meshes.push(o as Mesh)
    })
    for (const m of meshes) {
      const r = classify(m.name)
      if (r.role === 'hide') {
        m.visible = false
        continue
      }
      m.material = roleMat[r.role]
      m.castShadow = true
      if (r.wheel) {
        wheelMeshes[r.wheel].push(m)
        if (m.name.toLowerCase().startsWith('tyre_') && /_m_/.test(m.name)) tyres[r.wheel] = m
      }
      if (r.role === 'rollcage') rollcage.push(m)
      if (/^body_01_CarPaint_0/.test(m.name)) body = m
      // l'habitacle est vu à travers le vitrage : inutile qu'il projette des ombres
      if (/^(int_|dash_|seat_|door_[LR]_|stitch|degree|sw_)/i.test(m.name)) m.castShadow = false
    }

    // Découpes : volet d'aileron + coques de rétroviseurs → pièces Weissach
    let flapPivot: Object3D | null = null
    let wingZ = -2.0, wingY = 1.25
    if (body) {
      const flap = splitMesh(body, SPLITS.wingFlap)
      if (flap) {
        flap.material = mats.paintWeissach
        const fb = new Box3().setFromObject(flap)
        const pivot = new Group()
        pivot.position.set(0, (fb.min.y + fb.max.y) / 2, fb.max.z)
        holder.add(pivot)
        pivot.updateMatrixWorld(true)
        pivot.attach(flap)
        flapPivot = pivot
        wingZ = (fb.min.z + fb.max.z) / 2
        wingY = (fb.min.y + fb.max.y) / 2
      }
      const mirror = splitMesh(body, SPLITS.mirrorTop)
      if (mirror) mirror.material = mats.paintWeissach
    }

    // Pivots de roue sur le centre du pneu (étriers exclus : ils ne tournent pas)
    const wheels: Object3D[] = []
    for (const key of ['lf', 'rf', 'lr', 'rr']) {
      const list = wheelMeshes[key]
      if (!list.length) continue
      const ref = tyres[key] ?? list[0]
      const center = new Box3().setFromObject(ref).getCenter(new Vector3())
      const pivot = new Group()
      pivot.position.copy(center)
      holder.add(pivot)
      pivot.updateMatrixWorld(true)
      list.forEach((m) => pivot.attach(m))
      wheels.push(pivot)
    }

    // Carte de hauteurs pour les flux d'air, extraite de la géométrie réelle (hors habitacle)
    holder.updateMatrixWorld(true)
    const pts: number[] = []
    const v = new Vector3()
    holder.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh || !m.visible || /^(int_|dash_|seat_|door_[LR]_|stitch|degree|sw_)/i.test(m.name)) return
      const pos = m.geometry.getAttribute('position')
      const step = Math.max(1, Math.floor(pos.count / 6000))
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
        pts.push(v.x, v.y, v.z)
      }
    })
    const field = buildHeightField(new Float32Array(pts))
    // Fusion des pièces fixes par matériau : ~300 appels de rendu → quelques dizaines
    // (skill webgl-perf-auditor). Roues, volet d'aileron et arceau restent séparés (animés).
    const dynamic = new Set<Object3D>(rollcage)
    rig_wheels_and_flap(wheels, flapPivot).forEach((o) => o.traverse((c) => dynamic.add(c)))
    const byMat = new Map<Material, Mesh[]>()
    holder.updateMatrixWorld(true)
    holder.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh || dynamic.has(m) || Array.isArray(m.material)) return
      if (!m.visible) return
      const list = byMat.get(m.material) ?? []
      list.push(m)
      byMat.set(m.material, list)
    })
    let before = 0
    let after = 0
    byMat.forEach((list, mat) => {
      before += list.length
      if (list.length < 2) {
        after += list.length
        return
      }
      const merged = mergeGeometries(list.map(bakeGeometry), false)
      if (!merged) {
        after += list.length
        return
      }
      merged.computeBoundingSphere()
      const mm = new Mesh(merged, mat)
      mm.name = `merged:${mat.uuid.slice(0, 6)}`
      holder.add(mm)
      list.forEach((m) => {
        m.geometry.dispose()
        m.removeFromParent()
      })
      after += 1
    })
    if (import.meta.env.DEV) console.info(`[GT3 RS] meshes statiques : ${before} → ${after}`)

    return { paintU, mats, scene: holder, rig: { wheels, flapPivot, wingZ, wingY, field, rollcage } }
  }
}

export function Car() {
  const gltf = useGLTF(MODEL_URL)
  const root = useRef<Group>(null!)
  const { paintU, mats, scene, rig } = useMemo(() => {
    const scene = gltf.scene as GLTFScene
    let p = prepared.get(scene)
    if (!p) {
      p = prepareCar(scene)
      prepared.set(scene, p)
    }
    return p
  }, [gltf])

  // Teinte : balayage GLSL de l'avant vers l'arrière
  const wipe = useRef(1)
  useEffect(() => {
    const setPaint = (target: 'A' | 'B', id: string) => {
      const p = PAINTS.find((x) => x.id === id) ?? PAINTS[0]
      ;(target === 'A' ? paintU.uColorA : paintU.uColorB).value.set(p.hex).convertSRGBToLinear()
      ;(target === 'A' ? paintU.uMetalA : paintU.uMetalB).value = p.metallic ? 1 : 0
    }
    const s0 = useStore.getState()
    setPaint('A', s0.paint)
    setPaint('B', s0.paint)
    return useStore.subscribe((s, prev) => {
      if (s.paint === prev.paint) return
      setPaint('A', prev.paint)
      setPaint('B', s.paint)
      wipe.current = 0
      paintU.uWipe.value = 0
    })
  }, [paintU])

  const spin = useRef(0)
  const yaw = useRef(0)
  const pitch = useRef(0)
  const prevZ = useRef(-13)

  useFrame((state, dt) => {
    const st = useStore.getState()
    const shot = shotAt(frame.scrollY)
    carUniforms.uTime.value = state.clock.elapsedTime

    if (wipe.current < 1) {
      wipe.current = Math.min(1, wipe.current + dt / (st.reducedMotion ? 0.2 : 1.4))
      paintU.uWipe.value = wipe.current
    }
    damp(paintU.uWeissach, 'value', st.weissach ? 1 : 0, 0.35, dt)
    const cage = st.weissach ? mats.carbonSatin : mats.steelCage
    if (rig.rollcage[0] && rig.rollcage[0].material !== cage) rig.rollcage.forEach((m) => (m.material = cage))

    // Arrivée : la voiture sort de l'obscurité et freine (interprétation artistique)
    const t = frame.intro
    const e = 1 - Math.pow(1 - Math.min(1, t / 0.82), 3)
    const z = -13 * (1 - e)
    const v = (z - prevZ.current) / Math.max(dt, 1e-3)
    prevZ.current = z
    root.current.position.z = z
    const decel = t > 0.5 && t < 0.92 ? Math.sin(((t - 0.5) / 0.42) * Math.PI) : 0
    damp(pitch, 'current', decel * 0.011, 0.08, dt)
    root.current.rotation.x = pitch.current
    damp(yaw, 'current', shot.yaw, 0.4, dt)
    root.current.rotation.y = yaw.current
    root.current.updateMatrixWorld()
    carUniforms.uCarInv.value.copy(root.current.matrixWorld).invert()

    // Roues : rayon ≈ 0,34 m. La vitesse simulée est volontairement modérée (lisibilité).
    const w = (Math.abs(v) + shot.speed * 9) / 0.34
    spin.current += w * dt
    rig.wheels.forEach((p) => (p.rotation.x = spin.current))

    // Volet supérieur : DRS (à plat) / appui élevé / airbrake (braquage max)
    if (rig.flapPivot) {
      const target = st.aero === 'drs' ? -0.14 : st.aero === 'airbrake' ? 0.38 : st.aero === 'high' ? 0.17 : 0
      damp(rig.flapPivot.rotation, 'x', target, st.aero === 'airbrake' ? 0.1 : 0.28, dt)
    }

    // Feux : allumage pendant l'intro
    const head = Math.min(1, Math.max(0, (t - 0.3) * 3))
    mats.head.emissiveIntensity = head * (4 + shot.rim * 2)
    mats.tail.emissiveIntensity = Math.min(1, t * 2) * 1.7
  })

  return (
    <group ref={root}>
      <primitive object={scene} />
      <Airflow field={rig.field} wingZ={rig.wingZ} wingY={rig.wingY} />
      <Hotspots />
    </group>
  )
}

useGLTF.preload(MODEL_URL)
