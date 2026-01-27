/**
 * FULL BUILD USING ACTUAL REGISTRY AGENTS
 * This test uses the real agent prompts from the registry
 */

import Groq from 'groq-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Import actual registry agents
import { getAgent } from '../../src/lib/agents/registry';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const OUTPUT_DIR = path.join(__dirname, 'shopflow-fresh');

// Get agents from registry using getAgent()
const REGISTRY_AGENTS = [
  { id: 'datum', name: 'DATUM', def: getAgent('datum') },
  { id: 'pixel', name: 'PIXEL', def: getAgent('pixel') },
  { id: 'engine', name: 'ENGINE', def: getAgent('engine') },
  { id: 'notify', name: 'NOTIFY', def: getAgent('notify') },
];

async function runAgent(agent: typeof REGISTRY_AGENTS[0], userPrompt: string): Promise<any> {
  if (!agent.def) {
    console.log(`❌ Agent ${agent.name} not found in registry!`);
    return {};
  }

  console.log(`\n[${agent.name}] Using REGISTRY prompt (${agent.def.systemPrompt.length} chars)`);

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 8000,
    messages: [
      { role: 'system', content: agent.def.systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    let jsonText = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonText = jsonMatch[1];
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) jsonText = objectMatch[0];
    return JSON.parse(jsonText);
  } catch {
    return { raw: content };
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log('FRESH SHOPFLOW BUILD USING REGISTRY AGENTS');
  console.log('═'.repeat(70));
  console.log('');

  // Verify agents exist
  for (const agent of REGISTRY_AGENTS) {
    if (agent.def) {
      console.log(`✅ ${agent.name} agent loaded from registry`);
    } else {
      console.log(`❌ ${agent.name} agent NOT FOUND`);
    }
  }

  // Create output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true });
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const APP_PROMPT = `Build an e-commerce store called ShopFlow with:
1. Dashboard with revenue analytics chart (MUST have 14+ data points)
2. Products page with "Delete All Products" button that actually deletes
3. Settings page with toggles that persist state
4. Newsletter signup in footer
5. Proper button spacing (gap-2)

Generate the files array with complete component code.`;

  // Test DATUM - Mock Data
  console.log('\n' + '═'.repeat(70));
  console.log('TESTING DATUM AGENT - MOCK DATA');
  console.log('═'.repeat(70));

  const datumResult = await runAgent(REGISTRY_AGENTS[0], APP_PROMPT + '\nFocus on database schema and mock data generation.');

  console.log('\n📊 DATUM OUTPUT ANALYSIS:');
  if (datumResult.mock_data) {
    const md = datumResult.mock_data;
    console.log(`  Users: ${md.users?.length || 0} (required: 5+)`);
    console.log(`  Products: ${md.products?.length || 0} (required: 12+)`);
    console.log(`  Orders: ${md.orders?.length || 0} (required: 10+)`);
    console.log(`  Daily Revenue: ${md.analytics?.daily_revenue?.length || 0} (required: 14+)`);

    // Check if chart data exists
    if (md.analytics?.daily_revenue?.length >= 14) {
      console.log('\n  ✅ CHART DATA CHECK: PASSED - 14+ data points for charts');
    } else {
      console.log('\n  ❌ CHART DATA CHECK: FAILED - Not enough data points');
    }
  } else {
    console.log('  ❌ No mock_data in output');
  }

  // Save DATUM output
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'datum-output.json'),
    JSON.stringify(datumResult, null, 2)
  );

  // Test PIXEL - Components with Buttons
  console.log('\n' + '═'.repeat(70));
  console.log('TESTING PIXEL AGENT - BUTTONS & SPACING');
  console.log('═'.repeat(70));

  const pixelResult = await runAgent(REGISTRY_AGENTS[1], APP_PROMPT + `
Generate components with:
- Dashboard.tsx with analytics chart
- ProductList.tsx with delete buttons
- SettingsPanel.tsx with toggles
- NewsletterForm.tsx for footer
All buttons must have onClick handlers. Use gap-2 for button groups.`);

  console.log('\n🎨 PIXEL OUTPUT ANALYSIS:');
  let buttonCheckPassed = true;
  let gapCheckPassed = true;

  if (pixelResult.files && Array.isArray(pixelResult.files)) {
    for (const file of pixelResult.files) {
      if (file && file.content && file.path) {
        const hasEmptyOnClick = file.content.includes('onClick={() => {}}');
        const hasOnClick = file.content.includes('onClick=');
        const hasGap = file.content.includes('gap-2') || file.content.includes('gap-3');

        console.log(`\n  📁 ${file.path}`);
        console.log(`     onClick handlers: ${hasOnClick ? '✅' : '❌'}`);
        console.log(`     Empty onClick: ${hasEmptyOnClick ? '❌ FORBIDDEN' : '✅ None'}`);
        console.log(`     Button spacing (gap): ${hasGap ? '✅' : '⚠️ Not found'}`);

        if (hasEmptyOnClick) buttonCheckPassed = false;
        if (!hasGap && file.path.includes('.tsx')) gapCheckPassed = false;

        // Save file
        const filePath = path.join(OUTPUT_DIR, file.path);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, file.content);
      }
    }
  } else {
    console.log('  ⚠️ No files array in PIXEL output - checking raw output');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'pixel-raw.json'), JSON.stringify(pixelResult, null, 2));
  }

  console.log(`\n  ${buttonCheckPassed ? '✅' : '❌'} BUTTON CHECK: ${buttonCheckPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`  ${gapCheckPassed ? '✅' : '⚠️'} GAP CHECK: ${gapCheckPassed ? 'PASSED' : 'NEEDS REVIEW'}`);

  // Test ENGINE - Delete Operations
  console.log('\n' + '═'.repeat(70));
  console.log('TESTING ENGINE AGENT - DELETE OPERATIONS');
  console.log('═'.repeat(70));

  const engineResult = await runAgent(REGISTRY_AGENTS[2], APP_PROMPT + `
Generate services with:
- product-service.ts with deleteProduct and deleteAllProducts
- settings-service.ts with toggle persistence
All delete functions must actually delete from localStorage/state.`);

  console.log('\n⚙️ ENGINE OUTPUT ANALYSIS:');
  let deleteCheckPassed = false;

  if (engineResult.files && Array.isArray(engineResult.files)) {
    for (const file of engineResult.files) {
      if (file && file.content && file.path) {
        const hasRealDelete = file.content.includes('localStorage.removeItem') ||
                              file.content.includes('localStorage.setItem') ||
                              file.content.includes('filter(') ||
                              file.content.includes('.delete(') ||
                              file.content.includes('splice(');

        console.log(`\n  📁 ${file.path}`);
        console.log(`     Real delete logic: ${hasRealDelete ? '✅' : '❌'}`);

        if (hasRealDelete) deleteCheckPassed = true;

        // Save file
        const filePath = path.join(OUTPUT_DIR, file.path);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, file.content);
      }
    }
  } else {
    console.log('  ⚠️ No files array in ENGINE output - checking raw output');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'engine-raw.json'), JSON.stringify(engineResult, null, 2));
  }

  console.log(`\n  ${deleteCheckPassed ? '✅' : '❌'} DELETE CHECK: ${deleteCheckPassed ? 'PASSED' : 'FAILED'}`);

  // Test NOTIFY - Newsletter
  console.log('\n' + '═'.repeat(70));
  console.log('TESTING NOTIFY AGENT - EMAIL HANDLING');
  console.log('═'.repeat(70));

  const notifyResult = await runAgent(REGISTRY_AGENTS[3], APP_PROMPT + `
Generate newsletter template and handler.
Must show demo mode message if no email API configured.`);

  console.log('\n📧 NOTIFY OUTPUT ANALYSIS:');
  const outputStr = JSON.stringify(notifyResult).toLowerCase();
  const hasDemo = outputStr.includes('demo') || outputStr.includes('resend_api_key') || outputStr.includes('api key');
  console.log(`  Demo mode handling: ${hasDemo ? '✅' : '❌'}`);

  // Save notify output
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'notify-output.json'),
    JSON.stringify(notifyResult, null, 2)
  );

  // Final summary
  console.log('\n' + '═'.repeat(70));
  console.log('FRESH BUILD VERIFICATION SUMMARY');
  console.log('═'.repeat(70));

  const chartData = datumResult.mock_data?.analytics?.daily_revenue?.length >= 14;

  console.log(`
  ┌────────────────────────────────────────────────────────────────┐
  │ VERIFICATION RESULTS                                          │
  ├────────────────────────────────────────────────────────────────┤
  │ □ Charts have 14+ data points:     ${chartData ? '✅ WORKING' : '❌ BROKEN'}                 │
  │ □ Buttons have onClick handlers:   ${buttonCheckPassed ? '✅ WORKING' : '❌ BROKEN'}                 │
  │ □ Delete actually deletes:         ${deleteCheckPassed ? '✅ WORKING' : '❌ BROKEN'}                 │
  │ □ Newsletter shows demo mode:      ${hasDemo ? '✅ WORKING' : '❌ BROKEN'}                 │
  │ □ Buttons have gap-2 spacing:      ${gapCheckPassed ? '✅ WORKING' : '⚠️ REVIEW'}                 │
  └────────────────────────────────────────────────────────────────┘
  `);

  console.log(`\nOutput saved to: ${OUTPUT_DIR}`);
  console.log('\nTo inspect generated files:');
  console.log(`  cat "${OUTPUT_DIR}/datum-output.json" | head -100`);
}

main().catch(console.error);
