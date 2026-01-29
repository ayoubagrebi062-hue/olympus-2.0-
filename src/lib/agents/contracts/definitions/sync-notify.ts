/**
 * OLYMPUS 2.0 - Contract: SYNC → NOTIFY
 *
 * SYNC implements real-time sync.
 * NOTIFY needs this to send notifications.
 */

import type { AgentContract } from '../types';

export const SYNC_TO_NOTIFY_CONTRACT: AgentContract = {
  upstream: 'sync',
  downstream: 'notify',

  description: 'SYNC must provide sync events for NOTIFY to send notifications',

  criticality: 'medium',

  requiredFields: ['sync_events', 'channels'],

  fieldConstraints: {
    sync_events: {
      type: 'array',
      minCount: 5,
      reason: 'At least 5 sync events for notifications',
    },
    'sync_events[]': {
      eachMustHave: ['name', 'trigger', 'payload'],
      reason: 'Each event needs name, trigger, and payload',
    },
    channels: {
      type: 'array',
      minCount: 2,
      reason: 'At least 2 notification channels',
    },
  },

  expectedFormat: 'structured_json',
};
