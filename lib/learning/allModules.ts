import type { Lesson } from './types'

/**
 * Module 1: What is 5-1?
 * Introduction to 5-1 system
 */
export const module1: Lesson = {
  id: 'module-1-what-is-5-1',
  title: 'What is 5-1?',
  description: 'Learn what makes 5-1 volleyball different from what you might have played before.',
  estimatedTime: '5 min',

  steps: [
    {
      id: 'intro-1',
      content: "Let's learn about 5-1 volleyball.",
      subtitle: "It's simpler than it sounds, I promise.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
    },
    {
      id: 'players-1',
      content: 'See those 6 players? Each one has a specific job.',
      subtitle: 'In recreational volleyball, everyone kind of does everything. Not here.',
      advance: 'tap',
    },
    {
      id: 'players-2',
      content: "One of them is the setter—the person who touches the ball second.",
      subtitle: 'They set up every attack. Everything revolves around them.',
      advance: 'tap',
      highlightRole: 'S',
    },
    {
      id: 'players-3',
      content: 'The "5" in 5-1 means there are 5 hitters.',
      subtitle: 'Two outside hitters, two middle blockers, and one opposite.',
      advance: 'tap',
    },
    {
      id: 'players-4',
      content: 'The "1" means there\'s just 1 setter.',
      subtitle: "That's it. That's what 5-1 means: 5 hitters + 1 setter.",
      advance: 'tap',
      highlightRole: 'S',
    },
    {
      id: 'rotation-1',
      content: 'Now, here\'s the twist: everyone rotates.',
      subtitle: 'After every time your team wins the serve back, you rotate one spot clockwise.',
      advance: 'tap',
    },
    {
      id: 'rotation-2',
      content: "This is Rotation 1. The setter starts in the back right.",
      advance: 'auto',
      autoAdvanceDelay: 1500,
      rotation: 1,
      highlightRole: 'S',
    },
    {
      id: 'rotation-3',
      content: "In Rotation 2, everyone has shifted one spot.",
      advance: 'auto',
      autoAdvanceDelay: 1500,
      rotation: 2,
      highlightRole: 'S',
    },
    {
      id: 'rotation-4',
      content: "Rotation 3...",
      advance: 'auto',
      autoAdvanceDelay: 1200,
      rotation: 3,
      highlightRole: 'S',
    },
    {
      id: 'rotation-5',
      content: "Rotation 4—now the setter is in the front row.",
      subtitle: "This is an important distinction we'll come back to.",
      advance: 'auto',
      autoAdvanceDelay: 2000,
      rotation: 4,
      highlightRole: 'S',
    },
    {
      id: 'rotation-6',
      content: "Rotation 5...",
      advance: 'auto',
      autoAdvanceDelay: 1200,
      rotation: 5,
      highlightRole: 'S',
    },
    {
      id: 'rotation-7',
      content: "And Rotation 6. Then it loops back to 1.",
      advance: 'tap',
      rotation: 6,
      highlightRole: 'S',
    },
    {
      id: 'insight-1',
      content: "Here's the key insight:",
      subtitle: "Don't think about rotation numbers. Think about where the setter is.",
      advance: 'tap',
      rotation: 1,
      highlightRole: 'S',
    },
    {
      id: 'insight-2',
      content: '"Setter in zone 1" is more useful than "Rotation 1."',
      subtitle: "Once you know where the setter is, everything else falls into place.",
      advance: 'tap',
      rotation: 1,
      highlightRole: 'S',
    },
    {
      id: 'insight-3',
      content: "There are really only two situations:",
      advance: 'tap',
    },
    {
      id: 'insight-4',
      content: "Setter in back row (Rotations 1, 2, 3) = 3 hitters up front.",
      subtitle: "More attack options, but the setter has to travel to get to their spot.",
      advance: 'tap',
      rotation: 1,
      highlightRole: 'S',
    },
    {
      id: 'insight-5',
      content: "Setter in front row (Rotations 4, 5, 6) = 2 hitters up front.",
      subtitle: "Fewer attack options, but the setter is already near the net.",
      advance: 'tap',
      rotation: 4,
      highlightRole: 'S',
    },
    {
      id: 'rally-1',
      content: "One more thing: positioning changes during each rally.",
      subtitle: "Where you stand at the serve is different from where you go to attack.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
    },
    {
      id: 'rally-2',
      content: "Before the serve, everyone has to stay in their rotation spots.",
      subtitle: "There are rules about not crossing each other. We'll cover those later.",
      advance: 'tap',
      phase: 'PRE_SERVE',
    },
    {
      id: 'rally-3',
      content: "But as soon as the ball is served? Everyone moves to their real positions.",
      subtitle: "The setter rushes to the net. Hitters get ready to attack.",
      advance: 'tap',
      phase: 'SET_PHASE',
    },
    {
      id: 'rally-4',
      content: "This is the magic of 5-1: everyone specializes.",
      subtitle: "The setter always sets. The hitters always hit. No matter the rotation.",
      advance: 'tap',
    },
    {
      id: 'wrapup-1',
      content: "That's the foundation.",
      subtitle: "5 hitters, 1 setter, 6 rotations, and a lot of moving around.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
    },
    {
      id: 'wrapup-2',
      content: "Next up: we'll pick a position and walk through a full rotation together.",
      subtitle: "You'll see exactly where you need to be and when.",
      advance: 'tap',
    },
    {
      id: 'complete',
      content: "Nice work! You've completed Module 1.",
      subtitle: "Ready to dive deeper? Let's pick your role.",
      advance: 'tap',
    },
  ],
}

