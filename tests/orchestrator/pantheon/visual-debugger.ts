/**
 * 🏛️ PANTHEON - Visual Debugger
 * ==============================
 * Generate beautiful HTML reports for build analysis.
 *
 * Features:
 * - Interactive timeline of agent execution
 * - State machine visualization
 * - Mermaid diagrams
 * - Event log with filtering
 * - Diff view for debugging
 */

import { type BuildSnapshot, type BuildPhase, type AgentId, type SimEvent } from './core/types';

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: HTML ESCAPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this for ALL user-provided data rendered in HTML.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TimelineEntry {
  agentId: AgentId;
  phase: BuildPhase;
  startSequence: number;
  endSequence: number;
  startTime: number;
  endTime: number;
  status: 'completed' | 'failed' | 'running';
  retries: number;
}

export interface DebugReport {
  buildId: string;
  status: string;
  totalDuration: number;
  timeline: TimelineEntry[];
  events: SimEvent[];
  snapshots: BuildSnapshot[];
  mermaidDiagram: string;
  /** Generated HTML report - always present */
  html: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE BUILDER
// ═══════════════════════════════════════════════════════════════════════════

function buildTimeline(events: SimEvent[]): TimelineEntry[] {
  const timeline: TimelineEntry[] = [];
  const agentStarts = new Map<
    AgentId,
    { sequence: number; time: number; phase: BuildPhase; retries: number }
  >();

  for (const event of events) {
    if (event.type === 'AGENT_STARTED' && event.agentId && event.phase) {
      agentStarts.set(event.agentId, {
        sequence: event.seq,
        time: event.timestamp,
        phase: event.phase,
        retries: 0,
      });
    }

    if (event.type === 'AGENT_RETRIED' && event.agentId) {
      const start = agentStarts.get(event.agentId);
      if (start) start.retries++;
    }

    if ((event.type === 'AGENT_COMPLETED' || event.type === 'AGENT_FAILED') && event.agentId) {
      const start = agentStarts.get(event.agentId);

      if (start) {
        timeline.push({
          agentId: event.agentId,
          phase: start.phase,
          startSequence: start.sequence,
          endSequence: event.seq,
          startTime: start.time,
          endTime: event.timestamp,
          status: event.type === 'AGENT_COMPLETED' ? 'completed' : 'failed',
          retries: start.retries,
        });
        agentStarts.delete(event.agentId);
      }
    }
  }

  // Add any still-running agents
  for (const [agentId, start] of agentStarts) {
    timeline.push({
      agentId,
      phase: start.phase,
      startSequence: start.sequence,
      endSequence: events.length,
      startTime: start.time,
      endTime: Date.now(),
      status: 'running',
      retries: start.retries,
    });
  }

  return timeline.sort((a, b) => a.startSequence - b.startSequence);
}

// ═══════════════════════════════════════════════════════════════════════════
// MERMAID DIAGRAM GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateMermaidDiagram(events: SimEvent[], finalState: BuildSnapshot): string {
  const lines: string[] = ['stateDiagram-v2'];

  // State definitions
  lines.push('  [*] --> Queued');
  lines.push('  Queued --> Running: BUILD_STARTED');

  // Phase transitions
  const phases: BuildPhase[] = [
    'discovery',
    'architecture',
    'implementation',
    'quality',
    'deployment',
  ];
  let prevPhase = 'Running';

  for (const phase of phases) {
    const hasPhase = events.some(e => e.type === 'PHASE_STARTED' && e.phase === phase);
    if (hasPhase) {
      const phaseName = phase.charAt(0).toUpperCase() + phase.slice(1);
      lines.push(`  ${prevPhase} --> ${phaseName}: PHASE_STARTED`);
      prevPhase = phaseName;
    }
  }

