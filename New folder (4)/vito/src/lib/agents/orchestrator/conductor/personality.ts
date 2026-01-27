/**
 * PERSONALITY
 *
 * Vito's voice, messages, and character.
 *
 * LESSON: Personality is Product
 * Every message is a chance to build connection.
 * Consistent voice = memorable product.
 * Varied phrases = feels human, not robotic.
 */

// ============================================================================
// THE PERSONALITY
// ============================================================================

export const VITO = {
  name: "Vito",

  /**
   * Greetings for first-time and returning users.
   * WHY variety? Same greeting every time feels robotic.
   */
  greetings: [
    "Hey! Let's build something great.",
    "Ready when you are!",
    "What are we creating?",
    "Let's make something amazing.",
  ],

  /**
   * Celebrations for successful builds.
   * WHY celebrate? Positive reinforcement builds habit.
   */
  celebrations: [
    "🎉 Nailed it!",
    "✨ Beautiful work!",
    "🚀 Ship it!",
    "💪 Solid code!",
    "⭐ That's clean!",
    "🎯 Exactly right!",
  ],

  /**
   * Encouragements during and after generation.
   * WHY encourage? Everyone needs a boost.
   */
  encouragements: [
    "You're on a roll!",
    "This is coming together.",
    "Great instincts!",
    "Looking good!",
    "Nice choice!",
    "This'll work great.",
  ],

  /**
   * Messages during streaming.
   * WHY varied? Long waits feel shorter with activity.
   */
  streamingPhrases: [
    "Writing...",
    "Coding...",
    "Building...",
    "Creating...",
  ],

  /**
   * Messages when falling back to local model.
   * WHY positive? Errors shouldn't feel like failures.
   */
  recoveryPhrases: [
    "Found another way!",
    "Plan B worked!",
    "Got it from backup!",
    "Switched to local!",
  ],

  /**
   * Quality assessment messages.
   */
  qualityMessages: {
    excellent: "This is production-ready code.",
    good: "Solid code, ready to use.",
    acceptable: "Good foundation to build on.",
    needsWork: "Might need some tweaks.",
  },

  /**
   * Contextual suggestions based on what was built.
   * WHY? Proactive help > reactive help.
   */
  suggestions: {
    form: [
      "Consider adding form validation",
      "Loading states would be nice",
      "Error messages for edge cases?",
    ],
    button: [
      "A loading spinner variant?",
      "Hover animations add polish",
      "Consider a disabled state",
    ],
    modal: [
      "Escape key to close?",
      "Click outside to dismiss?",
      "Focus trap for accessibility",
    ],
    card: [
      "Skeleton loader for loading state?",
      "Hover shadow adds depth",
      "Consider responsive sizing",
    ],
    table: [
      "Pagination for large datasets",
      "Sortable columns?",
      "Row selection might help",
    ],
    nav: [
      "Mobile hamburger menu?",
      "Active state styling",
      "Keyboard navigation?",
    ],
    list: [
      "Empty state message?",
      "Loading skeletons?",
      "Infinite scroll option?",
    ],
    input: [
      "Validation feedback?",
      "Character counter?",
      "Clear button?",
    ],
    default: [
      "Looking great!",
      "Solid foundation.",
      "Ready for the next feature!",
    ],
  },
} as const;

// ============================================================================
// RANDOM SELECTION
// ============================================================================

/**
 * Pick a random item from an array.
 *
 * WHY function?
 * - Type-safe
 * - Reusable
 * - Can be tested
 */
export function random<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// MESSAGE BUILDERS
// ============================================================================

/**
 * Get a greeting message.
 */
export function getGreeting(): string {
  return `Hi! I'm ${VITO.name}. ${random(VITO.greetings)}`;
}

/**
 * Get a celebration message.
 */
export function getCelebration(): string {
  return random(VITO.celebrations);
}

/**
 * Get an encouragement message.
 */
export function getEncouragement(): string {
  return random(VITO.encouragements);
}

/**
 * Get a streaming progress message.
 */
export function getStreamingMessage(): string {
  return random(VITO.streamingPhrases);
}

/**
 * Get a recovery message (for fallback scenarios).
 */
export function getRecoveryMessage(): string {
  return random(VITO.recoveryPhrases);
}

// ============================================================================
// MILESTONE CELEBRATIONS
// ============================================================================

/**
 * Get a celebration for reaching a milestone.
 *
 * Milestones: 1, 5, 10, 25, 50, 100, then every 50
 *
 * WHY milestones?
 * - Builds habit through achievement
 * - Makes progress visible
 * - Creates shareable moments
 */
export function getMilestoneCelebration(count: number): string {
  switch (count) {
    case 1:
      return "🎊 First build! Welcome to Vito!";
    case 5:
      return "🔥 5 builds! You're getting it!";
    case 10:
      return "🏆 Double digits!";
    case 25:
      return "⭐ 25! Power user!";
    case 50:
      return "💎 50! Legendary!";
    case 100:
      return "👑 100! Master status!";
    default:
      if (count % 100 === 0) return `🎯 ${count}! Unstoppable!`;
      if (count % 25 === 0) return `🌟 ${count} builds!`;
      return getCelebration();
  }
}

// ============================================================================
// CONTEXTUAL SUGGESTIONS
// ============================================================================

/**
 * Get a suggestion based on what was built.
 *
 * Analyzes the task to determine what type of component
 * was created, then suggests relevant improvements.
 */
export function getSuggestion(task: string): string {
  const lower = task.toLowerCase();

  // Check each category
  const categories: Array<{
    patterns: RegExp;
    suggestions: readonly string[];
  }> = [
    { patterns: /form|input|field|submit/, suggestions: VITO.suggestions.form },
    { patterns: /button|btn|click/, suggestions: VITO.suggestions.button },
    { patterns: /modal|dialog|popup|overlay/, suggestions: VITO.suggestions.modal },
    { patterns: /card|tile|box|panel/, suggestions: VITO.suggestions.card },
    { patterns: /table|grid|data|rows/, suggestions: VITO.suggestions.table },
    { patterns: /nav|menu|header|sidebar|footer/, suggestions: VITO.suggestions.nav },
    { patterns: /list|items|collection/, suggestions: VITO.suggestions.list },
    { patterns: /input|text|email|password/, suggestions: VITO.suggestions.input },
  ];

  for (const { patterns, suggestions } of categories) {
    if (patterns.test(lower)) {
      return random(suggestions);
    }
  }

  return random(VITO.suggestions.default);
}

// ============================================================================
// PROGRESS MESSAGES
// ============================================================================

/**
 * Progress stage messages with emoji.
 */
export const PROGRESS_MESSAGES = {
  starting: { message: "Getting ready...", emoji: "🎯" },
  thinking: { message: "Planning the approach...", emoji: "🧠" },
  streaming: { message: "Writing code...", emoji: "✍️" },
  validating: { message: "Checking quality...", emoji: "🔍" },
  done: { message: "Complete!", emoji: "🎉" },
} as const;

/**
 * Get progress message for a stage.
 */
export function getProgressMessage(
  stage: keyof typeof PROGRESS_MESSAGES
): { message: string; emoji: string } {
  return PROGRESS_MESSAGES[stage];
}
