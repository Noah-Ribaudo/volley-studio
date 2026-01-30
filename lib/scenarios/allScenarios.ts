import type { Scenario, ScenarioCollection } from './types'

/**
 * Serve Receive Scenarios
 * Practice receiving serves in various rotations
 */
export const serveReceiveScenarios: Scenario[] = [
  {
    id: 'sr-r1-basic',
    title: 'Rotation 1: Basic Serve Receive',
    description: 'Standard 3-person passing formation with setter in zone 1.',
    category: 'serve-receive',
    difficulty: 'beginner',
    tags: ['rotation-1', 'setter-back', 'passing'],
    rotation: 1,
    phase: 'SERVE_RECEIVE',
    isReceiving: true,
    highlightRole: 'S',
    focusPoints: [
      'Setter releases to target position near the net',
      'Three passers (OH1, OH2, OPP) form a triangle',
      'Middle blockers stay out of the passing pattern',
    ],
    coachingTips: [
      'Have passers call the ball early',
      'Setter should be moving before the pass is made',
    ],
  },
  {
    id: 'sr-r4-setter-front',
    title: 'Rotation 4: Setter in Front Row',
    description: 'Serve receive with setter already at the net.',
    category: 'serve-receive',
    difficulty: 'beginner',
    tags: ['rotation-4', 'setter-front', 'passing'],
    rotation: 4,
    phase: 'SERVE_RECEIVE',
    isReceiving: true,
    highlightRole: 'S',
    focusPoints: [
      'Setter is already near target - less travel',
      'Only 2 front-row attackers available',
      'Back-row attack becomes more important',
    ],
    coachingTips: [
      'Use the opposite for back-row attacks from zone 1',
      'Setter can be more deceptive with less movement',
    ],
  },
  {
    id: 'sr-r3-setter-release',
    title: 'Rotation 3: Long Setter Release',
    description: 'Setter must travel the longest distance to target.',
    category: 'serve-receive',
    difficulty: 'intermediate',
    tags: ['rotation-3', 'setter-back', 'setter-release'],
    rotation: 3,
    phase: 'SERVE_RECEIVE',
    isReceiving: true,
    highlightRole: 'S',
    focusPoints: [
      'Setter has the longest run from zone 2 to target',
      'Pass must be high and to target to give setter time',
      'Middle blocker transition is critical',
    ],
    commonMistakes: [
      'Passing too low for setter to reach',
      'Setter releasing too early and getting in passing lane',
    ],
  },
]

/**
 * Transition Offense Scenarios
 * Practice moving from defense to attack
 */
export const transitionScenarios: Scenario[] = [
  {
    id: 'trans-basic-set',
    title: 'In-System Transition',
    description: 'Perfect pass allows all attack options.',
    category: 'transition',
    difficulty: 'beginner',
    tags: ['in-system', 'setting', 'attack-options'],
    rotation: 1,
    phase: 'SET_PHASE',
    isReceiving: true,
    focusPoints: [
      'Setter has time to set any hitter',
      'Middle is available for quick attack',
      'All front-row hitters can attack',
    ],
    coachingTips: [
      'Practice reading the setter\'s shoulders',
      'Hitters should approach every time',
    ],
  },
  {
    id: 'trans-out-of-system',
    title: 'Out-of-System Attack',
    description: 'Bad pass limits attack options to outside.',
    category: 'transition',
    difficulty: 'intermediate',
    tags: ['out-of-system', 'emergency', 'outside-attack'],
    rotation: 2,
    phase: 'ATTACK_PHASE',
    isReceiving: true,
    highlightRole: 'OH1',
    focusPoints: [
      'When pass is off-target, outside hitter becomes primary',
      'Middle attack is usually not available',
      'High ball to antenna gives hitter time',
    ],
    commonMistakes: [
      'Trying to force the middle attack',
      'Setting too fast when out of system',
    ],
  },
]

/**
 * Defense Scenarios
 * Practice defensive positioning and responsibilities
 */
export const defenseScenarios: Scenario[] = [
  {
    id: 'def-perimeter',
    title: 'Perimeter Defense',
    description: 'Standard perimeter defense against outside attack.',
    category: 'defense',
    difficulty: 'beginner',
    tags: ['perimeter', 'dig', 'coverage'],
    rotation: 1,
    phase: 'DEFENSE_PHASE',
    isReceiving: false,
    focusPoints: [
      'Back row players spread to corners',
      'Off-blocker drops to cover tip',
      'Middle back reads the attacker',
    ],
    coachingTips: [
      'Stay low and balanced',
      'Read the hitter\'s arm, not the ball',
    ],
  },
  {
    id: 'def-rotation-base',
    title: 'Rotation Defense Base',
    description: 'Base positions before opponent attacks.',
    category: 'defense',
    difficulty: 'intermediate',
    tags: ['base-position', 'read', 'anticipation'],
    rotation: 3,
    phase: 'DEFENSE_PHASE',
    isReceiving: false,
    focusPoints: [
      'Everyone starts in base position',
      'Read the set to determine movement',
      'Block sets the defense',
    ],
    commonMistakes: [
      'Committing too early',
      'Not watching the setter',
    ],
  },
]

