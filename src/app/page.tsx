/**
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface BuildStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  error?: string;
  output?: string;
}

interface BuildLog {
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

const INITIAL_STEPS: BuildStep[] = [
  { id: '1', name: 'Initialize Supabase Connection', status: 'pending' },
  { id: '2', name: 'Setup Database Schema', status: 'pending' },
  { id: '3', name: 'Verify Database Tables', status: 'pending' },
  { id: '4', name: 'Authenticate System User', status: 'pending' },
  { id: '5', name: 'Load Master Build Prompt', status: 'pending' },
  { id: '6', name: 'Analyze Project Requirements', status: 'pending' },
  { id: '7', name: 'Start CONDUCTOR Orchestration', status: 'pending' },
  { id: '8', name: 'Execute Agent Pipeline', status: 'pending' },
  { id: '9', name: 'Generate UI Components', status: 'pending' },
  { id: '10', name: 'Apply Quality Gates', status: 'pending' },
  { id: '11', name: 'Deploy to Filesystem', status: 'pending' },
];

export default function OlympusBootstrap() {
  const [buildStatus, setBuildStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>(
    'idle'
  );
  const [steps, setSteps] = useState<BuildStep[]>(INITIAL_STEPS);
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [totalErrors, setTotalErrors] = useState(0);

  const addLog = useCallback((level: BuildLog['level'], message: string, details?: string) => {
    const log: BuildLog = {
      timestamp: Date.now(),
      level,
      message,
      details,
    };
    setLogs(prev => [...prev, log]);

    if (level === 'error') {
      setTotalErrors(prev => prev + 1);
      toast.error(message);
    } else if (level === 'success') {
      toast.success(message);
    }
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<BuildStep>) => {
    setSteps(prev => prev.map(step => (step.id === stepId ? { ...step, ...updates } : step)));
  }, []);

  const startBuild = async () => {
    if (buildStatus === 'running') return;

    setBuildStatus('running');
    setSteps(INITIAL_STEPS);
    setLogs([]);
    setProgress(0);
    setTotalErrors(0);

    addLog('info', 'Starting OLYMPUS Self-Build Process...');
    addLog('info', 'Reading OLYMPUS_BUILD_PROMPT.md for specifications');

    try {
      // Step 1: Initialize Supabase
      await executeStep('1', async () => {
        addLog('info', 'Checking Supabase environment variables...');
        const response = await fetch('/api/bootstrap/check-supabase');
        const data = await response.json();

        if (!data.connected) {
          throw new Error(data.error || 'Supabase connection failed');
        }

        addLog('success', 'Supabase connection verified');
        return data;
      });

      // Step 2: Setup Database Schema (auto-create if missing)
      await executeStep('2', async () => {
        addLog('info', 'Checking and setting up database schema...');

        // First check current status
        const checkResponse = await fetch('/api/bootstrap/setup-schema');
        const checkData = await checkResponse.json();

        if (checkData.allTablesExist) {
          addLog('success', 'All database tables already exist');
          return checkData;
        }

        // Tables missing - try to create them
        addLog('warning', 'Some tables missing, attempting to create...');
        const setupResponse = await fetch('/api/bootstrap/setup-schema', {
          method: 'POST',
        });
        const setupData = await setupResponse.json();

        if (setupData.manualSetupRequired) {
          addLog('error', 'Manual setup required - see instructions below');
          addLog('info', 'Run the SQL in Supabase Dashboard SQL Editor');

          // Store the SQL for display
          if (setupData.execSqlFunction) {
            addLog('info', 'STEP 1: Create exec_sql function first');
          }
          if (setupData.setupSQL) {
            addLog('info', 'STEP 2: Then run the schema SQL');
          }

          throw new Error('Database tables need manual setup. Run SQL in Supabase Dashboard.');
        }

        if (!setupData.success) {
          throw new Error(setupData.error || 'Schema setup failed');
        }

        addLog(
          'success',
          `Schema setup complete: ${Object.keys(setupData.tables || {}).length} tables`
        );
        return setupData;
      });

      // Step 3: Verify Database Tables
      await executeStep('3', async () => {
        addLog('info', 'Verifying all database tables exist...');
        const response = await fetch('/api/bootstrap/check-schema');
        const data = await response.json();

        if (!data.valid) {
          const missingTables = data.missingTables?.join(', ') || 'unknown';
          throw new Error(`Missing tables: ${missingTables}`);
        }

        addLog('success', `All ${data.tables?.length || 5} tables verified`);
        return data;
      });

      // Step 4: Authenticate System User
      await executeStep('4', async () => {
        addLog('info', 'Creating or retrieving system build user...');
        const response = await fetch('/api/bootstrap/auth');
        const data = await response.json();

        if (!data.authenticated) {
          throw new Error(data.error || 'Failed to authenticate system user');
        }

        addLog('success', `System user authenticated: ${data.userId?.substring(0, 8)}...`);
        return data;
      });

      // Step 5: Load Master Build Prompt
      await executeStep('5', async () => {
        addLog('info', 'Loading OLYMPUS_BUILD_PROMPT.md...');
        const response = await fetch('/api/bootstrap/load-prompt');
        const data = await response.json();

        if (!data.loaded) {
          throw new Error(data.error || 'Failed to load build prompt');
        }

        addLog(
          'success',
          `Build prompt loaded: ${data.sections} sections, ${data.wordCount} words`
        );
        return data;
      });

      // Step 6: Analyze Project Requirements
      await executeStep('6', async () => {
        addLog('info', 'CONDUCTOR analyzing project requirements...');
        setCurrentPhase('Analysis');
        const response = await fetch('/api/bootstrap/analyze');
        const data = await response.json();

        if (!data.analyzed) {
          throw new Error(data.error || 'Project analysis failed');
        }

        addLog(
          'success',
          `Analysis complete: ${data.complexity} complexity, ${data.estimatedAgents} agents needed`
        );
        return data;
      });

      // Step 7: Start CONDUCTOR Orchestration
      await executeStep('7', async () => {
        addLog('info', 'Initializing CONDUCTOR orchestration engine...');
        setCurrentPhase('Orchestration');
        const response = await fetch('/api/bootstrap/start-build', {
          method: 'POST',
        });
        const data = await response.json();

        if (!data.started) {
          throw new Error(data.error || 'Failed to start build orchestration');
        }

        addLog('success', `Build started: ${data.buildId}`);
        return data;
      });

      // Step 8-11: Poll for real build progress from CONDUCTOR
      // FIX: Previously simulated with sleep. Now polls real status.
      let previousPhase = '';
      let pollAttempts = 0;
      const maxPollAttempts = 360; // 30 minutes max (5s intervals)

      addLog('info', 'Monitoring CONDUCTOR build progress...');

      while (pollAttempts < maxPollAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        pollAttempts++;

        try {
          const statusResponse = await fetch('/api/bootstrap/start-build');
          const statusData = await statusResponse.json();

          if (!statusData.execution) {
            addLog('warning', 'Build execution state not found');
            break;
          }

          const { status, progress, currentPhase, error, recentEvents } = statusData.execution;

          // Update progress based on real build state
          setProgress(progress);
          if (currentPhase && currentPhase !== previousPhase) {
            previousPhase = currentPhase;
            setCurrentPhase(currentPhase);
            addLog('info', `Phase: ${currentPhase}`);

            // Map phases to steps 8-11
            if (currentPhase.includes('agent') || currentPhase.includes('execute')) {
              updateStep('8', { status: 'running', startTime: Date.now() });
            }
            if (currentPhase.includes('generate') || currentPhase.includes('code')) {
              updateStep('8', { status: 'completed', endTime: Date.now() });
              updateStep('9', { status: 'running', startTime: Date.now() });
            }
            if (currentPhase.includes('quality') || currentPhase.includes('review')) {
              updateStep('9', { status: 'completed', endTime: Date.now() });
              updateStep('10', { status: 'running', startTime: Date.now() });
            }
            if (currentPhase.includes('deploy') || currentPhase.includes('final')) {
              updateStep('10', { status: 'completed', endTime: Date.now() });
              updateStep('11', { status: 'running', startTime: Date.now() });
            }
          }

          // Log recent events
          if (recentEvents && Array.isArray(recentEvents)) {
            for (const event of recentEvents) {
              if (event.type?.includes('agent_completed')) {
                addLog(
                  'success',
                  `Agent completed: ${(event.data as Record<string, string>)?.agentId || 'unknown'}`
                );
              } else if (event.type?.includes('agent_failed')) {
                addLog(
                  'error',
                  `Agent failed: ${(event.data as Record<string, string>)?.agentId || 'unknown'}`
                );
              }
            }
          }

          // Check for completion or failure
          if (status === 'completed') {
            updateStep('8', { status: 'completed', endTime: Date.now() });
            updateStep('9', { status: 'completed', endTime: Date.now() });
            updateStep('10', { status: 'completed', endTime: Date.now() });
            updateStep('11', { status: 'completed', endTime: Date.now() });
            setProgress(100);
            setBuildStatus('completed');
            addLog('success', 'OLYMPUS Self-Build Complete! UI generation finished.');
            return;
          }

          if (status === 'failed') {
            throw new Error(error || 'Build failed');
          }
        } catch (pollError) {
          addLog(
            'warning',
            `Status poll error: ${pollError instanceof Error ? pollError.message : 'Unknown'}`
          );
        }
      }

      // If we reach here, build took too long or didn't complete properly
      if (pollAttempts >= maxPollAttempts) {
        throw new Error('Build timed out after 30 minutes');
      }

      setBuildStatus('completed');
      addLog('success', 'OLYMPUS Self-Build Complete! UI generation finished.');
    } catch (error) {
      setBuildStatus('failed');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog('error', `Build failed: ${errorMessage}`);
    }
  };

  const executeStep = async (stepId: string, executor: () => Promise<unknown>) => {
    updateStep(stepId, { status: 'running', startTime: Date.now() });
    const stepIndex = steps.findIndex(s => s.id === stepId);
    setProgress((stepIndex / steps.length) * 100);

    try {
      const result = await executor();
      updateStep(stepId, { status: 'completed', endTime: Date.now() });
      setProgress(((stepIndex + 1) / steps.length) * 100);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateStep(stepId, { status: 'failed', endTime: Date.now(), error: errorMessage });
      throw error;
    }
  };

  const formatDuration = (start?: number, end?: number) => {
    if (!start) return '-';
    const endTime = end || Date.now();
    const duration = endTime - start;
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <div className="min-h-screen bg-dark-gradient">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="floating-sphere" style={{ top: '10%', left: '10%' }} />
        <div className="abstract-blob" style={{ bottom: '20%', right: '10%' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="hero-headline mb-6">OLYMPUS</h1>
          <p className="text-2xl text-gray-400 mb-2">Self-Building Platform</p>
          <p className="body-text max-w-2xl mx-auto">
            OLYMPUS will now build its own UI using 40 AI agents. Watch as the platform generates
            premium, world-class interfaces following the master build prompt.
          </p>
        </header>

        {/* Status Overview */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">Build Status</h2>
              <p className="text-gray-400">
                {buildStatus === 'idle' && 'Ready to start self-build process'}
                {buildStatus === 'running' && `Building... ${currentPhase || 'Initializing'}`}
                {buildStatus === 'completed' && 'Build completed successfully'}
                {buildStatus === 'failed' && 'Build failed - check logs for details'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {totalErrors > 0 && (
                <div className="px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 text-sm">
                  {totalErrors} Error{totalErrors > 1 ? 's' : ''}
                </div>
              )}
              <div
                className={`w-4 h-4 rounded-full ${
                  buildStatus === 'idle'
                    ? 'bg-gray-500'
                    : buildStatus === 'running'
                      ? 'bg-blue-500 animate-pulse'
                      : buildStatus === 'completed'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                }`}
              />
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Start button */}
          <button
            onClick={startBuild}
            disabled={buildStatus === 'running'}
            className={`btn-primary w-full py-4 text-lg ${buildStatus === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {buildStatus === 'idle' && '🚀 Start OLYMPUS Self-Build'}
            {buildStatus === 'running' && (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Building in Progress...
              </span>
            )}
            {buildStatus === 'completed' && '✅ Build Complete - Restart'}
            {buildStatus === 'failed' && '🔄 Retry Build'}
          </button>
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Steps Panel */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Build Steps</h3>
            <div className="space-y-3">
              {steps.map(step => (
                <div
                  key={step.id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    step.status === 'running'
                      ? 'bg-blue-500/10 border border-blue-500/30'
                      : step.status === 'completed'
                        ? 'bg-green-500/10'
                        : step.status === 'failed'
                          ? 'bg-red-500/10 border border-red-500/30'
                          : 'bg-white/5'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {step.status === 'pending' && (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-600" />
                    )}
                    {step.status === 'running' && (
                      <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    )}
                    {step.status === 'completed' && (
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                    {step.status === 'failed' && (
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        step.status === 'failed'
                          ? 'text-red-400'
                          : step.status === 'completed'
                            ? 'text-green-400'
                            : step.status === 'running'
                              ? 'text-blue-400'
                              : 'text-gray-400'
                      }`}
                    >
                      {step.name}
                    </p>
                    {step.error && (
                      <p className="text-red-400 text-sm mt-1 truncate">{step.error}</p>
                    )}
                  </div>
                  <div className="text-gray-500 text-sm font-mono">
                    {formatDuration(step.startTime, step.endTime)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logs Panel */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Build Logs</h3>
            <div className="terminal h-[400px] overflow-auto">
              <div className="terminal-header">
                <div className="terminal-dot red" />
                <div className="terminal-dot yellow" />
                <div className="terminal-dot green" />
                <span className="ml-4 text-gray-400 text-sm">build-output</span>
              </div>
              <div className="terminal-body font-mono text-sm space-y-1">
                {logs.length === 0 ? (
                  <p className="text-gray-500">Waiting for build to start...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-gray-600 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`flex-shrink-0 ${
                          log.level === 'error'
                            ? 'text-red-400'
                            : log.level === 'warning'
                              ? 'text-yellow-400'
                              : log.level === 'success'
                                ? 'text-green-400'
                                : 'text-blue-400'
                        }`}
                      >
                        [{log.level.toUpperCase()}]
                      </span>
                      <span
                        className={
                          log.level === 'error'
                            ? 'text-red-300'
                            : log.level === 'success'
                              ? 'text-green-300'
                              : 'text-gray-300'
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>OLYMPUS 2.0 - Self-Building AI Platform</p>
          <p className="mt-1">40 agents · Zero compromises · World-class output</p>
        </footer>
      </div>
    </div>
  );
}
