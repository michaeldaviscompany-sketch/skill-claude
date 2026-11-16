// Données techniques VÉRIFIÉES — chaque entrée cite sa source (voir sources.ts).
// Aucun chiffre de ce fichier n'est estimé ou inventé.

export type Fact = { value: string; unit?: string; label: string; src: string }

export const KEY_FIGURES: Fact[] = [
  { value: '386', unit: 'kW', label: '525 PS à 8 500 tr/min', src: 'S1' },
  { value: '9 000', unit: 'tr/min', label: 'Régime maximal', src: 'S3' },
  { value: '3,2', unit: 's', label: '0 – 100 km/h', src: 'S1' },
  { value: '296', unit: 'km/h', label: 'Vitesse maximale, en 7e', src: 'S1' },
]

export type DesignItem = {
  id: string
  index: string
  title: string
  body: string
  facts: Fact[]
  /** point d'ancrage du repère 3D (espace voiture, mètres) */
  anchor: [number, number, number]
}

export const DESIGN: DesignItem[] = [
  {
    id: 'wing',
    index: '02.1',
    title: 'Aileron col de cygne',
    body:
      'Un plan principal fixe et un volet supérieur à commande hydraulique, suspendus par le dessus. Pour la première fois sur une Porsche de série, le bord supérieur de l’aileron dépasse la ligne du toit.',
    facts: [
      { value: '+40', unit: '%', label: 'de surface vs 991 II', src: 'S3' },
      { value: '2', unit: 'plans', label: 'fixe + mobile (hydraulique)', src: 'S1' },
    ],
    anchor: [0, 1.32, -1.95],
  },
  {
    id: 'nostrils',
    index: '02.2',
    title: 'Radiateur central',
    body:
      'Hérité de la 911 RSR victorieuse au Mans : un grand radiateur unique, incliné, logé à la place du coffre avant. L’air chaud s’échappe par les naseaux du capot ; l’espace libéré sur les côtés accueille l’aérodynamique active.',
    facts: [
      { value: '1', unit: 'radiateur', label: 'au lieu de trois', src: 'S1' },
      { value: 'CFRP', label: 'capot avant, −1 kg vs aluminium', src: 'S3' },
    ],
    anchor: [0, 0.95, 1.45],
  },
  {
    id: 'louvres',
    index: '02.3',
    title: 'Ouïes d’ailes & prises GT1',
    body:
      'Des louvres percent les ailes avant pour évacuer la pression des passages de roues. Derrière la roue, des entrées d’air inspirées de la 911 GT1 de 1998 et des sideblades guident le flux vers l’extérieur.',
    facts: [
      { value: '+29', unit: 'mm', label: 'de voie avant vs 911 GT3', src: 'S1' },
      { value: '≈ 40', unit: 'kg', label: 'd’appui avant dus aux bras profilés', src: 'S1' },
    ],
    anchor: [0.86, 0.82, 1.15],
  },
  {
    id: 'fins',
    index: '02.4',
    title: 'Ailettes de toit',
    body:
      'Les ailettes du toit dévient l’air vers l’extérieur pour que l’admission, située sous l’aileron, respire un air plus frais. Les ouvertures des flancs arrière ne servent qu’à l’aérodynamique et au refroidissement des freins.',
    facts: [
      { value: 'CFRP', label: 'toit, portes, ailes avant, capot', src: 'S1' },
      { value: '1 450', unit: 'kg', label: 'poids à vide DIN', src: 'S1' },
    ],
    anchor: [0.45, 1.3, -0.35],
  },
  {
    id: 'diffuser',
    index: '02.5',
    title: 'Diffuseur & soubassement',
    body:
      'Soubassement entièrement caréné, ailettes redessinées. Le diffuseur arrière dérive de celui de la 911 GT3, légèrement adapté. Des prises d’air sous la caisse refroidissent la boîte PDK.',
    facts: [
      { value: '409', unit: 'kg', label: 'd’appui à 200 km/h', src: 'S1' },
      { value: '860', unit: 'kg', label: 'd’appui à 285 km/h', src: 'S1' },
    ],
    anchor: [0, 0.3, -2.1],
  },
]

export type EngineeringTopic = {
  id: 'aero' | 'chassis' | 'engine' | 'brakes'
  index: string
  title: string
  lead: string
  points: { text: string; src: string }[]
}