/**
 * Module 2: Your First Rotation
 * Walk through Rotation 1 from a specific role's perspective
 */
export const module2: Lesson = {
  id: 'module-2-first-rotation',
  title: 'Your First Rotation',
  description: 'Follow one position through a complete rally.',
  estimatedTime: '10-15 min',

  steps: [
    {
      id: 'role-intro',
      content: "Let's learn by following one position through a full rotation.",
      subtitle: "Which role do you want to follow?",
      advance: 'role-select',
      roleOptions: ['OH1', 'S', 'MB1', 'OPP'],
      rotation: 1,
      phase: 'PRE_SERVE',
    },
    {
      id: 'role-context-OH',
      content: "Great choice! Outside hitters are the workhorses of 5-1.",
      subtitle: "You'll attack from the left side and pass a lot of serves.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
      highlightRole: 'OH1',
    },
    {
      id: 'serve-receive-OH',
      content: "In Rotation 1, you start in the front left (zone 4).",
      subtitle: "But before the serve, you drop back to help receive.",
      advance: 'tap',
      rotation: 1,
      phase: 'SERVE_RECEIVE',
      highlightRole: 'OH1',
    },
    {
      id: 'transition-OH',
      content: "As soon as the ball is served, you approach the net.",
      subtitle: "Your job is to be ready to attack from the left side.",
      advance: 'tap',
      rotation: 1,
      phase: 'SET_PHASE',
      highlightRole: 'OH1',
    },
    {
      id: 'attack-OH',
      content: "When the set comes, you jump and swing.",
      subtitle: "This is your moment. You're the go-to hitter in this rotation.",
      advance: 'tap',
      rotation: 1,
      phase: 'ATTACK_PHASE',
      highlightRole: 'OH1',
    },
    {
      id: 'defense-OH',
      content: "After the attack, you transition to defense.",
      subtitle: "Get ready to dig if they hit it back.",
      advance: 'tap',
      rotation: 1,
      phase: 'DEFENSE_PHASE',
      highlightRole: 'OH1',
    },
    {
      id: 'pattern-complete',
      content: "That's one complete cycle!",
      subtitle: "Serve receive → approach → attack → defend. This pattern repeats.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
      highlightRole: 'OH1',
    },
    {
      id: 'other-rotations-preview',
      content: "In other rotations, your position changes but the job stays similar.",
      subtitle: "You'll always be attacking from the left and helping pass.",
      advance: 'tap',
    },
    {
      id: 'module2-complete',
      content: "You've got the basics of playing outside hitter in Rotation 1!",
      subtitle: "Next: We'll learn the overlap rules that keep formations legal.",
      advance: 'tap',
    },
  ],
}

