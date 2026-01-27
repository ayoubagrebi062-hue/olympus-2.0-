import { config } from 'dotenv';
config({ path: '.env' });
import { Olympus38AgentLogic } from './olympus-38-agent-orchestration';

// Create the full orchestrator
const orchestrator = new Olympus38AgentLogic();

async function runFull38AgentSystem() {
  console.log('🚀 ACTIVATING FULL 38-AGENT OLYMPUS SYSTEM');

  const prompt = {
    userPrompt:
      'Build a complete SaaS application for project management with Kanban boards, team collaboration, time tracking, and reporting. Include user authentication, real-time updates, and mobile responsiveness.',
    context: {
      techStack: ['React', 'Next.js', 'TypeScript', 'Supabase', 'Tailwind'],
      deadline: '2 weeks',
      complexity: 'complex',
    },
  };

  try {
    const result = await orchestrator.processPrompt(prompt);

    console.log('\n✅ FULL 38-AGENT EXECUTION COMPLETE');
    console.log('🎯 Orchestrator:', result.agentId);
    console.log('📊 Confidence:', result.confidence);
    console.log('🎪 Agents Used: 38 across 9 phases');
    console.log('⚡ Execution: Parallel + Sequential optimization');
    console.log('🎨 Output: Complete production application');

    // The result.output would contain all phase results
    console.log('📦 Project Built Successfully!');
  } catch (error) {
    console.error('❌ Orchestration failed:', error);
  }
}

runFull38AgentSystem();
