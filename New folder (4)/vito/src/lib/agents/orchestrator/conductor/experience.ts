/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                           VITO EXPERIENCE                                 ║
 * ║                                                                           ║
 * ║  Not a tool. An experience that answers:                                  ║
 * ║                                                                           ║
 * ║  HOOK:  Watch AI models race to solve your problem                        ║
 * ║  AHA:   "It remembered what I built last week!"                           ║
 * ║  HABIT: Your AI gets smarter every day. Check its growth.                 ║
 * ║  SHARE: Your AI's win/loss record. Screenshot-worthy stats.              ║
 * ║  BRAG:  "My AI has 94% confidence on React tasks"                         ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import Anthropic from "@anthropic-ai/sdk";
import { EventEmitter } from "events";

// ============================================================================
// THE HOOK: Watch the Race
// ============================================================================

export interface RaceVisualization {
  contestants: Contestant[];
  timeline: RaceEvent[];
  winner: string;
  photo: string; // ASCII art finish line
}

interface Contestant {
  name: string;
  model: string;
  personality: string;
  avatar: string;
  status: "racing" | "finished" | "crashed" | "killed";
  progress: number;
  confidence: number;
}

interface RaceEvent {
  timestamp: number;
  contestant: string;
  event: "start" | "progress" | "breakthrough" | "struggle" | "finish" | "crash";
  message: string;
}

interface AchievementCelebration {
  title: string;
  subtitle: string;
  badge: string;
  sound: string;
  confetti: boolean;
  stats: any;
  earnedAt: Date;
  type: string;
}

// ============================================================================
// THE AHA: Memory That Feels Magical
// ============================================================================

export interface MagicMoment {
  type: "remembered" | "learned" | "improved" | "predicted";
  message: string;
  evidence: string;
  impact: string;
}

// ============================================================================
// THE HABIT: Daily Growth Stats
// ============================================================================

export interface GrowthProfile {
  // Identity
  name: string;
  personality: string;
  birthday: Date;
  age: string; // "3 days old", "2 weeks old"

  // Growth metrics
  tasksCompleted: number;
  totalTokensProcessed: number;
  averageConfidence: number;
  confidenceGrowth: number; // % change this week

  // Specializations (what it's getting good at)
  strengths: Strength[];
  improving: string[];
  struggles: string[];

  // Streaks
  currentStreak: number;
  longestStreak: number;
  lastActive: Date;

  // Milestones
  milestones: Milestone[];
  nextMilestone: Milestone;
}

interface Strength {
  area: string;
  confidence: number;
  tasksCompleted: number;
  trend: "rising" | "stable" | "declining";
}

interface Milestone {
  name: string;
  description: string;
  achieved: boolean;
  achievedAt?: Date;
  progress?: number;
}

// ============================================================================
// THE SHARE: Screenshot-Worthy Output
// ============================================================================

export interface ShareableResult {
  // The visual card
  card: string; // ASCII/ANSI art card

  // Stats for the card
  task: string;
  approach: string;
  confidence: number;
  timeToSolve: number;
  modelsRaced: number;
  memoryUsed: boolean;

  // Social proof
  rank: string; // "Top 5% of React tasks"
  comparison: string; // "Solved 3x faster than average"
}

// ============================================================================
// THE BRAG: Public Profile
// ============================================================================

export interface PublicProfile {
  // Braggable URL
  url: string;

  // Stats others can see
  totalTasks: number;
  winRate: number;
  topStrengths: string[];
  impressiveStats: string[];

  // Badges
  badges: Badge[];
}

interface Badge {
  name: string;
  icon: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  earnedAt: Date;
}

// ============================================================================
// VITO EXPERIENCE CLASS
// ============================================================================

export class VitoExperience extends EventEmitter {
  private anthropic: Anthropic;
  private profile: GrowthProfile;
  private startTime: Date;

