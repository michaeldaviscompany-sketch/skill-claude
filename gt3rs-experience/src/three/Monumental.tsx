import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { MeshPhysicalMaterial, type Group } from 'three'
import { damp } from 'maath/easing'
import { shotAt } from '../scroll/scroll'
import { frame } from '../store'

// Typographie monumentale DANS la scène : lettres en métal graphite qui
// captent les bandes lumineuses du studio et se reflètent dans le sol laqué.
export function Monumental() {
  const group = useRef<Group>(null!)
  const mat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: '#1a1b1e',
        metalness: 1,
        roughness: 0.28,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0,
        envMapIntensity: 1.4,
      }),
    [],
  )
  const level = useRef(0)
  const textRef = useRef<{ textRenderInfo?: { blockBounds: number[] } } | null>(null)
  const scale = useRef(1)
  const size = useThree((st) => st.size)
  useFrame(({ camera }, dt) => {
    const shot = shotAt(frame.scrollY)
    const reveal = Math.min(1, Math.max(0, (frame.intro - 0.45) / 0.45))
    damp(level, 'current', shot.type * reveal, 0.35, dt)
    mat.opacity = level.current
    group.current.visible = level.current > 0.005
    group.current.position.y = 0.05 + level.current * 0.2
    // la typographie occupe ~88 % de la largeur visible, quel que soit le format d'écran
    const bb = textRef.current?.textRenderInfo?.blockBounds
    if (bb) {
      const w = bb[2] - bb[0]
      const d = camera.position.distanceTo(group.current.position)
      const fov = ((camera as unknown as { fov: number }).fov * Math.PI) / 180
      const visW = 2 * d * Math.tan(fov / 2) * (size.width / size.height)
      damp(scale, 'current', Math.min(1.4, (0.88 * visW) / w), 0.3, dt)
      group.current.scale.setScalar(scale.current)
    }
  })
  return (
    <group ref={group} position={[0, 0, -4.2]}>
      <Text
        font="/fonts/archivo-expanded-black.woff"
        ref={textRef as never}
        fontSize={2.3}
        letterSpacing={-0.035}
        anchorX="center"
        anchorY="bottom"
        material={mat}
        position={[0, 0, 0]}
      >
        GT3 RS
      </Text>
    </group>
  )
}
