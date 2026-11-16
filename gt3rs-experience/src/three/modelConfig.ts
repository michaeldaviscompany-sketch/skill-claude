// Correspondance noms de meshes / matériaux du modèle → rôles de matériaux.
// Ajusté après inspection du fichier GLB (voir scripts/inspect-model.mjs).

export const MODEL_URL = '/models/gt3rs.glb'

export type Role =
  | 'paint' | 'carbon' | 'carbonSatin' | 'glass' | 'lens' | 'tyre' | 'rim' | 'alu' | 'trim'
  | 'gloss' | 'disc' | 'caliper' | 'interior' | 'head' | 'tail' | 'keep'

export type Classified = { role: Role; wheel?: boolean; wingFlap?: boolean }

const has = (s: string, ...k: string[]) => k.some((x) => s.includes(x))

export function classify(meshName: string, matName: string): Classified {
  const n = `${meshName} ${matName}`.toLowerCase()
  if (has(n, 'tire', 'tyre', 'rubber', 'pneu')) return { role: 'tyre', wheel: true }
  if (has(n, 'caliper', 'etrier')) return { role: 'caliper' }
  if (has(n, 'disc', 'rotor', 'brake')) return { role: 'disc', wheel: true }
  if (has(n, 'rim', 'wheel', 'jante')) return { role: 'rim', wheel: true }
  if (has(n, 'glass', 'window', 'windshield')) return { role: 'glass' }
  if (has(n, 'headlight', 'head_light', 'drl')) return { role: 'head' }
  if (has(n, 'taillight', 'tail_light', 'rear_light')) return { role: 'tail' }
  if (has(n, 'lens')) return { role: 'lens' }
  if (has(n, 'carbon', 'cfrp')) return { role: 'carbon' }
  if (has(n, 'interior', 'seat', 'leather', 'alcantara')) return { role: 'interior' }
  if (has(n, 'chrome', 'metal', 'exhaust')) return { role: 'alu' }
  if (has(n, 'black', 'plastic', 'trim', 'grill', 'mesh')) return { role: 'trim' }
  if (has(n, 'paint', 'body', 'car_paint', 'carpaint')) return { role: 'paint' }
  return { role: 'keep' }
}

/** Zones carbone apparent du pack Weissach (espace voiture, m) — S1 : capot, toit,
 *  parties de l'aileron, coques supérieures des rétroviseurs. */
export const WEISSACH_BOXES: { min: [number, number, number]; max: [number, number, number] }[] = []