/**
 * Module 3: Overlap Rules (T and L)
 * Teach the overlap relationship system
 */
export const module3: Lesson = {
  id: 'module-3-overlap-rules',
  title: 'Overlap Rules',
  description: 'Learn the simple rules that keep formations legal.',
  estimatedTime: '10 min',

  steps: [
    {
      id: 'overlap-intro',
      content: "Before the serve, you can't just stand anywhere.",
      subtitle: "There are simple rules about not crossing certain teammates.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
    },
    {
      id: 'timing',
      content: "Here's the key: these rules only apply at the moment of serve contact.",
      subtitle: "One second after the ball is served? You can go anywhere.",
      advance: 'tap',
    },
    {
      id: 't-shape',
      content: "If you're in a middle position (zones 3 or 6), you form a 'T'.",
      subtitle: "You have three neighbors: one in front, one behind, and one to the side.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
      highlightRole: 'MB1',
    },
    {
      id: 'l-shape',
      content: "If you're in a corner position, you form an 'L'.",
      subtitle: "You only have two neighbors to worry about.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
      highlightRole: 'OH1',
    },
    {
      id: 'diagonal-insight',
      content: "Here's the magic: diagonal players have NO overlap rule.",
      subtitle: "You and your opposite number can stand right next to each other if you want.",
      advance: 'tap',
    },
    {
      id: 'front-back',
      content: "Front row players must stay in front of their back row counterparts.",
      subtitle: "Zone 2 stays in front of zone 1, zone 3 in front of zone 6, etc.",
      advance: 'tap',
    },
    {
      id: 'left-right',
      content: "And left-right: you can't cross your horizontal neighbor.",
      subtitle: "Zone 4 stays left of zone 3, zone 3 stays left of zone 2.",
      advance: 'tap',
    },
    {
      id: 'practice-idea',
      content: "The best way to learn? Look at any formation and ask:",
      subtitle: "Is everyone in front of their back-row neighbor? Left of their right neighbor?",
      advance: 'tap',
    },
    {
      id: 'module3-complete',
      content: "That's it! T and L relationships keep you legal.",
      subtitle: "Next: Understanding when your setter is front row vs. back row.",
      advance: 'tap',
    },
  ],
}

/**
 * Module 4: Front Row vs Back Row
 * The fundamental binary distinction
 */
export const module4: Lesson = {
  id: 'module-4-front-vs-back',
  title: 'Front Row vs Back Row',
  description: 'The two modes of 5-1.',
  estimatedTime: '5 min',

  steps: [
    {
      id: 'binary-intro',
      content: "All 6 rotations boil down to one question:",
      subtitle: "Is our setter in the front row or back row?",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
    },
    {
      id: 'setter-back-demo',
      content: "Setter in back row: Rotations 1, 2, and 3.",
      subtitle: "Three hitters up front. More attack options!",
      advance: 'auto',
      autoAdvanceDelay: 2000,
      rotation: 1,
      phase: 'SET_PHASE',
      highlightRole: 'S',
    },
    {
      id: 'setter-back-travel',
      content: "But the setter has to run forward to the net.",
      subtitle: "They start in the back, then penetrate to their setting spot.",
      advance: 'tap',
      rotation: 1,
      phase: 'SET_PHASE',
      highlightRole: 'S',
    },
    {
      id: 'setter-front-demo',
      content: "Setter in front row: Rotations 4, 5, and 6.",
      subtitle: "Only two hitters up front. Less firepower.",
      advance: 'auto',
      autoAdvanceDelay: 2000,
      rotation: 4,
      phase: 'SET_PHASE',
      highlightRole: 'S',
    },
    {
      id: 'setter-front-advantage',
      content: "But the setter is already at the net!",
      subtitle: "This opens up back-row attacks and trick plays.",
      advance: 'tap',
      rotation: 4,
      phase: 'SET_PHASE',
      highlightRole: 'S',
    },
    {
      id: 'strategic-difference',
      content: "Teams play differently based on this.",
      subtitle: "Setter back = more aggressive. Setter front = more strategic.",
      advance: 'tap',
    },
    {
      id: 'module4-complete',
      content: "That's the fundamental trade-off of 5-1!",
      subtitle: "Next: We'll walk through all six rotations from your perspective.",
      advance: 'tap',
    },
  ],
}

