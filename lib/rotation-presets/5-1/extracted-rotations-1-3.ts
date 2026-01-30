// Rotations 1-3 - Extracted with Gemini from PDF

import type { RotationPreset } from '../schema'

export const rotation1: RotationPreset = {
  rotation: 1,

  home: {
    positions: {
      S: { x: 0.25, y: 0.92 },
      OH1: { x: 0.83, y: 0.75 },
      OH2: { x: 0.17, y: 0.75 },
      MB1: { x: 0.75, y: 0.67 },
      MB2: { x: 0.19, y: 0.85 },
      RS: { x: 0.67, y: 0.58 },
    },
  },

  serve: {
    positions: {
      S: { x: 0.83, y: 0.97 },    // Setter serving (back right, behind baseline)
      OH1: { x: 0.80, y: 0.57 },
      OH2: { x: 0.25, y: 0.70 },
      MB1: { x: 0.85, y: 0.63 },
      MB2: { x: 0.35, y: 0.67 },
      RS: { x: 0.62, y: 0.56 },
    },
    arrows: {
      MB2: { x: 0.50, y: 0.50 },
      OH1: { x: 0.25, y: 0.92 },
      OH2: { x: 0.33, y: 0.83 },
    },
  },

  serveReceivePrimary: {
    positions: {
      S: { x: 0.17, y: 0.92 },
      OH1: { x: 0.41, y: 0.62 },
      OH2: { x: 0.28, y: 0.57 },
      MB1: { x: 0.67, y: 0.66 },
      MB2: { x: 0.20, y: 0.58 },
      RS: { x: 0.83, y: 0.58 },
    },
    arrows: {
      MB1: { x: 0.38, y: 0.56 },
      OH1: { x: 0.38, y: 0.65 },
      OH2: { x: 0.39, y: 0.70 },
    },
  },

  serveReceiveAlternate: {
    positions: {
      S: { x: 0.83, y: 0.92 },
      OH1: { x: 0.88, y: 0.54 },
      OH2: { x: 0.10, y: 0.56 },
      MB1: { x: 0.50, y: 0.75 },
      MB2: { x: 0.25, y: 0.90 },
      RS: { x: 0.11, y: 0.54 },
    },
    arrows: {
      RS: { x: 0.50, y: 0.90 },
    },
  },

  base: {
    positions: {
      S: { x: 0.29, y: 0.88 },
      OH1: { x: 0.77, y: 0.60 },
      OH2: { x: 0.25, y: 0.89 },
      MB1: { x: 0.67, y: 0.67 },
      MB2: { x: 0.25, y: 0.58 },
      RS: { x: 0.83, y: 0.83 },
    },
  },
}


export const rotation2: RotationPreset = {
  rotation: 2,

  home: {
    positions: {
      S: { x: 0.25, y: 0.83 },
      OH1: { x: 0.35, y: 0.92 },
      OH2: { x: 0.75, y: 0.58 },
      MB1: { x: 0.83, y: 0.83 },
      MB2: { x: 0.26, y: 0.65 },
      RS: { x: 0.75, y: 0.67 },
    },
  },

  serve: {
    positions: {
      S: { x: 0.45, y: 0.93 },
      OH1: { x: 0.17, y: 0.97 },  // OH1 serving (back left, behind baseline)
      OH2: { x: 0.07, y: 0.88 },
      MB1: { x: 0.83, y: 0.66 },
      MB2: { x: 0.25, y: 0.62 },
      RS: { x: 0.67, y: 0.62 },
    },
  },

  serveReceivePrimary: {
    positions: {
      S: { x: 0.50, y: 0.61 },
      OH1: { x: 0.30, y: 0.85 },
      OH2: { x: 0.38, y: 0.62 },
      MB1: { x: 0.88, y: 0.70 },
      MB2: { x: 0.18, y: 0.73 },
      RS: { x: 0.67, y: 0.67 },
    },
    arrows: {
      OH1: { x: 0.60, y: 0.55 },
      S: { x: 0.75, y: 0.73 },
    },
  },

  serveReceiveAlternate: {
    positions: {
      S: { x: 0.62, y: 0.65 },
      OH1: { x: 0.15, y: 0.76 },
      OH2: { x: 0.17, y: 0.58 },
      MB1: { x: 0.38, y: 0.81 },
      MB2: { x: 0.24, y: 0.66 },
      RS: { x: 0.83, y: 0.75 },
    },
    arrows: {
      MB1: { x: 0.53, y: 0.72 },
      S: { x: 0.34, y: 0.75 },
      RS: { x: 0.75, y: 0.83 },
    },
  },

  base: {
    positions: {
      S: { x: 0.25, y: 0.92 },
      OH1: { x: 0.20, y: 0.70 },
      OH2: { x: 0.85, y: 0.58 },
      MB1: { x: 0.75, y: 0.67 },
      MB2: { x: 0.25, y: 0.62 },
      RS: { x: 0.83, y: 0.83 },
    },
  },
}


export const rotation3: RotationPreset = {
  rotation: 3,

  home: {
    positions: {
      S: { x: 0.25, y: 0.65 },
      OH1: { x: 0.25, y: 0.74 },
      OH2: { x: 0.83, y: 0.67 },
      MB1: { x: 0.25, y: 0.88 },
      MB2: { x: 0.83, y: 0.58 },
      RS: { x: 0.83, y: 0.83 },
    },
  },

  serve: {
    positions: {
      S: { x: 0.38, y: 0.68 },
      OH1: { x: 0.25, y: 0.75 },
      OH2: { x: 0.83, y: 0.58 },
      MB1: { x: 0.17, y: 0.97 },  // MB1 serving (back left, behind baseline)
      MB2: { x: 0.88, y: 0.58 },
      RS: { x: 0.83, y: 0.88 },
    },
    arrows: {
      OH1: { x: 0.10, y: 0.58 },
      MB1: { x: 0.15, y: 0.65 },
      OH2: { x: 0.00, y: 0.55 },
    },
  },

  serveReceivePrimary: {
    positions: {
      S: { x: 0.69, y: 0.53 },
      OH1: { x: 0.15, y: 0.80 },
      OH2: { x: 0.28, y: 0.59 },
      MB1: { x: 0.33, y: 0.81 },
      MB2: { x: 0.93, y: 0.55 },
      RS: { x: 0.83, y: 0.83 },
    },
    arrows: {
      OH2: { x: 0.58, y: 0.53 },
      MB2: { x: 0.85, y: 0.66 },
    },
  },

  serveReceiveAlternate: {
    positions: {
      S: { x: 0.75, y: 0.55 },
      OH1: { x: 0.31, y: 0.58 },
      OH2: { x: 0.83, y: 0.75 },
      MB1: { x: 0.25, y: 0.73 },
      MB2: { x: 0.89, y: 0.72 },
      RS: { x: 0.37, y: 0.89 },
    },
    arrows: {
      OH1: { x: 0.18, y: 0.76 },
      OH2: { x: 0.50, y: 0.58 },
      MB1: { x: 0.50, y: 0.58 },
      MB2: { x: 0.83, y: 0.58 },
      RS: { x: 0.50, y: 0.58 },
      S: { x: 0.50, y: 0.58 },
    },
  },

  base: {
    positions: {
      S: { x: 0.34, y: 0.88 },
      OH1: { x: 0.21, y: 0.77 },
      OH2: { x: 0.83, y: 0.58 },
      MB1: { x: 0.25, y: 0.67 },
      MB2: { x: 0.83, y: 0.67 },
      RS: { x: 0.83, y: 0.83 },
    },
  },
}

