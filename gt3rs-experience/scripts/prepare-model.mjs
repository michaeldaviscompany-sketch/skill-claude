// Préparation du modèle 3D (skill optimize-3d-assets) :
//   node scripts/prepare-model.mjs <source.glb|.gltf> public/models/gt3rs.glb [ratio] [--inspect]
// Inspecte les meshes/matériaux, puis : dedup → prune → weld → simplify (meshopt)
// → textures redimensionnées en WebP → compression meshopt. L'original n'est jamais modifié.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { dedup, prune, weld, simplifyPrimitive, textureCompress, meshopt, resample } from '@gltf-transform/functions'
import sharp from 'sharp'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import fs from 'node:fs'

const [src, out, ratioArg] = process.argv.slice(2)
const inspectOnly = process.argv.includes('--inspect')
await MeshoptEncoder.ready
await MeshoptSimplifier.ready

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder,
  'meshopt.decoder': MeshoptEncoder,
})
const doc = await io.read(src)
const root = doc.getRoot()

const tris = (prim) => {
  const idx = prim.getIndices()
  return idx ? idx.getCount() / 3 : prim.getAttribute('POSITION').getCount() / 3
}
let total = 0
const rows = []
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const t = tris(prim)
    total += t
    rows.push({ mesh: mesh.getName(), mat: prim.getMaterial()?.getName() ?? '-', tris: Math.round(t) })
  }
}
const byMat = {}
for (const r of rows) byMat[r.mat] = (byMat[r.mat] ?? 0) + r.tris
console.log('meshes:', root.listMeshes().length, 'primitives:', rows.length, 'triangles:', Math.round(total))
console.log('materials:', JSON.stringify(Object.entries(byMat).sort((a, b) => b[1] - a[1]), null, 0))
console.log('textures:', root.listTextures().map((t) => `${t.getName() || t.getURI()} ${t.getSize()?.join('x')}`).join(', '))
if (inspectOnly) {
  fs.writeFileSync(out + '.inventory.json', JSON.stringify(rows, null, 1))
  process.exit(0)
}

const scale = Number(ratioArg ?? 1)
// 1) Doublons basse résolution superposés (LOD « -1 » / « __lr_ ») : source de z-fighting
let removed = 0
for (const n of root.listNodes()) {
  if (/(__lr_|-1_)/.test(n.getName())) { n.dispose(); removed++ }
}
console.log('LOD dupliqués supprimés :', removed)
await doc.transform(dedup(), prune(), weld())
// 2) Simplification par famille de pièces : la carrosserie garde sa finesse,
//    l'habitacle (vu de loin, derrière le vitrage) est allégé davantage.
const ratioFor = (name) => {
  const n = name.toLowerCase()
  if (/^(int_|dash_|seat_|door_[lr]_|stitch|degree|cinture|key|airbag|button_bump|sw_|996_)/.test(n)) return 0.22
  if (/(wheel_|tyre_|brake_|disc_)/.test(n)) return 0.3
  if (/(headlights|taillights|light_cup|light_plastic)/.test(n)) return 0.3
  if (/(carpaint|hood|object0|plastic_hg_large|plastic_large)/.test(n)) return 0.6
  return 0.45
}
for (const node of root.listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue
  const ratio = Math.min(1, ratioFor(node.getName()) * scale)
  for (const prim of mesh.listPrimitives()) {
    if (tris(prim) < 400) continue
    simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio, error: 0.0006, lockBorder: true })
  }
}
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  resample(),
  prune(),
)
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER })
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
await io.write(out, doc)
let after = 0
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) after += tris(prim)
const size = (p) => (fs.statSync(p).size / 1e6).toFixed(2) + ' MB'
console.log(`triangles ${Math.round(total)} → ${Math.round(after)} | ${size(src)} → ${size(out)}`)
// Pas de flatten/join : ils fusionneraient roues et aileron, qui ont besoin de pivots propres.