/**
 * Module 5: All Six Rotations
 * Complete tour from one role's perspective
 */
export const module5: Lesson = {
  id: 'module-5-all-rotations',
  title: 'All Six Rotations',
  description: 'See the complete cycle from your role.',
  estimatedTime: '15-20 min',

  steps: [
    {
      id: 'all-rotations-intro',
      content: "Let's walk through all six rotations from your perspective.",
      subtitle: "Watch for the patterns as we cycle through.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
      highlightRole: 'OH1',
    },
    {
      id: 'r1-overview',
      content: "Rotation 1: You're in front left (zone 4).",
      subtitle: "Prime attacking position. Setter in back.",
      advance: 'tap',
      rotation: 1,
      phase: 'SET_PHASE',
      highlightRole: 'OH1',
    },
    {
      id: 'r2-overview',
      content: "Rotation 2: You've rotated to front middle (zone 3).",
      subtitle: "Less common for OH to attack from here, but it happens.",
      advance: 'tap',
      rotation: 2,
      phase: 'SET_PHASE',
      highlightRole: 'OH1',
    },
    {
      id: 'r3-overview',
      content: "Rotation 3: Front right (zone 2).",
      subtitle: "Unusual spot for outside hitters—might play opposite role here.",
      advance: 'tap',
      rotation: 3,
      phase: 'SET_PHASE',
      highlightRole: 'OH1',
    },
    {
      id: 'r4-overview',
      content: "Rotation 4: Back right (zone 1). Setter's in front now.",
      subtitle: "You might hit from the back row if the set comes to you.",
      advance: 'tap',
      rotation: 4,
      phase: 'SET_PHASE',
      highlightRole: 'OH1',
    },
    {
      id: 'r5-overview',
      content: "Rotation 5: Back middle (zone 6).",
      subtitle: "Focus on defense and passing from here.",
      advance: 'tap',
      rotation: 5,
      phase: 'SERVE_RECEIVE',
      highlightRole: 'OH1',
    },
    {
      id: 'r6-overview',
      content: "Rotation 6: Back left (zone 5). This is your serving rotation!",
      subtitle: "You'll serve from here, then move into defensive position.",
      advance: 'tap',
      rotation: 6,
      phase: 'PRE_SERVE',
      highlightRole: 'OH1',
    },
    {
      id: 'pattern-recognition',
      content: "See the pattern? You move clockwise through all 6 positions.",
      subtitle: "Your role stays the same, just from different starting spots.",
      advance: 'tap',
    },
    {
      id: 'module5-complete',
      content: "You've seen the full rotation cycle!",
      subtitle: "Ready to practice? Let's test your knowledge.",
      advance: 'tap',
    },
  ],
}

/**
 * Module 6: Quiz Time
 * Interactive quizzes to test understanding
 */