  // Terminal states
  if (finalState.state === 'completed') {
    lines.push(`  ${prevPhase} --> Completed: BUILD_COMPLETED`);
    lines.push('  Completed --> [*]');
  } else if (finalState.state === 'failed') {
    lines.push(`  ${prevPhase} --> Failed: BUILD_FAILED`);
    lines.push('  Failed --> [*]');
  } else if (finalState.state === 'cancelled') {
    lines.push(`  ${prevPhase} --> Cancelled: BUILD_CANCELLED`);
    lines.push('  Cancelled --> [*]');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// GANTT CHART GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateGanttChart(timeline: TimelineEntry[], baseTime: number): string {
  const lines: string[] = ['gantt'];
  lines.push('  title Build Execution Timeline');
  lines.push('  dateFormat x');
  lines.push('  axisFormat %S.%Ls');

  const phaseGroups = new Map<BuildPhase, TimelineEntry[]>();

  for (const entry of timeline) {
    if (!phaseGroups.has(entry.phase)) {
      phaseGroups.set(entry.phase, []);
    }
    phaseGroups.get(entry.phase)!.push(entry);
  }

  for (const [phase, entries] of phaseGroups) {
    lines.push(`  section ${phase.charAt(0).toUpperCase() + phase.slice(1)}`);

    for (const entry of entries) {
      const startOffset = entry.startTime - baseTime;
      const duration = entry.endTime - entry.startTime;
      const status =
        entry.status === 'completed' ? '' : entry.status === 'failed' ? 'crit, ' : 'active, ';
      const label =
        entry.retries > 0 ? `${entry.agentId} (${entry.retries} retries)` : entry.agentId;

      lines.push(`    ${label} :${status}${startOffset}, ${duration}ms`);
    }
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateHTML(report: DebugReport): string {
  const statusColors: Record<string, string> = {
    completed: '#22c55e',
    failed: '#ef4444',
    cancelled: '#f59e0b',
    running: '#3b82f6',
    pending: '#6b7280',
  };

  const phaseColors: Record<BuildPhase, string> = {
    discovery: '#8b5cf6',
    architecture: '#06b6d4',
    implementation: '#22c55e',
    quality: '#f59e0b',
    deployment: '#ec4899',
  };

  const eventRows = report.events
    .map(event => {
      const typeColors: Record<string, string> = {
        BUILD_STARTED: '#3b82f6',
        BUILD_COMPLETED: '#22c55e',
        BUILD_FAILED: '#ef4444',
        BUILD_CANCELLED: '#f59e0b',
        PHASE_STARTED: '#8b5cf6',
        PHASE_COMPLETED: '#06b6d4',
        AGENT_STARTED: '#6366f1',
        AGENT_COMPLETED: '#22c55e',
        AGENT_FAILED: '#ef4444',
        AGENT_RETRIED: '#f59e0b',
        CHAOS_INJECTED: '#ec4899',
      };

      const color = typeColors[event.type] || '#6b7280';
      const dataStr = event.data
        ? escapeHtml(JSON.stringify(event.data, null, 0).slice(0, 80))
        : '';
      const safeAgentId = event.agentId ? escapeHtml(event.agentId) : '-';

      return `
      <tr class="event-row" data-type="${escapeHtml(event.type)}">
        <td>${event.seq}</td>
        <td><span class="event-badge" style="background: ${color}">${escapeHtml(event.type)}</span></td>
        <td>${safeAgentId}</td>
        <td>${event.phase || '-'}</td>
        <td>${dataStr}</td>
        <td>${new Date(event.timestamp).toISOString().slice(11, 23)}</td>
      </tr>
    `;
    })
    .join('');

  const timelineItems = report.timeline
    .map(entry => {
      const width = Math.max(30, (entry.endTime - entry.startTime) / 10);
      const left = (entry.startSequence / Math.max(1, report.events.length)) * 100;
      const color =
        entry.status === 'completed'
          ? phaseColors[entry.phase]
          : entry.status === 'failed'
            ? '#ef4444'
            : '#6b7280';
      const safeAgentId = escapeHtml(entry.agentId);

      return `
      <div class="timeline-item" style="left: ${left}%; width: ${width}px; background: ${color};"
           title="${safeAgentId} (${entry.phase}) - ${entry.status}${entry.retries > 0 ? ` - ${entry.retries} retries` : ''}">
        ${safeAgentId}
      </div>
    `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PANTHEON Build Report - ${escapeHtml(report.buildId)}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --accent: #3b82f6;
      --success: #22c55e;
      --error: #ef4444;
      --warning: #f59e0b;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--bg-tertiary);
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.875rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--bg-secondary);
      border-radius: 0.5rem;
      padding: 1.5rem;
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .section {
      background: var(--bg-secondary);
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .timeline-container {
      position: relative;
      height: 200px;
      background: var(--bg-tertiary);
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .timeline-item {
      position: absolute;
      height: 30px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      padding: 0 8px;
      font-size: 0.75rem;
      color: white;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .timeline-item:hover {
      transform: scale(1.05);
      z-index: 10;
    }

    .mermaid {
      background: var(--bg-tertiary);
      border-radius: 0.5rem;
      padding: 1rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--bg-tertiary);
    }

    th {
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 0.875rem;
    }

    .event-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      color: white;
    }

    .filter-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      cursor: pointer;
      transition: background 0.2s;
    }

    .filter-btn:hover, .filter-btn.active {
      background: var(--accent);
    }

    .event-row.hidden { display: none; }

    footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🏛️ PANTHEON Build Report</h1>
      <span class="status-badge" style="background: ${statusColors[report.status] || '#6b7280'}">${report.status}</span>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Build ID</div>
        <div class="stat-value">${escapeHtml(report.buildId)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Duration</div>
        <div class="stat-value">${report.totalDuration}ms</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Snapshots</div>
        <div class="stat-value">${report.snapshots.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Events</div>
        <div class="stat-value">${report.events.length}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">📊 Execution Timeline</div>
      <div class="timeline-container">
        ${timelineItems}
      </div>
    </div>

    <div class="section">
      <div class="section-title">🔄 State Machine</div>
      <div class="mermaid">
${report.mermaidDiagram}
      </div>
    </div>

    <div class="section">
      <div class="section-title">📋 Event Log</div>
      <div class="filter-bar">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="BUILD">Build</button>
        <button class="filter-btn" data-filter="PHASE">Phase</button>
        <button class="filter-btn" data-filter="AGENT">Agent</button>
        <button class="filter-btn" data-filter="CHAOS">Chaos</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Seq</th>
            <th>Type</th>
            <th>Agent</th>
            <th>Phase</th>
            <th>Data</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${eventRows}
        </tbody>
      </table>
    </div>

    <footer>
      Generated by PANTHEON Test Infrastructure<br>
      ${new Date().toISOString()}
    </footer>
  </div>

  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });

    // Event filtering
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        document.querySelectorAll('.event-row').forEach(row => {
          if (filter === 'all' || row.dataset.type.includes(filter)) {
            row.classList.remove('hidden');
          } else {
            row.classList.add('hidden');
          }
        });
      });
    });
  </script>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// VISUAL DEBUGGER CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class VisualDebugger {
  private events: SimEvent[] = [];
  private snapshots: BuildSnapshot[] = [];

