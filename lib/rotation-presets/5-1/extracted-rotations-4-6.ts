// Rotations 4-6 - Extracted with Gemini from PDF

import type { RotationPreset } from '../schema'

export const rotation4: RotationPreset = {
  rotation: 4,

  home: {
    positions: {
      S: { x: 0.67, y: 0.58 },
      OH1: { x: 0.25, y: 0.67 },
      OH2: { x: 0.83, y: 0.75 },
      MB1: { x: 0.25, y: 0.75 },
      MB2: { x: 0.75, y: 0.75 },
      RS: { x: 0.25, y: 0.92 },
    },
  },

  serve: {
    positions: {
      S: { x: 0.50, y: 0.54 },
      OH1: { x: 0.25, y: 0.58 },
      OH2: { x: 0.75, y: 0.65 },
      MB1: { x: 0.25, y: 0.58 },
      MB2: { x: 0.83, y: 0.58 },
      RS: { x: 0.08, y: 0.87 },
    },
    arrows: {
      OH1: { x: 0.17, y: 1.00 },
      MB2: { x: 0.50, y: 0.50 },
    },
  },

  serveReceivePrimary: {
    positions: {
      S: { x: 0.83, y: 0.58 },
      OH1: { x: 0.24, y: 0.77 },
      OH2: { x: 0.26, y: 0.57 },
      MB1: { x: 0.25, y: 0.75 },
      MB2: { x: 0.69, y: 0.58 },
      RS: { x: 0.11, y: 0.96 },
    },
    arrows: {
      S: { x: 0.83, y: 0.75 },
      RS: { x: 0.25, y: 0.83 },
      MB2: { x: 0.67, y: 0.67 },
      OH1: { x: 0.50, y: 0.50 },
    },
  },

  serveReceiveAlternate: {
    positions: {
      S: { x: 0.63, y: 0.55 },
      OH1: { x: 0.25, y: 0.56 },
      OH2: { x: 0.75, y: 0.59 },
      MB1: { x: 0.23, y: 0.66 },
      MB2: { x: 0.83, y: 0.66 },
      RS: { x: 0.25, y: 0.88 },
    },
    arrows: {
      OH1: { x: 0.25, y: 0.59 },
      S: { x: 0.87, y: 0.75 },
      MB1: { x: 0.32, y: 0.58 },
      OH2: { x: 0.59, y: 0.56 },
      MB2: { x: 0.58, y: 0.65 },
    },
  },

  base: {
    positions: {
      S: { x: 0.75, y: 0.79 },
      OH1: { x: 0.26, y: 0.71 },
      OH2: { x: 0.83, y: 0.67 },
      MB1: { x: 0.25, y: 0.67 },
      MB2: { x: 0.75, y: 0.67 },
      RS: { x: 0.33, y: 0.86 },
    },
  },
}


export const rotation5: RotationPreset = {
  rotation: 5,

  home: {
    positions: {
      S: { x: 0.75, y: 0.67 },
      OH1: { x: 0.83, y: 0.58 },
      OH2: { x: 0.30, y: 0.90 },
      MB1: { x: 0.25, y: 0.58 },
      MB2: { x: 0.83, y: 0.83 },
      RS: { x: 0.27, y: 0.87 },
    },
  },

  serve: {
    positions: {
      S: { x: 0.63, y: 0.65 },
      OH1: { x: 0.88, y: 0.53 },
      OH2: { x: 0.17, y: 0.97 },  // OH2 serving (back left, behind baseline)
      MB1: { x: 0.25, y: 0.62 },
      MB2: { x: 0.83, y: 0.67 },
      RS: { x: 0.25, y: 0.88 },
    },
    arrows: {
      OH1: { x: 0.14, y: 0.87 },
    },
  },

  serveReceivePrimary: {
    positions: {
      S: { x: 0.78, y: 0.85 },
      OH1: { x: 0.38, y: 0.57 },
      OH2: { x: 0.27, y: 0.81 },
      MB1: { x: 0.25, y: 0.70 },
      MB2: { x: 0.68, y: 0.77 },
      RS: { x: 0.10, y: 0.93 },
    },
    arrows: {
      OH1: { x: 0.60, y: 0.50 },
      RS: { x: 0.17, y: 0.92 },
      MB2: { x: 0.88, y: 0.82 },
    },
  },

  serveReceiveAlternate: {
    positions: {
      S: { x: 0.67, y: 0.65 },
      OH1: { x: 0.83, y: 0.58 },
      OH2: { x: 0.18, y: 0.81 },
      MB1: { x: 0.25, y: 0.63 },
      MB2: { x: 0.83, y: 0.58 },
      RS: { x: 0.17, y: 0.83 },
    },
    arrows: {
      MB1: { x: 0.30, y: 0.80 },
      S: { x: 0.83, y: 0.58 },
      RS: { x: 0.31, y: 0.91 },
      OH2: { x: 0.18, y: 0.74 },
    },
  },

  base: {
    positions: {
      S: { x: 0.83, y: 0.83 },
      OH1: { x: 0.76, y: 0.56 },
      OH2: { x: 0.23, y: 0.70 },
      MB1: { x: 0.25, y: 0.67 },
      MB2: { x: 0.83, y: 0.75 },
      RS: { x: 0.28, y: 0.92 },
    },
  },
}


export const rotation6: RotationPreset = {
  rotation: 6,

  home: {
    positions: {
      S: { x: 0.75, y: 0.78 },
      OH1: { x: 0.75, y: 0.58 },
      OH2: { x: 0.25, y: 0.70 },
      MB1: { x: 0.75, y: 0.61 },
      MB2: { x: 0.25, y: 0.92 },
      RS: { x: 0.25, y: 0.63 },
    },
  },

  serve: {
    positions: {
      S: { x: 0.83, y: 0.67 },
      OH1: { x: 0.66, y: 0.58 },
      OH2: { x: 0.17, y: 0.58 },
      MB1: { x: 0.83, y: 0.58 },
      MB2: { x: 0.10, y: 0.95 },
      RS: { x: 0.25, y: 0.75 },
    },
    arrows: {
      RS: { x: 0.38, y: 0.62 },
    },
  },

  serveReceivePrimary: {
    positions: {
      S: { x: 0.83, y: 0.83 },
      OH1: { x: 0.39, y: 0.62 },
      OH2: { x: 0.28, y: 0.81 },
      MB1: { x: 0.67, y: 0.58 },
      MB2: { x: 0.50, y: 0.75 },
      RS: { x: 0.22, y: 0.88 },
    },
    arrows: {
      RS: { x: 0.17, y: 0.83 },
      OH2: { x: 0.17, y: 0.83 },
      MB1: { x: 0.83, y: 0.83 },
      MB2: { x: 0.50, y: 0.75 },
      OH1: { x: 0.50, y: 0.50 },
    },
  },

  serveReceiveAlternate: {
    positions: {
      S: { x: 0.88, y: 0.67 },
      OH1: { x: 0.50, y: 0.58 },
      OH2: { x: 0.25, y: 0.68 },
      MB1: { x: 0.80, y: 0.58 },
      MB2: { x: 0.25, y: 0.85 },
      RS: { x: 0.26, y: 0.63 },
    },
    arrows: {
      MB1: { x: 0.50, y: 0.50 },
    },
  },

  base: {
    positions: {
      S: { x: 0.75, y: 0.75 },
      OH1: { x: 0.83, y: 0.58 },
      OH2: { x: 0.24, y: 0.78 },
      MB1: { x: 0.75, y: 0.67 },
      MB2: { x: 0.28, y: 0.66 },
      RS: { x: 0.34, y: 0.87 },
    },
  },
}