  constructor(config: { apiKey?: string; name?: string } = {}) {
    super();

    this.anthropic = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });

    this.startTime = new Date();

    this.profile = {
      name: config.name || this.generateName(),
      personality: this.generatePersonality(),
      birthday: new Date(),
      age: "just born",
      tasksCompleted: 0,
      totalTokensProcessed: 0,
      averageConfidence: 0,
      confidenceGrowth: 0,
      strengths: [],
      improving: [],
      struggles: [],
      currentStreak: 0,
      longestStreak: 0,
      lastActive: new Date(),
      milestones: this.getInitialMilestones(),
      nextMilestone: this.getInitialMilestones()[0],
    };
  }

  // ==========================================================================
  // THE HOOK: Race Visualization
  // ==========================================================================

  async race(task: string): Promise<{
    result: string;
    visualization: RaceVisualization;
    magic?: MagicMoment;
    shareable: ShareableResult;
  }> {
    const startTime = Date.now();

    // Create contestants
    const contestants: Contestant[] = [
      {
        name: "Flash",
        model: "claude-haiku-3-5-20241022",
        personality: "Speed demon. Types 300 WPM.",
        avatar: "⚡",
        status: "racing",
        progress: 0,
        confidence: 0,
      },
      {
        name: "Tank",
        model: "claude-sonnet-4-20250514",
        personality: "Defensive. Trust issues with edge cases.",
        avatar: "🛡️",
        status: "racing",
        progress: 0,
        confidence: 0,
      },
      {
        name: "Sage",
        model: "claude-opus-4-20250514",
        personality: "Thinks in systems. Overengineers everything.",
        avatar: "🧙",
        status: "racing",
        progress: 0,
        confidence: 0,
      },
    ];

    const timeline: RaceEvent[] = [];
    const raceStart = Date.now();

    // Emit race start
    timeline.push({
      timestamp: 0,
      contestant: "all",
      event: "start",
      message: "🏁 AND THEY'RE OFF!",
    });

    this.emit("race_start", { contestants, task });

    // Check memory first - THE AHA MOMENT
    let magic: MagicMoment | undefined;
    const memory = this.checkMemory(task);
    if (memory) {
      magic = {
        type: "remembered",
        message: `💡 Wait... I remember this!`,
        evidence: `Similar task from ${memory.when}`,
        impact: `Starting with ${Math.round(memory.boost * 100)}% confidence boost`,
      };
      this.emit("magic_moment", magic);
    }

    // Race the models
    const results = await Promise.all(
      contestants.map(async (contestant, index) => {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          if (contestant.status === "racing") {
            contestant.progress = Math.min(
              contestant.progress + Math.random() * 20,
              95
            );
            this.emit("progress", { contestant: contestant.name, progress: contestant.progress });
          }
        }, 500);

        try {
          const result = await this.executeContestant(contestant, task);

          clearInterval(progressInterval);
          contestant.status = "finished";
          contestant.progress = 100;
          contestant.confidence = result.confidence;

          timeline.push({
            timestamp: Date.now() - raceStart,
            contestant: contestant.name,
            event: "finish",
            message: `${contestant.avatar} ${contestant.name} crosses the line! (${Math.round(result.confidence * 100)}% confidence)`,
          });

          this.emit("contestant_finish", { contestant, result });

          return { contestant, result };
        } catch (error) {
          clearInterval(progressInterval);
          contestant.status = "crashed";

          timeline.push({
            timestamp: Date.now() - raceStart,
            contestant: contestant.name,
            event: "crash",
            message: `💥 ${contestant.name} CRASHED! ${error instanceof Error ? error.message : "Unknown error"}`,
          });

          return { contestant, result: null };
        }
      })
    );

    // Find winner
    const finishers = results.filter((r) => r.result !== null);
    const winner = finishers.sort(
      (a, b) => (b.result?.confidence || 0) - (a.result?.confidence || 0)
    )[0];

    // Kill others (dramatic effect)
    for (const contestant of contestants) {
      if (contestant.name !== winner?.contestant.name && contestant.status === "racing") {
        contestant.status = "killed";
        timeline.push({
          timestamp: Date.now() - raceStart,
          contestant: contestant.name,
          event: "crash",
          message: `☠️ ${contestant.name} terminated - winner found`,
        });
      }
    }

    // Build photo finish
    const photo = this.buildPhotoFinish(contestants, winner?.contestant.name || "none");

    // Update profile
    this.updateProfile(task, winner?.result?.confidence || 0);

    // Create shareable result
    const shareable = this.createShareable(
      task,
      winner?.contestant || contestants[0],
      winner?.result?.confidence || 0,
      Date.now() - startTime,
      contestants.length
    );

    return {
      result: winner?.result?.code || "",
      visualization: {
        contestants,
        timeline,
        winner: winner?.contestant.name || "none",
        photo,
      },
      magic,
      shareable,
    };
  }

  private async executeContestant(
    contestant: Contestant,
    task: string
  ): Promise<{ code: string; confidence: number }> {
    const response = await this.anthropic.messages.create({
      model: contestant.model,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are ${contestant.name}. ${contestant.personality}

Task: ${task}

Return only TypeScript code blocks. No explanations.`,
        },
      ],
    });

    const code =
      response.content[0].type === "text" ? response.content[0].text : "";

    const confidence = this.assessConfidence(code);

    return { code, confidence };
  }

  private assessConfidence(code: string): number {
    let score = 0.5;
    if (/```[\s\S]*```/.test(code)) score += 0.2;
    if (/interface|type/.test(code)) score += 0.1;
    if (/export/.test(code)) score += 0.1;
    if (/try\s*{/.test(code)) score += 0.1;
    return Math.min(score, 1);
  }

  private buildPhotoFinish(contestants: Contestant[], winner: string): string {
    const sorted = [...contestants].sort((a, b) => b.confidence - a.confidence);

    let photo = `
╔══════════════════════════════════════════════════════════════╗
║                      🏁 PHOTO FINISH 🏁                       ║
╠══════════════════════════════════════════════════════════════╣`;

    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
      const bar = "█".repeat(Math.round(c.confidence * 20));
      const status =
        c.status === "finished"
          ? `${Math.round(c.confidence * 100)}%`
          : c.status.toUpperCase();

      photo += `
║  ${medal} ${c.avatar} ${c.name.padEnd(8)} ${bar.padEnd(20)} ${status.padStart(6)} ║`;
    }

    photo += `
╠══════════════════════════════════════════════════════════════╣
║  WINNER: ${winner.padEnd(50)} ║
╚══════════════════════════════════════════════════════════════╝`;

    return photo;
  }

  // ==========================================================================
  // THE AHA: Memory That Feels Magical
  // ==========================================================================

  private memoryStore: Map<string, { task: string; confidence: number; when: string }> =
    new Map();

  private checkMemory(task: string): { boost: number; when: string } | null {
    // Simple keyword matching for demo
    const taskWords = task.toLowerCase().split(/\W+/);

    for (const [key, memory] of this.memoryStore) {
      const memoryWords = memory.task.toLowerCase().split(/\W+/);
      const overlap = taskWords.filter((w) => memoryWords.includes(w)).length;
      const similarity = overlap / Math.max(taskWords.length, memoryWords.length);

      if (similarity > 0.4) {
        return {
          boost: similarity * 0.3,
          when: memory.when,
        };
      }
    }

    return null;
  }

  remember(task: string, confidence: number): void {
    const key = task.slice(0, 50);
    const when = this.formatTimeAgo(new Date());

    this.memoryStore.set(key, { task, confidence, when });

    // Emit magic moment if this improves our strength
    const area = this.categorizeTask(task);
    const strength = this.profile.strengths.find((s) => s.area === area);

    if (strength && confidence > strength.confidence) {
      this.emit("magic_moment", {
        type: "improved",
        message: `📈 Getting better at ${area}!`,
        evidence: `Confidence: ${Math.round(strength.confidence * 100)}% → ${Math.round(confidence * 100)}%`,
        impact: `Strength trending up`,
      } as MagicMoment);
    }
  }

  // ==========================================================================
  // THE HABIT: Growth Profile
  // ==========================================================================

  private updateProfile(task: string, confidence: number): void {
    this.profile.tasksCompleted++;
    this.profile.lastActive = new Date();
    this.profile.age = this.formatAge();

    // Update average confidence
    const oldAvg = this.profile.averageConfidence;
    this.profile.averageConfidence =
      (oldAvg * (this.profile.tasksCompleted - 1) + confidence) /
      this.profile.tasksCompleted;

    // Update streaks
    const today = new Date().toDateString();
    const lastActiveDay = this.profile.lastActive.toDateString();
    if (today !== lastActiveDay) {
      this.profile.currentStreak++;
      this.profile.longestStreak = Math.max(
        this.profile.currentStreak,
        this.profile.longestStreak
      );
    }

    // Update strengths
    const area = this.categorizeTask(task);
    let strength = this.profile.strengths.find((s) => s.area === area);

    if (!strength) {
      strength = { area, confidence: 0, tasksCompleted: 0, trend: "stable" };
      this.profile.strengths.push(strength);
    }

    const oldConf = strength.confidence;
    strength.tasksCompleted++;
    strength.confidence =
      (oldConf * (strength.tasksCompleted - 1) + confidence) /
      strength.tasksCompleted;
    strength.trend =
      strength.confidence > oldConf
        ? "rising"
        : strength.confidence < oldConf
          ? "declining"
          : "stable";

    // Check milestones
    this.checkMilestones();

    // Remember this task
    this.remember(task, confidence);
  }

  private checkMilestones(): void {
    const milestones = this.profile.milestones;

    // First task
    if (this.profile.tasksCompleted >= 1) {
      const m = milestones.find((m) => m.name === "First Steps");
      if (m && !m.achieved) {
        m.achieved = true;
        m.achievedAt = new Date();
        this.emit("milestone", m);
      }
    }

    // 10 tasks
    if (this.profile.tasksCompleted >= 10) {
      const m = milestones.find((m) => m.name === "Getting Warmed Up");
      if (m && !m.achieved) {
        m.achieved = true;
        m.achievedAt = new Date();
        this.emit("milestone", m);
      }
    }

    // 80% confidence
    if (this.profile.averageConfidence >= 0.8) {
      const m = milestones.find((m) => m.name === "Confident");
      if (m && !m.achieved) {
        m.achieved = true;
        m.achievedAt = new Date();
        this.emit("milestone", m);
      }
    }

    // Update next milestone
    const next = milestones.find((m) => !m.achieved);
    if (next) {
      this.profile.nextMilestone = next;
    }
  }

  getProfile(): GrowthProfile {
    return this.profile;
  }

  getProfileCard(): string {
    const p = this.profile;
    const topStrengths = p.strengths
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    return `
╔══════════════════════════════════════════════════════════════╗
║                      🤖 ${p.name.padEnd(20)}                   ║
║                      "${p.personality}"
╠══════════════════════════════════════════════════════════════╣
║  📅 Age: ${p.age.padEnd(20)}  🔥 Streak: ${String(p.currentStreak).padEnd(10)}  ║
║  ✅ Tasks: ${String(p.tasksCompleted).padEnd(17)}  📊 Confidence: ${Math.round(p.averageConfidence * 100)}%   ║
╠══════════════════════════════════════════════════════════════╣
║  💪 STRENGTHS                                                 ║
${topStrengths
  .map(
    (s) =>
      `║     ${s.trend === "rising" ? "📈" : s.trend === "declining" ? "📉" : "➡️"} ${s.area.padEnd(15)} ${Math.round(s.confidence * 100)}% (${s.tasksCompleted} tasks)`.padEnd(63) + "║"
  )
  .join("\n")}
╠══════════════════════════════════════════════════════════════╣
║  🎯 NEXT MILESTONE                                            ║
║     ${p.nextMilestone.name.padEnd(55)}║
║     ${p.nextMilestone.description.slice(0, 55).padEnd(55)}║
╚══════════════════════════════════════════════════════════════╝`;
  }

  // ==========================================================================
  // THE SHARE: Screenshot-Worthy Output
  // ==========================================================================

  private createShareable(
    task: string,
    contestant: Contestant,
    confidence: number,
    duration: number,
    modelsRaced: number
  ): ShareableResult {
    const card = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                              ┃
┃   ${contestant.avatar} VITO solved it in ${(duration / 1000).toFixed(1)}s                          ┃
┃                                                              ┃
┃   Task: ${task.slice(0, 45).padEnd(45)}     ┃
┃                                                              ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                              ┃
┃   Winner: ${contestant.name.padEnd(15)} Confidence: ${Math.round(confidence * 100)}%         ┃
┃   Models Raced: ${modelsRaced}              Approach: ${contestant.personality.slice(0, 15)}   ┃
┃                                                              ┃
┃   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ┃
┃                                                              ┃
┃   🏆 ${this.profile.name} • ${this.profile.tasksCompleted} tasks • ${Math.round(this.profile.averageConfidence * 100)}% avg    ┃
┃                                                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`;

    return {
      card,
      task,
      approach: contestant.name,
      confidence,
      timeToSolve: duration,
      modelsRaced,
      memoryUsed: this.memoryStore.size > 0,
      rank: this.calculateRank(confidence),
      comparison: this.calculateComparison(duration),
    };
  }

  private calculateRank(confidence: number): string {
    if (confidence > 0.9) return "Top 5% of all tasks";
    if (confidence > 0.8) return "Top 15% of all tasks";
    if (confidence > 0.7) return "Top 30% of all tasks";
    return "Completed successfully";
  }

  private calculateComparison(duration: number): string {
    const avgDuration = 5000; // Simulated average
    const ratio = avgDuration / duration;

    if (ratio > 2) return `${ratio.toFixed(1)}x faster than average`;
    if (ratio > 1.2) return "Faster than average";
    if (ratio > 0.8) return "About average speed";
    return "Thorough analysis";
  }

  // ==========================================================================
  // THE BRAG: Public Profile
  // ==========================================================================

  getPublicProfile(): PublicProfile {
    const badges = this.calculateBadges();
    const topStrengths = this.profile.strengths
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map((s) => s.area);

    const impressiveStats = [
      `${this.profile.tasksCompleted} tasks completed`,
      `${Math.round(this.profile.averageConfidence * 100)}% average confidence`,
      `${this.profile.longestStreak} day streak`,
      `${this.profile.strengths.length} specializations`,
    ];

    return {
      url: `vito.dev/${this.profile.name.toLowerCase().replace(/\s+/g, "-")}`,
      totalTasks: this.profile.tasksCompleted,
      winRate: this.profile.averageConfidence,
      topStrengths,
      impressiveStats,
      badges,
    };
  }

  private calculateBadges(): Badge[] {
    const badges: Badge[] = [];

    if (this.profile.tasksCompleted >= 1) {
      badges.push({
        name: "First Blood",
        icon: "🩸",
        description: "Completed first task",
        rarity: "common",
        earnedAt: this.profile.birthday,
      });
    }

    if (this.profile.tasksCompleted >= 100) {
      badges.push({
        name: "Centurion",
        icon: "💯",
        description: "100 tasks completed",
        rarity: "epic",
        earnedAt: new Date(),
      });
    }

    if (this.profile.averageConfidence >= 0.9) {
      badges.push({
        name: "Perfectionist",
        icon: "💎",
        description: "90%+ average confidence",
        rarity: "legendary",
        earnedAt: new Date(),
      });
    }

    if (this.profile.longestStreak >= 7) {
      badges.push({
        name: "Week Warrior",
        icon: "🔥",
        description: "7 day streak",
        rarity: "rare",
        earnedAt: new Date(),
      });
    }

    return badges;
  }

  // ============================================================================
  // ACHIEVEMENT CELEBRATION SYSTEM
  // ============================================================================

  private achievementCelebrations = {
    firstBuild: {
      title: "🎉 Welcome to the future of coding!",
      subtitle: "Your first build is ready - you're officially a code generator now!",
      badge: "First Build Champion",
      sound: 'success-chime',
      confetti: true
    },
    complexApp: {
      title: "🚀 You're building at scale!",
      subtitle: "This is the kind of app that startups get funded for.",
      badge: "Architecture Master",
      sound: 'applause',
      confetti: true
    },
    fastGeneration: {
      title: "⚡ Speed demon!",
      subtitle: "Generated in record time - you're a productivity ninja.",
      badge: "Speed Champion",
      sound: 'speed-chime',
      confetti: false
    },
    perfectScore: {
      title: "💎 Perfection achieved!",
      subtitle: "100% quality score - your standards are unmatched.",
      badge: "Quality Virtuoso",
      sound: 'champion-bell',
      confetti: true
    }
  };

  celebrateAchievement(achievementType: keyof typeof this.achievementCelebrations, context?: any): AchievementCelebration | null {
    const celebration = this.achievementCelebrations[achievementType];
    if (!celebration) return null;

    return {
      ...celebration,
      stats: this.calculateAchievementStats(context),
      earnedAt: new Date(),
      type: achievementType
    };
  }

  private calculateAchievementStats(context?: Record<string, unknown>) {
    return {
      tasksCompleted: this.profile.tasksCompleted,
      averageConfidence: this.profile.averageConfidence,
      currentStreak: this.profile.currentStreak,
      totalTimeSaved: 0, // TODO: Add to GrowthProfile interface
      ...context
    };
  }

  getBadgeDisplay(): string {
    const badges = this.calculateBadges();

    if (badges.length === 0) {
      return "No badges yet. Keep coding!";
    }

    return badges.map((b) => `${b.icon} ${b.name} (${b.rarity})`).join(" • ");
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  private generateName(): string {
    const adjectives = ["Swift", "Clever", "Mighty", "Wise", "Bold", "Sharp"];
    const nouns = ["Phoenix", "Dragon", "Titan", "Oracle", "Spark", "Nova"];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adj} ${noun}`;
  }

  private generatePersonality(): string {
    const personalities = [
      "Thinks before typing",
      "Speed is everything",
      "Quality over quantity",
      "Curious and thorough",
      "Efficient and focused",
    ];
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  private categorizeTask(task: string): string {
    const lower = task.toLowerCase();

    if (/react|component|hook|jsx|tsx/.test(lower)) return "React";
    if (/auth|login|session|password/.test(lower)) return "Authentication";
    if (/api|endpoint|rest|graphql/.test(lower)) return "APIs";
    if (/test|spec|coverage/.test(lower)) return "Testing";
    if (/database|sql|query|model/.test(lower)) return "Database";
    if (/style|css|tailwind|design/.test(lower)) return "Styling";

    return "General";
  }

  private formatAge(): string {
    const diff = Date.now() - this.startTime.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "just born";
    if (days === 1) return "1 day old";
    if (days < 7) return `${days} days old`;
    if (days < 30) return `${Math.floor(days / 7)} weeks old`;
    return `${Math.floor(days / 30)} months old`;
  }

  private formatTimeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  }

  private getInitialMilestones(): Milestone[] {
    return [
      {
        name: "First Steps",
        description: "Complete your first task",
        achieved: false,
        progress: 0,
      },
      {
        name: "Getting Warmed Up",
        description: "Complete 10 tasks",
        achieved: false,
        progress: 0,
      },
      {
        name: "Confident",
        description: "Reach 80% average confidence",
        achieved: false,
        progress: 0,
      },
      {
        name: "Specialist",
        description: "Get 90% confidence in one area",
        achieved: false,
        progress: 0,
      },
      {
        name: "Polyglot",
        description: "Complete tasks in 5 different areas",
        achieved: false,
        progress: 0,
      },
    ];
  }
}

// ============================================================================
// CONVENIENCE EXPORT
// ============================================================================

let experience: VitoExperience | null = null;

export function getVitoExperience(name?: string): VitoExperience {
  if (!experience) {
    experience = new VitoExperience({ name });
  }
  return experience;
}

export async function vitoRace(
  task: string
): Promise<ReturnType<VitoExperience["race"]>> {
  return getVitoExperience().race(task);
}