  constructor() {
    // No-arg constructor - collects data via record methods
  }

  /**
   * Record a build snapshot
   */
  recordSnapshot(snapshot: BuildSnapshot): void {
    this.snapshots.push(snapshot);
  }

  /**
   * Record a simulation event
   */
  recordEvent(event: SimEvent): void {
    this.events.push(event);
  }

  /**
   * Generate a debug report from recorded data
   * Returns valid report even with no data (defensive coding)
   */
  generateReport(): DebugReport {
    const finalState = this.snapshots[this.snapshots.length - 1];
    const timeline = buildTimeline(this.events);

    const baseTime = this.events[0]?.timestamp || Date.now();
    const lastTime = this.events[this.events.length - 1]?.timestamp || Date.now();

    const partialReport = {
      buildId: finalState?.id || 'unknown',
      status: finalState?.state || 'pending',
      totalDuration: lastTime - baseTime,
      timeline,
      events: [...this.events], // Defensive copy
      snapshots: [...this.snapshots], // Defensive copy
      mermaidDiagram: finalState
        ? generateMermaidDiagram(this.events, finalState)
        : 'stateDiagram-v2\n  [*] --> Empty',
    };

    // Generate HTML as part of the report
    const report: DebugReport = {
      ...partialReport,
      html: generateHTML(partialReport as DebugReport),
    };

    return report;
  }

  /**
   * Export report as HTML string
   */
  exportHTML(report: DebugReport): string {
    return generateHTML(report);
  }

  /**
   * Get the collected timeline
   */
  getTimeline(): TimelineEntry[] {
    return buildTimeline(this.events);
  }

  /**
   * Get Mermaid state diagram
   */
  getMermaidDiagram(): string {
    const finalState = this.snapshots[this.snapshots.length - 1];
    return finalState ? generateMermaidDiagram(this.events, finalState) : '';
  }

  /**
   * Get Gantt chart
   */
  getGanttChart(): string {
    const timeline = buildTimeline(this.events);
    const baseTime = this.events[0]?.timestamp || Date.now();
    return generateGanttChart(timeline, baseTime);
  }

  /**
   * Clear recorded data
   */
  clear(): void {
    this.events = [];
    this.snapshots = [];
  }
}
