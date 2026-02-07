import type { ShaderId } from './shaders'

export interface ShaderParam {
  key: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
}

// Maps each shader to its adjustable parameters.
// Derived from @paper-design/shaders-react component props.
export const SHADER_PARAM_MAP: Partial<Record<ShaderId, ShaderParam[]>> = {
  'grain-gradient': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.2 },
    { key: 'softness', label: 'Softness', min: 0, max: 2, step: 0.05, defaultValue: 0.8 },
    { key: 'intensity', label: 'Intensity', min: 0, max: 1, step: 0.05, defaultValue: 0.4 },
    { key: 'noise', label: 'Noise', min: 0, max: 1, step: 0.05, defaultValue: 0.3 },
  ],
  'mesh-gradient': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
  ],
  'smoke-ring': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.3 },
    { key: 'noiseScale', label: 'Noise Scale', min: 0.5, max: 3, step: 0.1, defaultValue: 1.4 },
    { key: 'thickness', label: 'Thickness', min: 0.05, max: 1, step: 0.05, defaultValue: 0.25 },
  ],
  'neuro-noise': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
    { key: 'scale', label: 'Scale', min: 0.5, max: 5, step: 0.1, defaultValue: 1.5 },
    { key: 'brightness', label: 'Brightness', min: 0, max: 2, step: 0.05, defaultValue: 1.3 },
  ],
  'dot-orbit': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
    { key: 'dotSize', label: 'Dot Size', min: 0.1, max: 2, step: 0.05, defaultValue: 0.6 },
  ],
  'dot-grid': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.3 },
    { key: 'cellSize', label: 'Cell Size', min: 0.01, max: 0.1, step: 0.005, defaultValue: 0.04 },
    { key: 'dotSize', label: 'Dot Size', min: 0.1, max: 1, step: 0.05, defaultValue: 0.5 },
  ],
  'simplex-noise': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
    { key: 'scale', label: 'Scale', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
  ],
  'perlin-noise': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
    { key: 'scale', label: 'Scale', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
  ],
  'metaballs': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
  ],
  'waves': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
    { key: 'frequency', label: 'Frequency', min: 0.5, max: 5, step: 0.1, defaultValue: 2 },
    { key: 'amplitude', label: 'Amplitude', min: 0, max: 1, step: 0.05, defaultValue: 0.3 },
  ],
  'voronoi': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
    { key: 'scale', label: 'Scale', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
  ],
  'warp': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
    { key: 'scale', label: 'Scale', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
  ],
  'god-rays': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
  ],
  'spiral': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
  ],
  'swirl': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
    { key: 'scale', label: 'Scale', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
  ],
  'dithering': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
  ],
  'pulsing-border': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
  ],
  'color-panels': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
  ],
  'fluted-glass': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
    { key: 'frequency', label: 'Frequency', min: 1, max: 50, step: 1, defaultValue: 12 },
  ],
  'water': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.3 },
    { key: 'scale', label: 'Scale', min: 0.5, max: 5, step: 0.1, defaultValue: 1 },
  ],
  'liquid-metal': [
    { key: 'speed', label: 'Speed', min: 0, max: 2, step: 0.05, defaultValue: 0.25 },
  ],
}
