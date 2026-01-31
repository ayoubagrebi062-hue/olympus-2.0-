/**
 * Vision System - Basic Usage Examples
 *
 * Run: npx ts-node examples/basic.ts
 * (Requires ANTHROPIC_API_KEY environment variable)
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { vision, visionStream, streamToConsole } from '../index';

async function main() {
  console.log('═'.repeat(60));
  console.log('  VISION SYSTEM - Basic Examples');
  console.log('═'.repeat(60));
  console.log();

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set');
    console.error('   Run: export ANTHROPIC_API_KEY="sk-ant-..."');
    process.exit(1);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EXAMPLE 1: Simple one-liner
  // ════════════════════════════════════════════════════════════════════════════

  console.log('📝 Example 1: Simple one-liner\n');
  console.log('Code: const code = await vision("Create a button");');
  console.log('-'.repeat(60));

  try {
    const code = await vision('Create a simple React button component with hover effect', {
      quiet: false, // Show progress
    });

    console.log('\n✅ Generated code:');
    console.log(code.substring(0, 500) + (code.length > 500 ? '\n...(truncated)' : ''));
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n');

  // ════════════════════════════════════════════════════════════════════════════
  // EXAMPLE 2: Streaming
  // ════════════════════════════════════════════════════════════════════════════

  console.log('📝 Example 2: Streaming output\n');
  console.log('Code: for await (const chunk of visionStream(...))');
  console.log('-'.repeat(60));

  try {
    let charCount = 0;
    for await (const chunk of visionStream('Create a loading spinner component')) {
      if (chunk.type === 'text' && chunk.text) {
        process.stdout.write(chunk.text);
        charCount += chunk.text.length;

        // Stop early for demo
        if (charCount > 300) {
          console.log('\n...(truncated for demo)');
          break;
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n');

  // ════════════════════════════════════════════════════════════════════════════
  // EXAMPLE 3: Full result with metadata
  // ════════════════════════════════════════════════════════════════════════════

  console.log('📝 Example 3: Full result with metadata\n');
  console.log('Code: const result = await vision.full(...)');
  console.log('-'.repeat(60));

  try {
    const result = await vision.full('Create an error message component', {
      quiet: true,
    });

    console.log(`✅ Generated in ${result.durationMs}ms`);
    console.log(`   Trace ID: ${result.traceId}`);
    console.log(`   Code length: ${result.code.length} characters`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  Examples complete!');
  console.log('═'.repeat(60));
}

// Run if called directly
main().catch(console.error);
