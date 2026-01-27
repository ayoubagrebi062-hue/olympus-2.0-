// OLYMPUS COMMAND SYSTEM — KEYBOARD-DRIVEN, SHORT-FORM EXPERT COMMANDS

import type { Command, Severity } from '../types/core';
import { HARD_STOP } from '../governance/enforcement';

// COMMAND DEFINITIONS
const COMMANDS = {
  // NAVIGATION
  ':p': { action: 'inspect_phase', risk: 'low' as const },
  ':a': { action: 'inspect_agent', risk: 'low' as const },
  ':f': { action: 'inspect_artifact', risk: 'low' as const },
  ':g': { action: 'inspect_gate', risk: 'low' as const },
  ':e': { action: 'inspect_error', risk: 'low' as const },
  ':w': { action: 'inspect_why', risk: 'low' as const },
  ':t': { action: 'inspect_trust', risk: 'low' as const },
  ':c': { action: 'inspect_cost', risk: 'low' as const },

  // ACTIONS
  ':approve': { action: 'approve_gate', risk: 'high' as const },
  ':reject': { action: 'reject_gate', risk: 'high' as const },
  ':retry': { action: 'retry_phase', risk: 'medium' as const },
  ':skip': { action: 'skip_phase', risk: 'critical' as const },
  ':abort': { action: 'abort_build', risk: 'critical' as const },
  ':ship': { action: 'ship_build', risk: 'critical' as const },

  // SAFETY
  ':explain': { action: 'explain_command', risk: 'low' as const },
  ':dry-run': { action: 'dry_run', risk: 'low' as const },
  ':impact': { action: 'show_impact', risk: 'low' as const },

  // FILTERS
  ':filter': { action: 'filter_output', risk: 'low' as const },
  ':clear': { action: 'clear_filter', risk: 'low' as const },

  // SYSTEM
  ':status': { action: 'show_status', risk: 'low' as const },
  ':limits': { action: 'show_limits', risk: 'low' as const },
  ':help': { action: 'show_help', risk: 'low' as const },
} as const;

type CommandKey = keyof typeof COMMANDS;

// PARSE COMMAND
export function parseCommand(raw: string): Command {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(':')) {
    return {
      raw,
      parsed: { action: 'unknown', target: null, flags: [] },
      risk: 'low',
      requiresConfirmation: false,
    };
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0] as CommandKey;
  const target = parts[1] ?? null;
  const flags = parts.slice(2).filter(p => p.startsWith('--'));

  const definition = COMMANDS[cmd];
  if (!definition) {
    return {
      raw,
      parsed: { action: 'unknown', target, flags },
      risk: 'low',
      requiresConfirmation: false,
    };
  }

  return {
    raw,
    parsed: {
      action: definition.action,
      target,
      flags,
    },
    risk: definition.risk,
    requiresConfirmation: definition.risk === 'high' || definition.risk === 'critical',
  };
}

// VALIDATE COMMAND FOR EXECUTION
export function validateCommand(command: Command): { valid: boolean; error: string | null } {
  if (command.parsed.action === 'unknown') {
    return { valid: false, error: 'Unknown command' };
  }

  // CRITICAL COMMANDS REQUIRE TARGET
  const criticalActions = ['approve_gate', 'reject_gate', 'retry_phase', 'skip_phase'];
  if (criticalActions.includes(command.parsed.action) && !command.parsed.target) {
    return { valid: false, error: `${command.parsed.action} requires a target` };
  }

  return { valid: true, error: null };
}

// GET COMMAND RISK INDICATOR
export function getRiskIndicator(risk: Command['risk']): { symbol: string; color: string } {
  switch (risk) {
    case 'low':
      return { symbol: '○', color: '#525252' };
    case 'medium':
      return { symbol: '◐', color: '#ca8a04' };
    case 'high':
      return { symbol: '●', color: '#ea580c' };
    case 'critical':
      return { symbol: '◉', color: '#dc2626' };
  }
}

// GET COMMAND HELP
export function getCommandHelp(): readonly {
  command: string;
  description: string;
  risk: string;
}[] {
  return [
    { command: ':p [id]', description: 'Inspect phase', risk: 'low' },
    { command: ':a [id]', description: 'Inspect agent', risk: 'low' },
    { command: ':f [id]', description: 'Inspect artifact', risk: 'low' },
    { command: ':g [id]', description: 'Inspect gate', risk: 'low' },
    { command: ':e', description: 'Inspect errors', risk: 'low' },
    { command: ':w', description: 'Inspect decisions (WHY)', risk: 'low' },
    { command: ':t', description: 'Inspect trust', risk: 'low' },
    { command: ':c', description: 'Inspect cost', risk: 'low' },
    { command: ':approve [gate]', description: 'Approve gate', risk: 'high' },
    { command: ':reject [gate]', description: 'Reject gate', risk: 'high' },
    { command: ':retry [phase]', description: 'Retry failed phase', risk: 'medium' },
    { command: ':skip [phase]', description: 'Skip phase (requires override)', risk: 'critical' },
    { command: ':abort', description: 'Abort build', risk: 'critical' },
    { command: ':ship', description: 'Ship build (requires all gates passed)', risk: 'critical' },
    { command: ':explain [cmd]', description: 'Explain command before running', risk: 'low' },
    { command: ':dry-run [cmd]', description: 'Simulate command', risk: 'low' },
    { command: ':impact [cmd]', description: 'Show command impact', risk: 'low' },
    { command: ':filter [agent|phase|severity]', description: 'Filter output stream', risk: 'low' },
    { command: ':clear', description: 'Clear filters', risk: 'low' },
    { command: ':status', description: 'Show build status', risk: 'low' },
    { command: ':limits', description: 'Show system limits', risk: 'low' },
    { command: ':help', description: 'Show this help', risk: 'low' },
  ];
}

// SEVERITY TO COLOR
export function severityColor(severity: Severity): string {
  switch (severity) {
    case 'INFO':
      return '#525252';
    case 'WARNING':
      return '#ca8a04';
    case 'BLOCKING':
      return '#ea580c';
    case 'FATAL':
      return '#dc2626';
  }
}