export const ENGINEERING: EngineeringTopic[] = [
  {
    id: 'aero',
    index: '03.1',
    title: 'Porsche Active Aerodynamics',
    lead:
      'Volets avant à moteurs électriques, volet supérieur d’aileron hydraulique : la position des ailes est ajustée en continu selon la vitesse, la situation et le mode.',
    points: [
      { text: 'Niveau « faible appui » par défaut : ailes à plat, Cd minimal de 0,39.', src: 'S3' },
      { text: 'DRS : une première sur une Porsche de série. Auto‑DRS au‑delà de 100 km/h (62 mph) et 95 % d’accélérateur.', src: 'S3' },
      { text: 'Airbrake : lors d’un freinage d’urgence à haute vitesse, ailes avant et arrière braquées au maximum.', src: 'S1' },
      { text: '2× l’appui de la 991 II, 3× celui de la 911 GT3 actuelle.', src: 'S1' },
    ],
  },
  {
    id: 'chassis',
    index: '03.2',
    title: 'Châssis réglable depuis le volant',
    lead:
      'Double triangulation avant à bras en profil de goutte d’eau, essieu arrière multibras aux raideurs revues, anti‑plongée renforcé.',
    points: [
      { text: 'Trois modes : Normal, Sport, Track. En Track, chaque réglage est individualisable.', src: 'S1' },
      { text: 'PASM : détente et compression avant/arrière séparément, de −4 à +4.', src: 'S3' },
      { text: 'PTV Plus : verrouillage du différentiel arrière en traction/retenue, de −4 à +4.', src: 'S3' },
      { text: 'ESC et TC multi‑niveaux, désactivables.', src: 'S3' },
    ],
  },
  {
    id: 'engine',
    index: '03.3',
    title: 'Flat‑six 4.0 atmosphérique',
    lead:
      'Six cylindres à plat, lubrification à carter sec, papillons individuels et distribution rigide à culbuteurs issus de la compétition.',
    points: [
      { text: '386 kW (525 PS) à 8 500 tr/min, 9 000 tr/min au rupteur.', src: 'S3' },
      { text: '465 Nm à 6 300 tr/min — 3 996 cm³.', src: 'S7' },
      { text: 'Nouveaux arbres à cames aux profils modifiés.', src: 'S1' },
      { text: 'PDK 7 rapports, démultiplication raccourcie vs 911 GT3.', src: 'S1' },
      { text: 'Admission uniquement par les prises situées sous le double aileron.', src: 'S3' },
    ],
  },
  {
    id: 'brakes',
    index: '03.4',
    title: 'Freinage',
    lead: 'Étriers fixes monobloc en aluminium. Roues forgées à écrou central de série.',
    points: [
      { text: 'Avant : disques 408 mm, 6 pistons ; pistons portés de 30 à 32 mm, disques de 34 à 36 mm.', src: 'S1' },
      { text: 'Arrière : disques 380 mm, 4 pistons.', src: 'S1' },
      { text: 'PCCB en option : 410 mm avant, 390 mm arrière.', src: 'S1' },
      { text: 'Pneus 275/35 R 20 à l’avant, 335/30 R 21 à l’arrière.', src: 'S1' },
    ],
  },
]

/** Commandes au volant, plages officielles (S3). */
export const STEERING_CONTROLS = [
  { id: 'pasm', label: 'PASM', sub: 'Amortissement', min: -4, max: 4, src: 'S3' },
  { id: 'ptv', label: 'PTV Plus', sub: 'Différentiel', min: -4, max: 4, src: 'S3' },
] as const

export const DRIVE_MODES = ['Normal', 'Sport', 'Track'] as const

export const PERFORMANCE = {
  power: { kw: 386, ps: 525, rpm: 8500, src: 'S1' },
  redline: { rpm: 9000, src: 'S3' },
  torque: { nm: 465, rpm: 6300, src: 'S7' },
  accel: { s: 3.2, src: 'S1' },
  accel160: { s: 6.9, src: 'S7' },
  vmax: { kmh: 296, src: 'S1' },
  downforce: [
    { kmh: 200, kg: 409, src: 'S1' },
    { kmh: 285, kg: 860, src: 'S1' },
  ],
  weight: { kg: 1450, src: 'S1' },
  nordschleife: { time: '6:49.328', km: 20.8, driver: 'Jörg Bergmeister', delta: '10,6 s plus rapide que la 911 GT3', src: 'S4' },
  wltp: { l100: 13.2, co2: 299, cls: 'G', src: 'S2' },
  priceDE: { eur: '229 517 €', src: 'S2' },
}

export const WEISSACH = {
  exterior: 'Capot avant, toit, parties de l’aileron et coques supérieures des rétroviseurs en carbone apparent.',
  items: [
    { text: 'Barres antiroulis avant et arrière, biellettes arrière et panneau de cisaillement en CFRP.', src: 'S1' },
    { text: 'Arceau en CFRP — une première — environ 6 kg de moins que l’arceau acier.', src: 'S1' },
    { text: 'Palettes PDK en magnésium à technologie magnétique issue de la compétition.', src: 'S3' },
    { text: 'Jantes forgées en magnésium en option : 8 kg de moins.', src: 'S1' },
  ],
}

export const CLUBSPORT = {
  text: 'Pack Clubsport sans supplément (marchés européens) : arceau acier, extincteur, harnais six points côté conducteur.',
  src: 'S1',
}
