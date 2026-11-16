// Préparation du modèle 3D (skill optimize-3d-assets) :
//   node scripts/prepare-model.mjs <source.glb|.gltf> public/models/gt3rs.glb [ratio] [--inspect]
// Inspecte les meshes/matériaux, puis : dedup → prune → weld → simplify (meshopt)
// → textures redimensionnées en WebP → compression meshopt. L'original n'est jamais modifié.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions'
import { dedup, prune, weld, simplify, textureCompress, meshopt, resample } from '@gltf-transform/functions'
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

const ratio = Number(ratioArg ?? 0.5)
await doc.transform(
  dedup(),
  prune(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0008, lockBorder: true }),
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
