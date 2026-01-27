/**
 * OLYMPUS 2.0 - 40 Agent Definitions
 * Each agent is a specialized AI expert in the build pipeline
 */

export type AgentPhase =
  | 'discovery'
  | 'conversion'
  | 'design'
  | 'architecture'
  | 'frontend'
  | 'backend'
  | 'integration'
  | 'testing'
  | 'deployment';

export type AgentStatus = 'idle' | 'active' | 'completed' | 'error';

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  phase: AgentPhase;
  description: string;
  capabilities: string[];
  color: string;
}

export const PHASE_INFO: Record<
  AgentPhase,
  { name: string; number: number; color: string; description: string }
> = {
  discovery: {
    name: 'Discovery',
    number: 1,
    color: '#8B5CF6',
    description: 'Understanding your vision and market',
  },
  conversion: {
    name: 'Conversion',
    number: 2,
    color: '#EC4899',
    description: 'Translating ideas into specifications',
  },
  design: {
    name: 'Design',
    number: 3,
    color: '#F59E0B',
    description: 'Creating visual systems and layouts',
  },
  architecture: {
    name: 'Architecture',
    number: 4,
    color: '#10B981',
    description: 'Planning technical structure',
  },
  frontend: {
    name: 'Frontend',
    number: 5,
    color: '#3B82F6',
    description: 'Building user interfaces',
  },
  backend: {
    name: 'Backend',
    number: 6,
    color: '#6366F1',
    description: 'Creating server logic and APIs',
  },
  integration: {
    name: 'Integration',
    number: 7,
    color: '#14B8A6',
    description: 'Connecting all systems together',
  },
  testing: {
    name: 'Testing',
    number: 8,
    color: '#F97316',
    description: 'Ensuring quality and reliability',
  },
  deployment: {
    name: 'Deployment',
    number: 9,
    color: '#22C55E',
    description: 'Shipping to production',
  },
};

