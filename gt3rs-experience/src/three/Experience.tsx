import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor, Preload } from '@react-three/drei'
import { Car } from './Car'
import { CameraRig } from './CameraRig'
import { Cyclorama, Floor, SpeedStreaks, StudioEnvironment } from './Studio'
import { Effects } from './Effects'
import { Monumental } from './Monumental'
import { useStore } from '../store'

function ReadySignal() {
  const set = useStore((s) => s.set)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    set({ ready: true })
    // expose des métriques pour les tests de performance
    ;(window as unknown as { __gl: unknown }).__gl = gl
  }, [set, gl])
  return null
}

export function Experience() {
  const quality = useStore((s) => s.quality)
  const set = useStore((s) => s.set)
  return (
    <Canvas
      className="gl"
      flat
      dpr={quality === 'high' ? [1, 1.75] : [0.75, 1.25]}
      camera={{ position: [0, 0.75, 9.8], fov: 24, near: 0.05, far: 200 }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
    >
      <PerformanceMonitor onDecline={() => set({ quality: 'low' })} flipflops={2} />
      <AdaptiveDpr pixelated={false} />
      <fog attach="fog" args={['#050506', 13, 34]} />
      <Cyclorama />
      <StudioEnvironment />
      <Suspense fallback={null}>
        <Car />
        <ReadySignal />
        <Preload all />
      </Suspense>
      <Suspense fallback={null}>
        <Monumental />
      </Suspense>
      <Floor />
      <SpeedStreaks />
      <CameraRig />
      <Effects />
    </Canvas>
  )
}
