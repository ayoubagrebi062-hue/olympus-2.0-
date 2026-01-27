#!/usr/bin/env ts-node

import * as path from 'path'
import { AWAPExecutor } from '../src/lib/cockpit/witness/awap-execute'

const OUTPUT_DIR = path.resolve(__dirname, '../.awap')
const EXECUTOR_ID = `executor_${process.env.USER || 'awap'}_${Date.now()}`

const executor = new AWAPExecutor(EXECUTOR_ID, OUTPUT_DIR)
const marker = executor.commence()

console.log(JSON.stringify(marker, null, 2))
process.exit(0)
