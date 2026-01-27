import { AWAPExecutor } from '../src/lib/cockpit/witness/awap-execute'
import { atk005 } from './attacks/ATK-005'
import { atk001 } from './attacks/ATK-001'
import { atk013 } from './attacks/ATK-013'
import { atk004 } from './attacks/ATK-004'
import { atk003 } from './attacks/ATK-003'
import { atk002 } from './attacks/ATK-002'
import { atk008 } from './attacks/ATK-008'
import { atk006 } from './attacks/ATK-006'
import { atk011 } from './attacks/ATK-011'
import { atk012 } from './attacks/ATK-012'
import { atk007 } from './attacks/ATK-007'
import { atk010 } from './attacks/ATK-010'
import { atk015 } from './attacks/ATK-015'
import { atk014 } from './attacks/ATK-014'
import { atk009 } from './attacks/ATK-009'

const ATTACKS: Record<string, () => { outcome: 'DETECTED' | 'BLOCKED' | 'UNDETECTED' | 'PARTIAL' | 'PENDING'; evidence: string[]; detection_latency_ms: number | null }> = {
  'ATK-005': atk005,
  'ATK-001': atk001,
  'ATK-013': atk013,
  'ATK-004': atk004,
  'ATK-003': atk003,
  'ATK-002': atk002,
  'ATK-008': atk008,
  'ATK-006': atk006,
  'ATK-011': atk011,
  'ATK-012': atk012,
  'ATK-007': atk007,
  'ATK-010': atk010,
  'ATK-015': atk015,
  'ATK-014': atk014,
  'ATK-009': atk009,
}

const args = process.argv.slice(2)
if (args[0] !== 'run' || !args[1]) {
  console.error('Usage: awap-execute.ts run <ATK-XXX>')
  process.exit(1)
}

const attackId = args[1]
const attackFn = ATTACKS[attackId]

if (!attackFn) {
  console.error(`Unknown attack: ${attackId}`)
  process.exit(1)
}

const executor = new AWAPExecutor('executor_SBS', '.awap')

if (attackId === 'ATK-005') {
  executor.commence()
}

const record = executor.execute(attackId, attackFn)
console.log(JSON.stringify(record, null, 2))
