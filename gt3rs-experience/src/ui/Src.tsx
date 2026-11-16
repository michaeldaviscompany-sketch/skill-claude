import { sourceById } from '../data/sources'

/** Pastille de source : toute donnée chiffrée renvoie à sa source officielle. */
export function Src({ id }: { id: string }) {
  const s = sourceById(id)
  if (!s) return null
  return (
    <a className="src" href={`#src-${id}`} title={`${s.publisher} — ${s.label}`} aria-label={`Source ${id} : ${s.label}`}>
      {id}
    </a>
  )
}

/** Marqueur des éléments d'interprétation artistique (non issus de données). */
export function Art({ children = 'Interprétation artistique' }: { children?: string }) {
  return <span className="art">✦ {children}</span>
}
