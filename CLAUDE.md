# Bibliothèque de Skills — Web & 3D

Ce dépôt embarque la bibliothèque de Skills de
`michaeldaviscompany-sketch/claude-skill`, installée dans `.claude/` pour être
chargée automatiquement par Claude Code :

- `.claude/skills/<nom>/SKILL.md` — 26 Skills (+ `references/`, `scripts/`, `assets/` starters)
- `.claude/agents/*.md` — 6 sous-agents spécialisés 3D

Mise à jour depuis la source : `./scripts/sync-skills.sh`

## Quel Skill pour quelle tâche

| Besoin | Skill(s) |
| --- | --- |
| Planifier un site 3D (stack, archi, budgets) | agent `threejs-architect`, `web3d-integration-patterns` |
| Démarrer un projet 3D (Vite + React + R3F) | `scaffold-3d-site` |
| Three.js vanilla | `threejs-webgl` |
| React Three Fiber | `react-three-fiber` (+ agent `r3f-engineer`) |
| Moteurs 3D alternatifs | `babylonjs-engine`, `playcanvas-engine` |
| VR / AR / WebXR | `aframe-webxr` |
| Post-processing (bloom, DOF…) | `add-postprocessing` |
| Shaders GLSL/TSL | agent `shader-artist` |
| 3D légère décorative (Zdog, Vanta, Tilt) | `lightweight-3d-effects` |
| Rendu 2D canvas / particules | `pixijs-2d` |
| Scroll-driven 3D (Lenis, ScrollTrigger, ScrollControls) | `scroll-3d-scene`, agent `motion-choreographer` |
| Animations GSAP / ScrollTrigger | `gsap-scrolltrigger` |
| Smooth scroll / parallaxe | `locomotive-scroll` |
| Reveal au scroll simple (AOS) | `scroll-reveal-libraries` |
| Transitions entre pages | `barba-js` |
| Animations React (Motion / Framer Motion) | `motion-framer` |
| Animations physiques (React Spring) | `react-spring-physics` |
| Timelines / SVG / stagger | `animejs` |
| Lottie (After Effects) | `lottie-animations` |
| Rive (state machines) | `rive-interactive` |
| Composants animés prêts (Magic UI, React Bits) | `animated-component-libraries` |
| Design web moderne, a11y, tendances | `modern-web-design` |
| Scènes Spline | `spline-interactive` |
| Export Blender → glTF | `blender-web-pipeline` |
| Textures PBR Substance 3D | `substance-3d-texturing` |
| Compression glTF/GLB, KTX2, Draco, gltfjsx | `optimize-3d-assets`, agent `asset-pipeline-engineer` |
| Performances WebGL (FPS, draw calls, mémoire) | agent `webgl-perf-auditor` |

## Conventions

- Avant d'écrire du code dans un domaine listé, lire le `SKILL.md` correspondant
  puis, au besoin, ses `references/`.
- Les `assets/starter_*` sont des modèles de projet à copier, pas à modifier sur place.
- Les scripts Python des Skills sont des générateurs d'exemples : les relire avant
  de les exécuter.
