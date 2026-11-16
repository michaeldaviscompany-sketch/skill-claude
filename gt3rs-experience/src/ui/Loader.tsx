import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'
import { useStore } from '../store'

/** Préchargement réel (progression des assets 3D) puis lever de rideau. */
export function Loader({ onDone }: { onDone: () => void }) {
  const { progress, errors } = useProgress()
  const ready = useStore((s) => s.ready)
  const [gone, setGone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const shown = useRef({ v: 0 })
  const num = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.to(shown.current, {
      v: progress,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => {
        const v = Math.round(shown.current.v)
        if (num.current) num.current.textContent = String(v).padStart(3, '0')
        if (bar.current) bar.current.style.transform = `scaleX(${shown.current.v / 100})`
      },
    })
  }, [progress])

  useEffect(() => {
    if (!ready || gone) return
    const tl = gsap.timeline({ delay: 0.4, onComplete: () => setGone(true) })
    tl.to('.loader__inner', { opacity: 0, y: -12, duration: 0.5, ease: 'power2.in' })
    tl.add(onDone, '-=0.1')
    tl.to(root.current, { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, '<')
    return () => {
      tl.kill()
    }
  }, [ready, gone, onDone])

  if (gone) return null
  return (
    <div className="loader" ref={root} role="status" aria-live="polite">
      <div className="loader__inner">
        <div className="loader__top">
          <span>911 GT3 RS</span>
          <span>Type 992</span>
        </div>
        <div className="loader__num">
          <span ref={num}>000</span>
        </div>
        <div className="loader__bar">
          <div ref={bar} />
        </div>
        <p className="loader__note">
          {errors.length
            ? 'Le modèle 3D n’a pas pu être chargé. Aucune image de substitution n’est affichée.'
            : 'Chargement du modèle 3D, des matériaux et de l’éclairage studio'}
        </p>
      </div>
    </div>
  )
}
