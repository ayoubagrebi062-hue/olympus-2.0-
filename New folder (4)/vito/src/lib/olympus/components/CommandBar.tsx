'use client'

// OLYMPUS COMMAND BAR — KEYBOARD-DRIVEN, FIXED AT BOTTOM

import { useState, useRef, useEffect, useCallback } from 'react'
import { TOKENS } from './tokens'
import { parseCommand, validateCommand, getRiskIndicator, getCommandHelp } from '../commands/parser'
import type { Command } from '../types/core'

interface CommandBarProps {
  readonly onCommand: (command: Command) => void
  readonly commandHistory: readonly string[]
  readonly isProcessing: boolean
}

export function CommandBar({ onCommand, commandHistory, isProcessing }: CommandBarProps) {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showHelp, setShowHelp] = useState(false)
  const [confirmation, setConfirmation] = useState<Command | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // PARSE CURRENT INPUT
  const parsed = parseCommand(input)
  const validation = validateCommand(parsed)
  const risk = getRiskIndicator(parsed.risk)

  // FOCUS INPUT ON MOUNT
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // GLOBAL KEYBOARD SHORTCUT
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ':' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
        setInput(':')
      }
      if (e.key === 'Escape') {
        setShowHelp(false)
        setConfirmation(null)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return
    if (!validation.valid) return

    const command = parseCommand(input)

    // REQUIRE CONFIRMATION FOR HIGH/CRITICAL RISK
    if (command.requiresConfirmation && !confirmation) {
      setConfirmation(command)
      return
    }

    onCommand(command)
    setInput('')
    setHistoryIndex(-1)
    setConfirmation(null)
  }, [input, validation, confirmation, onCommand])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      setShowHelp((prev) => !prev)
    }
  }

  const styles = {
    container: {
      height: TOKENS.layout.commandBarHeight,
      backgroundColor: TOKENS.colors.bg.tertiary,
      borderTop: `1px solid ${TOKENS.colors.border.default}`,
      display: 'flex',
      alignItems: 'center',
      padding: `0 ${TOKENS.space[3]}`,
      fontFamily: TOKENS.font.family,
      fontSize: TOKENS.font.size.base,
      position: 'relative' as const,
    } as const,
    prompt: {
      color: TOKENS.colors.accent.primary,
      marginRight: TOKENS.space[2],
      fontWeight: TOKENS.font.weight.bold,
    } as const,
    input: {
      flex: 1,
      backgroundColor: 'transparent',
      border: 'none',
      outline: 'none',
      color: TOKENS.colors.text.primary,
      fontFamily: TOKENS.font.family,
      fontSize: TOKENS.font.size.base,
    } as const,
    risk: {
      display: 'flex',
      alignItems: 'center',
      gap: TOKENS.space[1],
      marginLeft: TOKENS.space[3],
      color: risk.color,
      fontSize: TOKENS.font.size.xs,
    } as const,
    error: {
      color: TOKENS.colors.accent.error,
      fontSize: TOKENS.font.size.xs,
      marginLeft: TOKENS.space[2],
    } as const,
    processing: {
      color: TOKENS.colors.accent.primary,
      fontSize: TOKENS.font.size.xs,
      marginLeft: TOKENS.space[2],
    } as const,
    help: {
      position: 'absolute' as const,
      bottom: '100%',
      left: 0,
      right: 0,
      backgroundColor: TOKENS.colors.bg.secondary,
      border: `1px solid ${TOKENS.colors.border.default}`,
      maxHeight: '300px',
      overflow: 'auto' as const,
      padding: TOKENS.space[2],
    } as const,
    helpTitle: {
      fontSize: TOKENS.font.size.xs,
      color: TOKENS.colors.text.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: TOKENS.space[2],
    } as const,
    helpItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: `${TOKENS.space[1]} 0`,
      fontSize: TOKENS.font.size.xs,
    } as const,
    helpCommand: {
      color: TOKENS.colors.accent.primary,
    } as const,
    helpDesc: {
      color: TOKENS.colors.text.tertiary,
    } as const,
    confirmation: {
      position: 'absolute' as const,
      bottom: '100%',
      left: 0,
      right: 0,
      backgroundColor: TOKENS.colors.bg.secondary,
      border: `1px solid ${TOKENS.colors.accent.error}`,
      padding: TOKENS.space[3],
    } as const,
    confirmTitle: {
      color: TOKENS.colors.accent.error,
      fontWeight: TOKENS.font.weight.bold,
      marginBottom: TOKENS.space[2],
    } as const,
    confirmButtons: {
      display: 'flex',
      gap: TOKENS.space[2],
      marginTop: TOKENS.space[2],
    } as const,
    confirmButton: {
      padding: `${TOKENS.space[1]} ${TOKENS.space[3]}`,
      border: `1px solid ${TOKENS.colors.border.default}`,
      borderRadius: TOKENS.radius.sm,
      backgroundColor: TOKENS.colors.bg.primary,
      color: TOKENS.colors.text.primary,
      fontFamily: TOKENS.font.family,
      fontSize: TOKENS.font.size.xs,
      cursor: 'pointer',
    } as const,
    confirmButtonDanger: {
      borderColor: TOKENS.colors.accent.error,
      color: TOKENS.colors.accent.error,
    } as const,
    hint: {
      color: TOKENS.colors.text.muted,
      fontSize: TOKENS.font.size.xs,
      marginLeft: TOKENS.space[2],
    } as const,
  }

  return (
    <div style={styles.container}>
      {/* HELP PANEL */}
      {showHelp && (
        <div style={styles.help}>
          <div style={styles.helpTitle}>COMMANDS (TAB TO TOGGLE)</div>
          {getCommandHelp().map((item) => (
            <div key={item.command} style={styles.helpItem}>
              <span style={styles.helpCommand}>{item.command}</span>
              <span style={styles.helpDesc}>{item.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmation && (
        <div style={styles.confirmation}>
          <div style={styles.confirmTitle}>CONFIRM: {confirmation.parsed.action.toUpperCase()}</div>
          <div style={{ color: TOKENS.colors.text.secondary }}>
            This action is {confirmation.risk.toUpperCase()} risk and cannot be undone.
          </div>
          <div style={styles.confirmButtons}>
            <button
              style={{ ...styles.confirmButton, ...styles.confirmButtonDanger }}
              onClick={handleSubmit}
            >
              CONFIRM
            </button>
            <button
              style={styles.confirmButton}
              onClick={() => setConfirmation(null)}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      <span style={styles.prompt}>▶</span>
      <input
        ref={inputRef}
        style={styles.input}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type : for commands, TAB for help"
        disabled={isProcessing}
      />

      {/* VALIDATION ERROR */}
      {input && !validation.valid && (
        <span style={styles.error}>{validation.error}</span>
      )}

      {/* PROCESSING INDICATOR */}
      {isProcessing && (
        <span style={styles.processing}>PROCESSING...</span>
      )}

      {/* RISK INDICATOR */}
      {input && validation.valid && (
        <div style={styles.risk}>
          <span>{risk.symbol}</span>
          <span>{parsed.risk.toUpperCase()}</span>
        </div>
      )}

      <span style={styles.hint}>ESC to cancel</span>
    </div>
  )
}
