/**
 * OLYMPUS 2.0 - VALIDATION STRESS TEST
 * Tests all validators against simulated outputs of varying quality
 *
 * Run with: npx ts-node src/lib/agents/validation/__tests__/stress-test.ts
 *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import { extractRequiredFeatures, validateFeatures } from '../feature-validator';
import { validateHandlers } from '../handler-validator';
import { validateComplexity } from '../complexity-validator';
import { validateDesignTokens } from '../design-validator';

// ============================================================================
// TEST CASE 1: STUB OUTPUT (What broken builds look like)
// This simulates what OLYMPUS currently outputs when it fails
// ============================================================================

const STUB_PAGE = `
'use client';

export default function HomePage() {
  return (
    <div>
      <h1>Home Page</h1>
    </div>
  );
}
`;

// ============================================================================
// TEST CASE 2: MINIMAL OUTPUT (Slightly better but still bad)
// Has some components but missing critical features
// ============================================================================

const MINIMAL_PAGE = `
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  const handleClick = () => {
    console.log('clicked');
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Card className="p-4 mt-4">
        <p>Welcome to your dashboard</p>
        <Button onClick={handleClick}>Click me</Button>
      </Card>
    </div>
  );
}
`;

// ============================================================================
// TEST CASE 3: MEDIUM OUTPUT (Has features but quality issues)
// Has state, handlers, but hardcoded colors and some fake handlers
// ============================================================================

const MEDIUM_PAGE = `
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now().toString(), title: newTask, status: 'todo' }]);
    setNewTask('');
  };

  const handleDeleteTask = (id: string) => {
    console.log('delete', id); // FAKE HANDLER
  };

  const handleDragStart = () => {
    // TODO: implement drag
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-6">
      <h1 className="text-3xl font-bold text-[#ffffff] mb-6">Kanban Board</h1>

      <div className="flex gap-4 mb-6">
        <Input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task..."
          className="bg-[#1a1a1b] border-[#333]"
        />
        <Button onClick={handleAddTask} className="bg-[#7c3aed]">
          Add Task
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#141416] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">To Do</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.filter(t => t.status === 'todo').map(task => (
              <div key={task.id} className="p-2 bg-[#1c1c1f] rounded mb-2">
                {task.title}
                <Button variant="ghost" onClick={() => handleDeleteTask(task.id)}>
                  Delete
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#141416] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.filter(t => t.status === 'in-progress').map(task => (
              <div key={task.id} className="p-2 bg-[#1c1c1f] rounded mb-2">
                {task.title}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#141416] border-[#27272a]">
          <CardHeader>
            <CardTitle className="text-[#fafafa]">Done</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.filter(t => t.status === 'done').map(task => (
              <div key={task.id} className="p-2 bg-[#1c1c1f] rounded mb-2">
                {task.title}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
`;

// ============================================================================
// TEST CASE 4: GOOD OUTPUT (What we want OLYMPUS to produce)
// Full features, real handlers, design tokens, proper complexity
// ============================================================================

const GOOD_PAGE = `
'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Trash2, Edit, GripVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

interface Column {
  id: string;
  title: string;
  status: Task['status'];
}

const COLUMNS: Column[] = [
  { id: 'todo', title: 'To Do', status: 'todo' },
  { id: 'in-progress', title: 'In Progress', status: 'in-progress' },
  { id: 'done', title: 'Done', status: 'done' },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    setIsLoading(true);
    try {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: newTaskTitle.trim(),
        status: 'todo',
        priority: 'medium',
        createdAt: new Date(),
      };

      setTasks(prev => [...prev, newTask]);
      setNewTaskTitle('');
      setIsAddDialogOpen(false);
      toast.success('Task created successfully');
    } catch (error) {
      toast.error('Failed to create task');
    } finally {
      setIsLoading(false);
    }
  }, [newTaskTitle]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success('Task deleted');
  }, []);

  const handleUpdateTaskStatus = useCallback((taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];

    handleUpdateTaskStatus(taskId, newStatus);
    toast.success('Task moved');
  }, [handleUpdateTaskStatus]);

  const getTasksByStatus = useCallback((status: Task['status']) => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  if (isLoading && tasks.length === 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kanban Board</h1>
          <p className="text-muted-foreground mt-1">
            {tasks.length} tasks across {COLUMNS.length} columns
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask} disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Columns */}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map(column => (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border-border h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {column.title}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                      {getTasksByStatus(column.status).length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <SortableContext
                    items={getTasksByStatus(column.status).map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <AnimatePresence mode="popLayout">
                      {getTasksByStatus(column.status).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No tasks yet</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => setIsAddDialogOpen(true)}
                          >
                            Add a task
                          </Button>
                        </div>
                      ) : (
                        getTasksByStatus(column.status).map(task => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            whileHover={{ y: -2 }}
                            className={cn(
                              "p-3 rounded-lg mb-2 cursor-grab active:cursor-grabbing",
                              "bg-background border border-border",
                              "hover:border-primary/50 hover:shadow-md",
                              "transition-all duration-200"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{task.title}</span>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </SortableContext>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
`;

// ============================================================================
// TEST RESULT INTERFACE
// ============================================================================

export interface TestResult {
  testCase: string;
  lineCount: number;
  featureScore: number;
  featureValid: boolean;
  featuresMissing: string[];
  handlerScore: number;
  handlerValid: boolean;
  fakeHandlers: number;
  realHandlers: number;
  complexityScore: number;
  complexityValid: boolean;
  complexityViolations: string[];
  designScore: number;
  designValid: boolean;
  hardcodedColors: number;
  hardcodedSpacing: number;
  overallPass: boolean;
}

// ============================================================================
// RUN ALL VALIDATORS ON A TEST CASE
// ============================================================================

export function runValidators(code: string, name: string, userPrompt: string): TestResult {
  // Feature validation
  const requirements = extractRequiredFeatures(userPrompt);
  const featureResult = validateFeatures(code, requirements);

  // Handler validation
  const handlerResult = validateHandlers(code);

  // Complexity validation
  const complexityResult = validateComplexity(code, 'src/app/kanban/page.tsx');

  // Design token validation
  const designResult = validateDesignTokens(code);

  return {
    testCase: name,
    lineCount: code.split('\n').length,

    featureScore: featureResult.score,
    featureValid: featureResult.valid,
    featuresMissing: featureResult.missingFeatures,

    handlerScore: handlerResult.score,
    handlerValid: handlerResult.valid,
    fakeHandlers: handlerResult.fakeHandlers,
    realHandlers: handlerResult.realHandlers,

    complexityScore: complexityResult.score,
    complexityValid: complexityResult.valid,
    complexityViolations: complexityResult.violations.map(v => v.metric),

    designScore: designResult.score,
    designValid: designResult.valid,
    hardcodedColors: designResult.summary.hardcodedColors,
    hardcodedSpacing: designResult.summary.hardcodedSpacing,

    overallPass:
      featureResult.valid && handlerResult.valid && complexityResult.valid && designResult.valid,
  };
}

// ============================================================================
// TEST CASES
// ============================================================================

export const TEST_CASES = [
  { name: 'STUB (Broken)', code: STUB_PAGE },
  { name: 'MINIMAL (Poor)', code: MINIMAL_PAGE },
  { name: 'MEDIUM (Okay)', code: MEDIUM_PAGE },
  { name: 'GOOD (Target)', code: GOOD_PAGE },
];

// ============================================================================
// MAIN EXECUTION
// ============================================================================

function main() {
  const USER_PROMPT = 'Build a kanban board like Linear with dark theme and drag-and-drop';

  console.log('');
  console.log('='.repeat(80));
  console.log('  OLYMPUS 2.0 VALIDATION STRESS TEST');
  console.log('='.repeat(80));
  console.log('');
  console.log(`User Prompt: "${USER_PROMPT}"`);
  console.log('');

  const results: TestResult[] = [];

  for (const tc of TEST_CASES) {
    console.log('');
    console.log('-'.repeat(80));
    console.log(`  Testing: ${tc.name}`);
    console.log('-'.repeat(80));

    const result = runValidators(tc.code, tc.name, USER_PROMPT);
    results.push(result);

    console.log(`  Lines of code: ${result.lineCount}`);
    console.log('');

    // Feature Validator
    const featureIcon = result.featureValid ? '\u2705' : '\u274C';
    console.log(`  FEATURE VALIDATOR ${featureIcon}`);
    console.log(`    Score: ${result.featureScore}/100`);
    console.log(
      `    Missing: ${result.featuresMissing.length > 0 ? result.featuresMissing.join(', ') : 'none'}`
    );
    console.log('');

    // Handler Validator
    const handlerIcon = result.handlerValid ? '\u2705' : '\u274C';
    console.log(`  HANDLER VALIDATOR ${handlerIcon}`);
    console.log(`    Score: ${result.handlerScore}%`);
    console.log(`    Real Handlers: ${result.realHandlers}`);
    console.log(`    Fake Handlers: ${result.fakeHandlers}`);
    console.log('');

    // Complexity Validator
    const complexityIcon = result.complexityValid ? '\u2705' : '\u274C';
    console.log(`  COMPLEXITY VALIDATOR ${complexityIcon}`);
    console.log(`    Score: ${result.complexityScore}%`);
    console.log(
      `    Violations: ${result.complexityViolations.length > 0 ? result.complexityViolations.join(', ') : 'none'}`
    );
    console.log('');

    // Design Token Validator
    const designIcon = result.designValid ? '\u2705' : '\u274C';
    console.log(`  DESIGN TOKEN VALIDATOR ${designIcon}`);
    console.log(`    Score: ${result.designScore}/100`);
    console.log(`    Hardcoded Colors: ${result.hardcodedColors}`);
    console.log(`    Hardcoded Spacing: ${result.hardcodedSpacing}`);
    console.log('');

    // Overall
    const overallIcon = result.overallPass ? '\u2705 PASS' : '\u274C FAIL';
    console.log(`  OVERALL: ${overallIcon}`);
  }

  // Summary Table
  console.log('');
  console.log('='.repeat(80));
  console.log('  SUMMARY TABLE');
  console.log('='.repeat(80));
  console.log('');
  console.log('| Test Case       | Lines | Feature | Handler | Complex | Design | PASS  |');
  console.log('|-----------------|-------|---------|---------|---------|--------|-------|');

  for (const r of results) {
    const passIcon = r.overallPass ? ' YES ' : ' NO  ';
    console.log(
      `| ${r.testCase.padEnd(15)} | ${String(r.lineCount).padStart(5)} | ${String(r.featureScore + '%').padStart(7)} | ${String(r.handlerScore + '%').padStart(7)} | ${String(r.complexityScore + '%').padStart(7)} | ${String(r.designScore).padStart(6)} | ${passIcon} |`
    );
  }

  // Validation Effectiveness Check
  console.log('');
  console.log('='.repeat(80));
  console.log('  VALIDATION EFFECTIVENESS');
  console.log('='.repeat(80));
  console.log('');

  const stubResult = results.find(r => r.testCase.includes('STUB'))!;
  const goodResult = results.find(r => r.testCase.includes('GOOD'))!;

  const stubRejected = !stubResult.overallPass;
  const goodAccepted = goodResult.overallPass;

  console.log(
    `  Does STUB output get REJECTED? ${stubRejected ? '\u2705 YES (correct)' : '\u274C NO (problem!)'}`
  );
  console.log(
    `  Does GOOD output get ACCEPTED? ${goodAccepted ? '\u2705 YES (correct)' : '\u274C NO (problem!)'}`
  );
  console.log('');

  if (stubRejected && goodAccepted) {
    console.log('  \u2705 VALIDATION SYSTEM IS WORKING CORRECTLY');
  } else {
    console.log('  \u26A0\uFE0F  VALIDATION SYSTEM NEEDS TUNING');
    if (!stubRejected) {
      console.log('    - STUB output should be REJECTED but passed');
    }
    if (!goodAccepted) {
      console.log('    - GOOD output should be ACCEPTED but failed');
    }
  }

  console.log('');
  console.log('='.repeat(80));

  return results;
}

// Run if executed directly
const results = main();
export { results };
