// Sources officielles utilisées pour TOUTES les données techniques du site.
// Chaque donnée affichée référence une de ces sources par son identifiant.

export type Source = {
  id: string
  label: string
  publisher: string
  date: string
  url: string
  note?: string
}

export const SOURCES: Source[] = [
  {
    id: 'S1',
    label: 'Purpose-built for performance: the new Porsche 911 GT3 RS',
    publisher: 'Porsche Newsroom (communiqué de presse officiel)',
    date: '17.08.2022',
    url: 'https://newsroom.porsche.com/en_AU/2022/products/porsche-911-gt3-rs-world-premiere-29440.html',
  },
  {
    id: 'S2',
    label: 'Porsche präsentiert den neuen 911 GT3 RS',
    publisher: 'Porsche Newsroom Deutschland',
    date: '17.08.2022',
    url: 'https://newsroom.porsche.com/de/2022/produkte/porsche-911-gt3-rs-weltpremiere-29178.html',
    note: 'Consommation WLTP et prix Allemagne.',
  },
  {
    id: 'S3',
    label: 'The new Porsche 911 GT3 RS (992) — Press Kit',
    publisher: 'Porsche Cars North America (dossier de presse officiel)',
    date: '2022',
    url: 'https://newsroom.porsche.com/dam/jcr:46a23375-e7ee-4507-a577-d9761b784d33/992%20911%20GT3%20RS%20Press%20Kit%201.pdf',
    note: 'Régime maxi, Cd, Porsche Active Aerodynamics, commandes au volant.',
  },
  {
    id: 'S4',
    label: '911 GT3 RS — tour de la Nordschleife en 6:49.328 min',
    publisher: 'Porsche Newsroom',
    date: '2022',
    url: 'https://newsroom.porsche.com/en_AU/2022/products/porsche-911-gt3-rs-dream-lap-nuerburgring-nordschleife-30030.html',
  },
  {
    id: 'S5',
    label: '911 GT3 RS tribute to 50 years of the Carrera RS 2.7 (Monterey Car Week)',
    publisher: 'Porsche Newsroom',
    date: '2022',
    url: 'https://newsroom.porsche.com/en_AU/2022/products/porsche-911-gt3-rs-tribute-50-years-carrera-rs-27-monterey-car-week-usa-29464.html',
    note: 'GT3 RS blanc et Python Green (Porsche Exclusive Manufaktur).',
  },
  {
    id: 'S6',
    label: 'Porsche Car Configurator — 911 GT3 RS (code modèle 992850)',
    publisher: 'Porsche AG',
    date: 'consulté le 16.11.2026',
    url: 'https://configurator.porsche.com/en-WW/mode/model/992850',
    note: 'Palette standard et couleurs spéciales. L’offre varie selon les marchés.',
  },
  {
    id: 'S7',
    label: 'Fiche technique 911 GT3 RS (S22_3515)',
    publisher: 'Porsche AG',
    date: '2022',
    url: 'https://download.newsroom.porsche.com/dam/jcr:1d390f77-93c3-49c0-89c7-634f5f02b26a/S22_3515_en.pdf',
    note: 'Couple, cylindrée, 0–160 km/h. Recoupé avec S3 (342 lb-ft).',
  },
]

export const sourceById = (id: string) => SOURCES.find((s) => s.id === id)
