// Teintes extérieures RÉELLEMENT proposées sur la 911 GT3 RS (992).
// Noms et catégories : sources S6 (configurateur officiel) et S5 (newsroom).
// ⚠ Les valeurs hexadécimales sont des APPROXIMATIONS ARTISTIQUES pour le rendu
// temps réel : Porsche ne publie pas de référence colorimétrique écran.

export type Paint = {
  id: string
  name: string
  official: string
  group: 'Standard' | 'Spéciale' | 'Paint to Sample'
  hex: string
  metallic: boolean
  src: string
  note?: string
}

export const PAINTS: Paint[] = [
  { id: 'white', name: 'Blanc', official: 'White', group: 'Standard', hex: '#e8e8e4', metallic: false, src: 'S6' },
  { id: 'black', name: 'Noir', official: 'Black', group: 'Standard', hex: '#0a0b0c', metallic: false, src: 'S6' },
  { id: 'guards', name: 'Rouge Indien', official: 'Guards Red', group: 'Standard', hex: '#b3121c', metallic: false, src: 'S6' },
  { id: 'gtsilver', name: 'Argent GT métallisé', official: 'GT Silver Metallic', group: 'Spéciale', hex: '#a4a7aa', metallic: true, src: 'S6' },
  { id: 'icegrey', name: 'Gris Glace métallisé', official: 'Ice Grey Metallic', group: 'Spéciale', hex: '#7f8586', metallic: true, src: 'S6' },
  { id: 'arctic', name: 'Gris Arctique', official: 'Arctic Grey', group: 'Spéciale', hex: '#a3aaac', metallic: false, src: 'S6' },
  {
    id: 'python',
    name: 'Vert Python',
    official: 'Python Green',
    group: 'Paint to Sample',
    hex: '#5fb43a',
    metallic: false,
    src: 'S5',
    note: 'Teinte présentée par Porsche sur la GT3 RS 992 (Exclusive Manufaktur, Monterey 2022).',
  },
]

export const DEFAULT_PAINT = 'arctic'