export const AGENTS: Agent[] = [
  // Phase 1: Discovery (5 agents)
  {
    id: 'oracle',
    name: 'ORACLE',
    emoji: '🔮',
    phase: 'discovery',
    color: '#8B5CF6',
    description: 'Market research & competitor analysis',
    capabilities: [
      'Market Analysis',
      'Competitor Research',
      'Trend Detection',
      'Gap Identification',
    ],
  },
  {
    id: 'empathy',
    name: 'EMPATHY',
    emoji: '💭',
    phase: 'discovery',
    color: '#A78BFA',
    description: 'User persona creation & journey mapping',
    capabilities: [
      'Persona Creation',
      'User Journey Maps',
      'Pain Point Analysis',
      'Behavioral Insights',
    ],
  },
  {
    id: 'strategos',
    name: 'STRATEGOS',
    emoji: '📋',
    phase: 'discovery',
    color: '#C4B5FD',
    description: 'MVP feature planning & prioritization',
    capabilities: [
      'Feature Prioritization',
      'MVP Definition',
      'Roadmap Planning',
      'Scope Management',
    ],
  },
  {
    id: 'scope',
    name: 'SCOPE',
    emoji: '🎯',
    phase: 'discovery',
    color: '#7C3AED',
    description: 'Feature boundary definition',
    capabilities: [
      'Boundary Definition',
      'Constraint Analysis',
      'Trade-off Evaluation',
      'Focus Optimization',
    ],
  },
  {
    id: 'venture',
    name: 'VENTURE',
    emoji: '💰',
    phase: 'discovery',
    color: '#6D28D9',
    description: 'Business model validation',
    capabilities: ['Revenue Models', 'Pricing Strategy', 'Market Fit Analysis', 'Growth Potential'],
  },

  // Phase 2: Conversion (4 agents)
  {
    id: 'lexicon',
    name: 'LEXICON',
    emoji: '📝',
    phase: 'conversion',
    color: '#EC4899',
    description: 'Technical specification writing',
    capabilities: ['Spec Writing', 'Requirement Docs', 'API Contracts', 'Data Models'],
  },
  {
    id: 'syntax',
    name: 'SYNTAX',
    emoji: '🔤',
    phase: 'conversion',
    color: '#F472B6',
    description: 'Code convention & style guide creation',
    capabilities: ['Style Guides', 'Naming Conventions', 'Code Standards', 'Pattern Libraries'],
  },
  {
    id: 'bridge',
    name: 'BRIDGE',
    emoji: '🌉',
    phase: 'conversion',
    color: '#DB2777',
    description: 'Natural language to code translation',
    capabilities: ['NLP to Code', 'Intent Parsing', 'Requirement Mapping', 'Logic Translation'],
  },
  {
    id: 'clarity',
    name: 'CLARITY',
    emoji: '💎',
    phase: 'conversion',
    color: '#BE185D',
    description: 'Ambiguity resolution & clarification',
    capabilities: ['Disambiguation', 'Edge Cases', 'Assumption Validation', 'Clarity Checks'],
  },

  // Phase 3: Design (5 agents)
  {
    id: 'palette',
    name: 'PALETTE',
    emoji: '🎨',
    phase: 'design',
    color: '#F59E0B',
    description: 'Color system & visual identity',
    capabilities: ['Color Theory', 'Brand Colors', 'Accessibility Colors', 'Theme Systems'],
  },
  {
    id: 'grid',
    name: 'GRID',
    emoji: '📐',
    phase: 'design',
    color: '#FBBF24',
    description: 'Layout system & spacing',
    capabilities: ['Grid Systems', 'Spacing Scales', 'Responsive Layouts', 'Visual Hierarchy'],
  },
  {
    id: 'blocks',
    name: 'BLOCKS',
    emoji: '🧱',
    phase: 'design',
    color: '#FCD34D',
    description: 'Component design patterns',
    capabilities: ['Component Design', 'Pattern Libraries', 'Design Tokens', 'UI Kits'],
  },
  {
    id: 'motion',
    name: 'MOTION',
    emoji: '✨',
    phase: 'design',
    color: '#D97706',
    description: 'Animation & micro-interactions',
    capabilities: ['Animations', 'Transitions', 'Micro-interactions', 'Motion Design'],
  },
  {
    id: 'access',
    name: 'ACCESS',
    emoji: '♿',
    phase: 'design',
    color: '#B45309',
    description: 'Accessibility & inclusive design',
    capabilities: ['WCAG Compliance', 'Screen Readers', 'Keyboard Nav', 'Color Contrast'],
  },

  // Phase 4: Architecture (5 agents)
  {
    id: 'archon',
    name: 'ARCHON',
    emoji: '🏛️',
    phase: 'architecture',
    color: '#10B981',
    description: 'System architecture design',
    capabilities: ['System Design', 'Architecture Patterns', 'Scalability', 'Performance'],
  },
  {
    id: 'datum',
    name: 'DATUM',
    emoji: '💾',
    phase: 'architecture',
    color: '#34D399',
    description: 'Database schema design',
    capabilities: ['Schema Design', 'Data Modeling', 'Relationships', 'Indexing Strategy'],
  },
  {
    id: 'nexus',
    name: 'NEXUS',
    emoji: '🔗',
    phase: 'architecture',
    color: '#6EE7B7',
    description: 'API design & integration planning',
    capabilities: ['API Design', 'REST/GraphQL', 'Integration Points', 'Data Flow'],
  },
  {
    id: 'vault',
    name: 'VAULT',
    emoji: '🔐',
    phase: 'architecture',
    color: '#059669',
    description: 'Security architecture',
    capabilities: ['Auth Systems', 'Encryption', 'Security Patterns', 'Threat Modeling'],
  },
  {
    id: 'scale',
    name: 'SCALE',
    emoji: '📈',
    phase: 'architecture',
    color: '#047857',
    description: 'Scalability & performance planning',
    capabilities: ['Load Planning', 'Caching Strategy', 'CDN Setup', 'Performance Budgets'],
  },

  // Phase 5: Frontend (5 agents)
  {
    id: 'pixel',
    name: 'PIXEL',
    emoji: '🖼️',
    phase: 'frontend',
    color: '#3B82F6',
    description: 'UI component development',
    capabilities: ['React Components', 'CSS/Tailwind', 'Responsive Design', 'Animation'],
  },
  {
    id: 'wire',
    name: 'WIRE',
    emoji: '🔌',
    phase: 'frontend',
    color: '#60A5FA',
    description: 'State management & data flow',
    capabilities: ['State Management', 'Data Fetching', 'Cache Management', 'Optimistic Updates'],
  },
  {
    id: 'polish',
    name: 'POLISH',
    emoji: '💅',
    phase: 'frontend',
    color: '#93C5FD',
    description: 'UI refinement & pixel perfection',
    capabilities: ['Visual Polish', 'Edge Cases', 'Loading States', 'Error States'],
  },
  {
    id: 'speed',
    name: 'SPEED',
    emoji: '⚡',
    phase: 'frontend',
    color: '#2563EB',
    description: 'Frontend performance optimization',
    capabilities: ['Code Splitting', 'Lazy Loading', 'Bundle Size', 'Core Web Vitals'],
  },
  {
    id: 'form',
    name: 'FORM',
    emoji: '📝',
    phase: 'frontend',
    color: '#1D4ED8',
    description: 'Form handling & validation',
    capabilities: ['Form Logic', 'Validation', 'Error Handling', 'Multi-step Forms'],
  },

  // Phase 6: Backend (5 agents)
  {
    id: 'engine',
    name: 'ENGINE',
    emoji: '⚙️',
    phase: 'backend',
    color: '#6366F1',
    description: 'Server-side logic & business rules',
    capabilities: ['Business Logic', 'Server Functions', 'Background Jobs', 'Scheduled Tasks'],
  },
  {
    id: 'forge',
    name: 'FORGE',
    emoji: '🔨',
    phase: 'backend',
    color: '#818CF8',
    description: 'API endpoint development',
    capabilities: ['API Routes', 'Middleware', 'Request Handling', 'Response Formatting'],
  },
  {
    id: 'keeper',
    name: 'KEEPER',
    emoji: '🗄️',
    phase: 'backend',
    color: '#A5B4FC',
    description: 'Database operations & queries',
    capabilities: ['CRUD Operations', 'Complex Queries', 'Migrations', 'Seed Data'],
  },
  {
    id: 'guard',
    name: 'GUARD',
    emoji: '🛡️',
    phase: 'backend',
    color: '#4F46E5',
    description: 'Authentication & authorization',
    capabilities: ['Auth Logic', 'Permissions', 'Session Management', 'Token Handling'],
  },
  {
    id: 'flow',
    name: 'FLOW',
    emoji: '🌊',
    phase: 'backend',
    color: '#4338CA',
    description: 'Workflow & process automation',
    capabilities: ['Workflows', 'Email Triggers', 'Webhooks', 'Event Handlers'],
  },

  // Phase 7: Integration (4 agents)
  {
    id: 'link',
    name: 'LINK',
    emoji: '🔗',
    phase: 'integration',
    color: '#14B8A6',
    description: 'Third-party API integration',
    capabilities: ['API Integration', 'OAuth Flows', 'Webhook Setup', 'Data Sync'],
  },
  {
    id: 'sync',
    name: 'SYNC',
    emoji: '🔄',
    phase: 'integration',
    color: '#2DD4BF',
    description: 'Data synchronization & consistency',
    capabilities: ['Data Sync', 'Conflict Resolution', 'Real-time Updates', 'Cache Invalidation'],
  },
  {
    id: 'pay',
    name: 'PAY',
    emoji: '💳',
    phase: 'integration',
    color: '#5EEAD4',
    description: 'Payment system integration',
    capabilities: ['Stripe Integration', 'Billing Logic', 'Subscriptions', 'Invoicing'],
  },
  {
    id: 'notify',
    name: 'NOTIFY',
    emoji: '🔔',
    phase: 'integration',
    color: '#0D9488',
    description: 'Notification system setup',
    capabilities: ['Email Notifications', 'Push Notifications', 'In-app Alerts', 'SMS'],
  },

  // Phase 8: Testing (4 agents)
  {
    id: 'sentinel',
    name: 'SENTINEL',
    emoji: '🔍',
    phase: 'testing',
    color: '#F97316',
    description: 'Security testing & vulnerability scanning',
    capabilities: ['Security Scans', 'Penetration Testing', 'OWASP Checks', 'Dependency Audit'],
  },
  {
    id: 'probe',
    name: 'PROBE',
    emoji: '🧪',
    phase: 'testing',
    color: '#FB923C',
    description: 'Unit & integration testing',
    capabilities: ['Unit Tests', 'Integration Tests', 'Test Coverage', 'Mock Data'],
  },
  {
    id: 'scout',
    name: 'SCOUT',
    emoji: '🔦',
    phase: 'testing',
    color: '#FDBA74',
    description: 'End-to-end testing',
    capabilities: ['E2E Tests', 'User Flows', 'Cross-browser', 'Mobile Testing'],
  },
  {
    id: 'critic',
    name: 'CRITIC',
    emoji: '📊',
    phase: 'testing',
    color: '#EA580C',
    description: 'Code quality & review',
    capabilities: ['Code Review', 'Best Practices', 'Performance Analysis', 'Quality Scores'],
  },

  // Phase 9: Deployment (3 agents)
  {
    id: 'launch',
    name: 'LAUNCH',
    emoji: '🚀',
    phase: 'deployment',
    color: '#22C55E',
    description: 'Deployment orchestration',
    capabilities: ['CI/CD Setup', 'Build Pipelines', 'Environment Config', 'Release Management'],
  },
  {
    id: 'monitor',
    name: 'MONITOR',
    emoji: '📡',
    phase: 'deployment',
    color: '#4ADE80',
    description: 'Monitoring & observability setup',
    capabilities: ['Error Tracking', 'Performance Monitoring', 'Logging', 'Alerting'],
  },
  {
    id: 'docs',
    name: 'DOCS',
    emoji: '📚',
    phase: 'deployment',
    color: '#86EFAC',
    description: 'Documentation generation',
    capabilities: ['API Docs', 'README Generation', 'Code Comments', 'User Guides'],
  },
];

// Helper functions
export function getAgentsByPhase(phase: AgentPhase): Agent[] {
  return AGENTS.filter(agent => agent.phase === phase);
}

export function getAgentById(id: string): Agent | undefined {
  return AGENTS.find(agent => agent.id === id);
}

export function getPhaseAgentCount(phase: AgentPhase): number {
  return AGENTS.filter(agent => agent.phase === phase).length;
}

export const TOTAL_AGENTS = AGENTS.length; // 40
export const TOTAL_PHASES = Object.keys(PHASE_INFO).length; // 9