/**
 * Overlap Rule Scenarios
 * Practice understanding legal positioning
 */
export const overlapScenarios: Scenario[] = [
  {
    id: 'overlap-r1-legal',
    title: 'Rotation 1: Legal Positioning',
    description: 'See how players stay legal while setting up offense.',
    category: 'overlap-rules',
    difficulty: 'beginner',
    tags: ['overlap', 'rotation-1', 'legal'],
    rotation: 1,
    phase: 'PRE_SERVE',
    isReceiving: true,
    focusPoints: [
      'Front row must be in front of their back row pair',
      'Left-to-right order must be maintained',
      'Diagonal players have no overlap relationship',
    ],
    coachingTips: [
      'Use visual markers on the court',
      'Practice the release timing',
    ],
  },
  {
    id: 'overlap-r5-stack',
    title: 'Rotation 5: Setter Stack',
    description: 'Complex stack with setter and middle.',
    category: 'overlap-rules',
    difficulty: 'advanced',
    tags: ['overlap', 'rotation-5', 'stack', 'setter-front'],
    rotation: 5,
    phase: 'PRE_SERVE',
    isReceiving: true,
    highlightRole: 'S',
    focusPoints: [
      'Setter stacks tight to middle',
      'Must stay right of zone 3 player',
      'Release happens on serve contact',
    ],
    commonMistakes: [
      'Releasing before serve contact',
      'Crossing the left-right boundary',
    ],
  },
]

/**
 * Game Situation Scenarios
 * Specific game moments to practice
 */
export const gameSituationScenarios: Scenario[] = [
  {
    id: 'game-sideout',
    title: 'Sideout Situation',
    description: 'Must score to get serve back.',
    category: 'game-situation',
    difficulty: 'intermediate',
    tags: ['sideout', 'pressure', 'receiving'],
    rotation: 2,
    phase: 'SERVE_RECEIVE',
    isReceiving: true,
    focusPoints: [
      'Clean pass is the priority',
      'Run your best play',
      'Stay calm under pressure',
    ],
    coachingTips: [
      'Practice high-pressure sideout situations',
      'Have a go-to play for each rotation',
    ],
  },
  {
    id: 'game-serving-lead',
    title: 'Serving with a Lead',
    description: 'You\'re ahead and serving - maintain pressure.',
    category: 'game-situation',
    difficulty: 'intermediate',
    tags: ['serving', 'momentum', 'pressure'],
    rotation: 6,
    phase: 'PRE_SERVE',
    isReceiving: false,
    focusPoints: [
      'Aggressive but smart serving',
      'Target their weak passers',
      'Defense ready for transition',
    ],
    coachingTips: [
      'Don\'t let up the pressure',
      'Have serving targets for each rotation',
    ],
  },
]

// All scenarios combined
export const allScenarios: Scenario[] = [
  ...serveReceiveScenarios,
  ...transitionScenarios,
  ...defenseScenarios,
  ...overlapScenarios,
  ...gameSituationScenarios,
]

// Pre-built collections
export const scenarioCollections: ScenarioCollection[] = [
  {
    id: 'serve-receive-basics',
    title: 'Serve Receive Basics',
    description: 'Master the fundamentals of serve receive in all rotations.',
    scenarios: serveReceiveScenarios,
  },
  {
    id: 'transition-offense',
    title: 'Transition Offense',
    description: 'Learn to attack after receiving or digging.',
    scenarios: transitionScenarios,
  },
  {
    id: 'defensive-systems',
    title: 'Defensive Systems',
    description: 'Understand defensive positioning and responsibilities.',
    scenarios: defenseScenarios,
  },
  {
    id: 'overlap-mastery',
    title: 'Overlap Rules Mastery',
    description: 'Never get called for an overlap again.',
    scenarios: overlapScenarios,
  },
  {
    id: 'game-situations',
    title: 'Game Situations',
    description: 'Practice specific high-pressure moments.',
    scenarios: gameSituationScenarios,
  },
]

// Helper functions
export function getScenarioById(id: string): Scenario | undefined {
  return allScenarios.find(s => s.id === id)
}

export function getScenariosByCategory(category: string): Scenario[] {
  return allScenarios.filter(s => s.category === category)
}

export function getScenariosByDifficulty(difficulty: string): Scenario[] {
  return allScenarios.filter(s => s.difficulty === difficulty)
}

export function searchScenarios(query: string): Scenario[] {
  const lowerQuery = query.toLowerCase()
  return allScenarios.filter(s =>
    s.title.toLowerCase().includes(lowerQuery) ||
    s.description.toLowerCase().includes(lowerQuery) ||
    s.tags.some(t => t.toLowerCase().includes(lowerQuery))
  )
}
