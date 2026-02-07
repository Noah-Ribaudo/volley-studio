export type ShaderId =
  | 'none'
  | 'grain-gradient'
  | 'mesh-gradient'
  | 'static-mesh-gradient'
  | 'static-radial-gradient'
  | 'smoke-ring'
  | 'neuro-noise'
  | 'dot-orbit'
  | 'dot-grid'
  | 'simplex-noise'
  | 'perlin-noise'
  | 'metaballs'
  | 'waves'
  | 'voronoi'
  | 'warp'
  | 'god-rays'
  | 'spiral'
  | 'swirl'
  | 'dithering'
  | 'pulsing-border'
  | 'color-panels'
  | 'paper-texture'
  | 'fluted-glass'
  | 'water'
  | 'liquid-metal'

// Performance cost 1-10:
// 1 = static, renders once — wouldn't bother a low-end phone
// 2-3 = simple animated — light on any device
// 4-5 = moderate — noticeable on older hardware
// 6-7 = heavy — will warm up a laptop
// 8-10 = very heavy — challenges even desktop GPUs
export const SHADER_OPTIONS: Array<{ id: ShaderId; label: string; cost: number }> = [
  { id: 'none',                   label: 'None',                   cost: 0 },
  { id: 'static-mesh-gradient',   label: 'Static Mesh Gradient',   cost: 1 },
  { id: 'static-radial-gradient', label: 'Static Radial Gradient', cost: 1 },
  { id: 'paper-texture',          label: 'Paper Texture',          cost: 1 },
  { id: 'dithering',              label: 'Dithering',              cost: 2 },
  { id: 'color-panels',           label: 'Color Panels',           cost: 2 },
  { id: 'pulsing-border',         label: 'Pulsing Border',         cost: 2 },
  { id: 'grain-gradient',         label: 'Grain Gradient',         cost: 3 },
  { id: 'dot-grid',               label: 'Dot Grid',               cost: 3 },
  { id: 'waves',                  label: 'Waves',                  cost: 3 },
  { id: 'spiral',                 label: 'Spiral',                 cost: 4 },
  { id: 'swirl',                  label: 'Swirl',                  cost: 4 },
  { id: 'simplex-noise',          label: 'Simplex Noise',          cost: 4 },
  { id: 'perlin-noise',           label: 'Perlin Noise',           cost: 4 },
  { id: 'dot-orbit',              label: 'Dot Orbit',              cost: 4 },
  { id: 'mesh-gradient',          label: 'Mesh Gradient',          cost: 5 },
  { id: 'neuro-noise',            label: 'Neuro Noise',            cost: 5 },
  { id: 'god-rays',               label: 'God Rays',               cost: 5 },
  { id: 'smoke-ring',             label: 'Smoke Ring',             cost: 6 },
  { id: 'voronoi',                label: 'Voronoi',                cost: 6 },
  { id: 'warp',                   label: 'Warp',                   cost: 6 },
  { id: 'fluted-glass',           label: 'Fluted Glass',           cost: 7 },
  { id: 'metaballs',              label: 'Metaballs',              cost: 7 },
  { id: 'water',                  label: 'Water',                  cost: 7 },
  { id: 'liquid-metal',           label: 'Liquid Metal',           cost: 8 },
]