export const module6: Lesson = {
  id: 'module-6-quiz',
  title: 'Quiz Time',
  description: 'Test your understanding with interactive questions.',
  estimatedTime: '5-10 min',

  steps: [
    {
      id: 'quiz-intro',
      content: "Time to test what you've learned!",
      subtitle: "Answer these questions to see how well you understand 5-1.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
    },
    {
      id: 'quiz-1',
      content: "Question 1: What does the '5' in 5-1 stand for?",
      advance: 'quiz',
      quizOptions: [
        { label: '5 rotations', correct: false, feedback: "Not quite. There are actually 6 rotations." },
        { label: '5 hitters', correct: true, feedback: "Correct! 5 hitters + 1 setter = 5-1." },
        { label: '5 positions', correct: false, feedback: "Not quite. Think about how many players attack vs set." },
        { label: '5 points to win', correct: false, feedback: "That's not related to 5-1 at all!" },
      ],
      successFeedback: "Right! The '5' means 5 hitters on the team.",
    },
    {
      id: 'quiz-2',
      content: "Question 2: In Rotation 1, where does the setter start?",
      subtitle: "Look at the court to help you answer.",
      advance: 'quiz',
      rotation: 1,
      phase: 'PRE_SERVE',
      highlightRole: 'S',
      quizOptions: [
        { label: 'Front left', correct: false },
        { label: 'Front right', correct: false },
        { label: 'Back right', correct: true, feedback: "Correct! Zone 1, back right." },
        { label: 'Back left', correct: false },
      ],
      successFeedback: "The setter starts in zone 1 (back right) in Rotation 1.",
    },
    {
      id: 'quiz-3',
      content: "Question 3: How many hitters are in the front row when the setter is in the back row?",
      advance: 'quiz',
      rotation: 2,
      phase: 'SET_PHASE',
      quizOptions: [
        { label: '1 hitter', correct: false },
        { label: '2 hitters', correct: false, feedback: "That's when the setter is in the front row." },
        { label: '3 hitters', correct: true },
        { label: '4 hitters', correct: false },
      ],
      successFeedback: "With the setter in back, all 3 front row players are hitters!",
    },
    {
      id: 'quiz-4',
      content: "Question 4: When do overlap rules apply?",
      advance: 'quiz',
      rotation: 1,
      phase: 'PRE_SERVE',
      quizOptions: [
        { label: 'The entire rally', correct: false },
        { label: 'Only at the moment of serve contact', correct: true },
        { label: 'Only when attacking', correct: false },
        { label: 'Never in 5-1', correct: false },
      ],
      successFeedback: "Overlap rules only apply at the moment of serve. After that, go anywhere!",
    },
    {
      id: 'quiz-5',
      content: "Question 5: Which rotations have the setter in the front row?",
      advance: 'quiz',
      rotation: 4,
      phase: 'PRE_SERVE',
      highlightRole: 'S',
      quizOptions: [
        { label: 'Rotations 1, 2, 3', correct: false, feedback: "Those are setter back row rotations." },
        { label: 'Rotations 4, 5, 6', correct: true },
        { label: 'Rotations 2, 4, 6', correct: false },
        { label: 'All rotations', correct: false },
      ],
      successFeedback: "Rotations 4, 5, 6 have the setter in front. Fewer hitters, but easier sets!",
    },
    {
      id: 'quiz-6',
      content: "Question 6: What relationship do middle positions have?",
      subtitle: "Think about T and L shapes.",
      advance: 'quiz',
      rotation: 1,
      phase: 'PRE_SERVE',
      highlightRole: 'MB1',
      quizOptions: [
        { label: 'L-shape (2 neighbors)', correct: false, feedback: "That's corner positions." },
        { label: 'T-shape (3 neighbors)', correct: true },
        { label: 'No overlap relationships', correct: false },
        { label: 'They can stand anywhere', correct: false },
      ],
      successFeedback: "Middle positions (zones 3 & 6) form T-shapes with 3 neighbors.",
    },
    {
      id: 'quiz-complete',
      content: "Great job! You've tested your 5-1 knowledge.",
      subtitle: "You're ready to apply this on the court!",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
    },
    {
      id: 'course-complete',
      content: "Congratulations! You've completed the 5-1 basics course.",
      subtitle: "You now understand rotations better than most recreational players!",
      advance: 'tap',
    },
  ],
}

// Export all lessons
export const allLessons: Lesson[] = [
  module1,
  module2,
  module3,
  module4,
  module5,
  module6,
]

// Helper to get a lesson by ID
export function getLessonById(id: string): Lesson | undefined {
  return allLessons.find((l) => l.id === id)
}

// Helper to get the next lesson in sequence
export function getNextLesson(currentLessonId: string): Lesson | undefined {
  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId)
  if (currentIndex === -1 || currentIndex === allLessons.length - 1) {
    return undefined
  }
  return allLessons[currentIndex + 1]
}
