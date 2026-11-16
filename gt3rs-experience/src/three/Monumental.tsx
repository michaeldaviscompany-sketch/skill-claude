import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
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
  useFrame((_, dt) => {
    const shot = shotAt(frame.scrollY)
    const reveal = Math.min(1, Math.max(0, (frame.intro - 0.45) / 0.45))
    damp(level, 'current', shot.type * reveal, 0.35, dt)
    mat.opacity = level.current
    group.current.visible = level.current > 0.005
    group.current.position.y = -0.25 + level.current * 0.25
  })
  return (
    <group ref={group} position={[0, 0, -4.2]}>
      <Text
        font="/fonts/archivo-expanded-black.woff"
        fontSize={3.15}
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
