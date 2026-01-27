/**
 * OLYMPUS 2.0 - Preview & Chat Validation Schemas
 */

import { z } from 'zod';

/** Focus area for iteration */
const focusArea = z.enum(['ui', 'backend', 'database', 'api', 'styling', 'general']);

/** Iterate preview schema */
export const iteratePreviewSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message must be at most 2000 characters'),
  context: z
    .object({
      selectedFiles: z.array(z.string()).max(20).optional(),
      selectedComponents: z.array(z.string()).max(10).optional(),
      focusArea: focusArea.optional(),
      screenshot: z.string().optional(), // Base64 encoded
      coordinates: z
        .object({
          x: z.number(),
          y: z.number(),
          width: z.number().optional(),
          height: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  options: z
    .object({
      preserveExisting: z.boolean().optional().default(true),
      generateTests: z.boolean().optional().default(false),
      explainChanges: z.boolean().optional().default(true),
    })
    .optional(),
});

/** Chat message schema */
export const chatMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  attachments: z
    .array(
      z.object({
        type: z.enum(['file', 'image', 'code']),
        content: z.string(),
        filename: z.string().optional(),
        language: z.string().optional(),
      })
    )
    .max(5)
    .optional(),
  context: z
    .object({
      previousMessages: z.number().int().min(0).max(20).optional(),
      includeProjectContext: z.boolean().optional().default(true),
    })
    .optional(),
});

/** Preview settings schema */
export const previewSettingsSchema = z.object({
  autoReload: z.boolean().optional().default(true),
  showGrid: z.boolean().optional().default(false),
  showOutlines: z.boolean().optional().default(false),
  viewport: z
    .object({
      width: z.number().int().min(320).max(3840).optional(),
      height: z.number().int().min(480).max(2160).optional(),
      device: z.string().optional(),
    })
    .optional(),
  darkMode: z.boolean().optional(),
});

/** Apply suggestion schema */
export const applySuggestionSchema = z.object({
  suggestionId: z.string().uuid(),
  modifications: z
    .array(
      z.object({
        path: z.string(),
        action: z.enum(['accept', 'reject', 'modify']),
        newContent: z.string().optional(), // For 'modify' action
      })
    )
    .optional(),
});

/** Undo/redo schema */
export const undoRedoSchema = z.object({
  action: z.enum(['undo', 'redo']),
  steps: z.number().int().min(1).max(50).optional().default(1),
});

/** Save snapshot schema */
export const saveSnapshotSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

/** Restore snapshot schema */
export const restoreSnapshotSchema = z.object({
  snapshotId: z.string().uuid(),
});

/** Component inspection schema */
export const inspectComponentSchema = z.object({
  selector: z.string().min(1),
  includeStyles: z.boolean().optional().default(true),
  includeProps: z.boolean().optional().default(true),
  includeState: z.boolean().optional().default(false),
});

/** Hot reload schema */
export const hotReloadSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string(),
        content: z.string(),
      })
    )
    .min(1)
    .max(50),
  fullReload: z.boolean().optional().default(false),
});

export type IteratePreviewInput = z.infer<typeof iteratePreviewSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type PreviewSettingsInput = z.infer<typeof previewSettingsSchema>;
export type ApplySuggestionInput = z.infer<typeof applySuggestionSchema>;
export type HotReloadInput = z.infer<typeof hotReloadSchema>;
