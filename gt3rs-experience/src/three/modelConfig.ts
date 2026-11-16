// Correspondance pièces du modèle → matériaux recréés.
// Le GLB source n'a AUCUN matériau exploitable (tout est gris 0.8) : chaque pièce est
// identifiée par son nom de mesh (inventaire : scripts/prepare-model.mjs --inspect).

export const MODEL_URL = '/models/gt3rs.glb'

export type Role =
  | 'paint' | 'paintWeissach' | 'carbon' | 'carbonSatin' | 'rollcage'
  | 'glass' | 'lens' | 'redLens' | 'chrome'
  | 'tyre' | 'rim' | 'rimDark' | 'alu' | 'aluDark' | 'disc' | 'caliper'
  | 'trim' | 'gloss' | 'under' | 'mesh'
  | 'interior' | 'interiorPlastic' | 'belt' | 'stitch' | 'yellow' | 'screen'
  | 'head' | 'tail' | 'hide'

export type Classified = { role: Role; wheel?: 'lf' | 'rf' | 'lr' | 'rr' }

const t = (re: RegExp, s: string) => re.test(s)

export function classify(meshName: string): Classified {
  const n = meshName.toLowerCase()
  const w = n.match(/^(?:wheel|tyre|disc)_(lf|rf|lr|rr)_/)?.[1] as Classified['wheel']

  // --- doublons / pièces invisibles
  if (t(/^hood_37_ext_carbon/, n)) return { role: 'hide' } // doublon coplanaire du capot
  if (t(/int_glass_large/, n)) return { role: 'hide' } // double paroi intérieure des vitres

  // --- roues (tournent) / freins (fixes)
  if (w) {
    if (n.startsWith('tyre_')) return { role: 'tyre', wheel: w }
    if (n.startsWith('disc_')) return { role: 'disc', wheel: w }
    if (t(/paint_red/, n)) return { role: 'rim', wheel: w }
    if (t(/paint_black/, n)) return { role: 'rimDark', wheel: w }
    if (t(/metal_tex/, n)) return { role: 'alu', wheel: w }
    if (t(/wheel_metal/, n)) return { role: 'alu', wheel: w }
    return { role: 'trim', wheel: w }
  }
  if (n.startsWith('brake_')) return { role: t(/caliper_main|caliper_plastic/, n) ? 'caliper' : t(/decal/, n) ? 'aluDark' : 'aluDark' }

  // --- carrosserie
  if (t(/carpaint_carbon/, n)) return { role: 'paintWeissach' } // bandes du capot + toit (pack Weissach)
  if (t(/carpaint/, n)) return { role: 'paint' }
  if (t(/rollcage/, n)) return { role: 'rollcage' }
  if (t(/body_decal/, n)) return { role: 'hide' } // décor latéral « GT3 RS » : option non vérifiée → masqué

  // --- éclairage
  if (t(/hdl_emissive|headlights_40_a/, n)) return { role: 'head' }
  if (t(/taillights_46|taillights_04_1_emissive|low_light/, n)) return { role: 'tail' }
  if (t(/glass_red/, n)) return { role: 'redLens' }
  if (t(/light_cup|mirror_0|_mirror/, n)) return { role: 'chrome' }
  if (t(/glass_large|^body_18_a/, n)) return { role: 'glass' }
  if (t(/glass|lens/, n)) return { role: 'lens' }
  if (t(/turnsig/, n)) return { role: 'lens' }
  if (t(/light_plastic_hg|light_decal|light_plastic/, n)) return { role: 'gloss' }

  // --- habitacle
  if (t(/yellow/, n)) return { role: 'yellow' } // repère jaune à 12 h du volant (S3)
  if (t(/display|degree/, n)) return { role: 'screen' }
  if (t(/stitch/, n)) return { role: 'stitch' }
  if (t(/belt|cinture/, n)) return { role: 'belt' }
  if (t(/int_carbon|ext_carbon/, n)) return { role: 'carbonSatin' }
  if (t(/alcantara|leather|fabric|carpet/, n)) return { role: 'interior' }
  if (t(/^(int_|dash_|seat_|door_[lr]_|sw_|airbag|key|button_bump|object026)/, n)) {
    if (t(/metal|alum|button_metal/, n)) return { role: 'aluDark' }
    return { role: 'interiorPlastic' }
  }

  // --- pièces techniques extérieures
  if (t(/^ext_hood_/, n)) return { role: t(/metal|screw/, n) ? 'aluDark' : 'under' } // radiateur central
  if (t(/undercarriage/, n)) return { role: 'under' }
  if (t(/grid/, n)) return { role: 'mesh' }
  if (t(/aluminium_dark|ext_metal_red|porshce|hood_08/, n)) return { role: 'aluDark' }
  if (t(/plastic_hg|plastic_large|object0\d\d_plastic_hood|wing_badge|highb_plastic/, n)) return { role: 'gloss' }
  if (t(/plasticred/, n)) return { role: 'redLens' }
  if (t(/rubber|matte_dark|black|plastic|plate|bbb/, n)) return { role: 'trim' }
  return { role: 'trim' }
}

/** Découpes géométriques appliquées au chargement (espace voiture, m).
 *  - volet supérieur de l'aileron : intégré au mesh de carrosserie dans le modèle source,
 *    on l'extrait pour l'animer (DRS / airbrake) et le passer en carbone (Weissach : « parties de l'aileron », S1) ;
 *  - coques supérieures des rétroviseurs (Weissach, S1). */
export const SPLITS = {
  wingFlap: (c: [number, number, number]) => c[2] < -1.84 && c[1] > 1.16,
  mirrorTop: (c: [number, number, number], ny: number) => Math.abs(c[0]) > 0.86 && c[1] > 0.86 && c[2] > 0.15 && c[2] < 0.95 && ny > 0.15,
}
