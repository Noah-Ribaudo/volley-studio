import type { Lesson } from './types'

/**
 * Module 1: What is 5-1?
 *
 * This is the introductory lesson that explains what 5-1 means,
 * why rotations exist, and introduces setter-centric thinking.
 *
 * Target audience: People who've played recreational volleyball
 * but haven't learned formal rotation systems.
 *
 * Tone: Conversational coach - warm, encouraging, no jargon.
 */
export const module1: Lesson = {
  id: 'module-1-what-is-5-1',
  title: 'What is 5-1?',
  description: 'Learn what makes 5-1 volleyball different from what you might have played before.',
  estimatedTime: '5 min',

  steps: [
    // === Introduction ===
    {
      id: 'intro-1',
      content: "Let's learn about 5-1 volleyball.",
      subtitle: "It's simpler than it sounds, I promise.",
      advance: 'tap',
      rotation: 1,
      phase: 'PRE_SERVE',
    },

    // === The 6 Players ===
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

    // === Why Rotations? ===
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

    // === The Key Insight ===
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

    // === What Happens During a Rally ===
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

    // === Wrap Up ===
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
      subtitle: "Feel free to explore the whiteboard, or continue learning when you're ready.",
      advance: 'tap',
    },
  ],
}

// Export all lessons (just module 1 for now)
export const lessons: Lesson[] = [module1]

// Helper to get a lesson by ID
export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id)
}
