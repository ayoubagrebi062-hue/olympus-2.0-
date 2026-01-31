/**
 * STRESS TEST V2
 * Tests the production-grade validation system
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import {
  validateHandlersV2,
  generateHandlerReportV2,
  clearValidationCache,
} from '../handler-validator-v2';
import { validateComplexityV2, generateComplexityReportV2 } from '../complexity-validator-v2';
import { validateCodeV2, generateUnifiedReport, quickValidate } from '../unified-validator-v2';

// ============================================================================
// TEST CASES
// ============================================================================

const USER_PROMPT = 'Build a kanban board like Linear with dark theme and drag-and-drop';

const STUB_CODE = `
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
    </div>
  );
}
`;

const MINIMAL_CODE = `
'use client';

export default function KanbanBoard() {
  return (
    <div className="p-4">
      <h1>Kanban Board</h1>
      <button onClick={() => console.log('clicked')}>Add Task</button>
    </div>
  );
}
`;

const PRODUCTION_CODE = `
'use client';

import { useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Search, Filter, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: { name: string; avatar: string };
}

interface Column {
  id: string;
  title: string;
  status: Task['status'];
}

const COLUMNS: Column[] = [
  { id: 'backlog', title: 'Backlog', status: 'backlog' },
  { id: 'todo', title: 'To Do', status: 'todo' },
  { id: 'in-progress', title: 'In Progress', status: 'in-progress' },
  { id: 'done', title: 'Done', status: 'done' },
];

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Implement authentication',
    description: 'Add login and signup functionality',
    status: 'todo',
    priority: 'high',
    assignee: { name: 'John Doe', avatar: '/avatars/john.jpg' },
  },
  {
    id: '2',
    title: 'Design dashboard',
    description: 'Create mockups for the main dashboard',
    status: 'in-progress',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Write documentation',
    description: 'Document API endpoints',
    status: 'backlog',
    priority: 'low',
  },
];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Memoized filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = !filterPriority || task.priority === filterPriority;
      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, filterPriority]);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    return COLUMNS.reduce((acc, column) => {
      acc[column.id] = filteredTasks.filter((task) => task.status === column.status);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [filteredTasks]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task['status'];

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    toast.success('Task moved successfully');
  }, []);

  // Add new task
  const handleAddTask = useCallback(() => {
    if (!newTaskTitle.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: '',
      status: 'backlog',
      priority: 'medium',
    };

    setTasks((prev) => [...prev, newTask]);
    setNewTaskTitle('');
    setIsAddingTask(false);
    toast.success('Task created');
  }, [newTaskTitle]);

  // Delete task
  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    toast.success('Task deleted');
  }, []);

  // Update task
  const handleUpdateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    );
    setEditingTask(null);
    toast.success('Task updated');
  }, []);

  // Handle search
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Handle filter
  const handleFilterChange = useCallback((priority: string | null) => {
    setFilterPriority(priority);
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isAddingTask) {
      handleAddTask();
    }
    if (e.key === 'Escape') {
      setIsAddingTask(false);
      setEditingTask(null);
    }
  }, [isAddingTask, handleAddTask]);

  // Priority badge color
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kanban Board</h1>
          <p className="text-muted-foreground">Manage your tasks efficiently</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-64 pl-10 bg-card border-border"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="border-border">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border-border">
              <DropdownMenuItem onClick={() => handleFilterChange(null)}>
                All Priorities
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('high')}>
                High Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('medium')}>
                Medium Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('low')}>
                Low Priority
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setIsAddingTask(true)} className="bg-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Board */}
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-6">
          {COLUMNS.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-foreground">{column.title}</h2>
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {tasksByColumn[column.id]?.length || 0}
                </Badge>
              </div>
              <SortableContext
                items={tasksByColumn[column.id]?.map((t) => t.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3 min-h-[200px] rounded-lg bg-muted/50 p-3">
                  {tasksByColumn[column.id]?.map((task) => (
                    <Card
                      key={task.id}
                      className="cursor-grab bg-card border-border hover:border-primary/50 transition-colors"
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium text-foreground">
                            {task.title}
                          </CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          {task.assignee && (
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.assignee.avatar} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {task.assignee.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>

      {/* Add Task Dialog */}
      {isAddingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Add New Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                autoFocus
                className="bg-background border-border"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask} className="bg-primary text-primary-foreground">
                  Add Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
`;

// ============================================================================
// TESTS
// ============================================================================

async function runStressTestV2() {
  console.log('='.repeat(80));
  console.log('  OLYMPUS 2.0 VALIDATION STRESS TEST V2 (Production Grade)');
  console.log('='.repeat(80));
  console.log('');
  console.log(`User Prompt: "${USER_PROMPT}"`);
  console.log('');

  // Clear cache for fair testing
  clearValidationCache();

  const testCases = [
    { name: 'STUB', code: STUB_CODE },
    { name: 'MINIMAL', code: MINIMAL_CODE },
    { name: 'PRODUCTION', code: PRODUCTION_CODE },
  ];

  const results: Array<{
    name: string;
    lines: number;
    grade: string;
    score: number;
    confidence: number;
    critical: number;
    handlers: string;
    complexity: string;
    time: number;
    valid: boolean;
  }> = [];

  for (const testCase of testCases) {
    console.log('-'.repeat(80));
    console.log(`  Testing: ${testCase.name}`);
    console.log('-'.repeat(80));

    const result = await validateCodeV2(testCase.code, {
      userPrompt: USER_PROMPT,
      filePath: 'src/app/kanban/page.tsx',
      enableCache: false, // Disable for accurate timing
    });

    console.log(`  Lines of code: ${testCase.code.split('\n').length}`);
    console.log('');
    console.log(
      `  OVERALL: Grade ${result.grade} | Score ${result.score}% | ${result.valid ? '✅ PASS' : '❌ FAIL'}`
    );
    console.log(`  Confidence: ${Math.round(result.confidence * 100)}%`);
    console.log(`  Critical Issues: ${result.criticalIssues.length}`);
    console.log(`  Total Time: ${result.telemetry.totalTimeMs}ms`);
    console.log('');

    // Handler details
    if (result.handlers) {
      console.log(
        `  HANDLERS: ${result.handlers.valid ? '✅' : '❌'} Score ${result.handlers.score}%`
      );
      console.log(
        `    Real: ${result.handlers.realHandlers} | Fake: ${result.handlers.fakeHandlers}`
      );
      if (result.handlers.criticalIssues.length > 0) {
        console.log(
          `    Critical: ${result.handlers.criticalIssues.map(i => i.reason).join(', ')}`
        );
      }
    }

    // Complexity details
    if (result.complexity) {
      console.log(
        `  COMPLEXITY: ${result.complexity.valid ? '✅' : '❌'} Score ${result.complexity.score}%`
      );
      console.log(
        `    Lines: ${result.complexity.metrics.lineCount} | CC: ${result.complexity.metrics.cyclomaticComplexity}`
      );
      if (result.complexity.criticalViolations.length > 0) {
        console.log(
          `    Critical: ${result.complexity.criticalViolations.map(v => v.metric).join(', ')}`
        );
      }
    }

    // Features
    if (result.features) {
      console.log(
        `  FEATURES: ${result.features.valid ? '✅' : '❌'} Score ${result.features.score}%`
      );
      console.log(`    Found: ${result.features.foundFeatures.join(', ') || 'none'}`);
      console.log(`    Missing: ${result.features.missingFeatures.join(', ') || 'none'}`);
    }

    // Fix plan
    if (result.fixPlan.steps.length > 0) {
      console.log('');
      console.log(`  FIX PLAN (${result.fixPlan.estimatedEffort} effort):`);
      for (const step of result.fixPlan.steps.slice(0, 3)) {
        console.log(`    ${step.priority}. [${step.validator}] ${step.action.substring(0, 60)}...`);
      }
    }

    console.log('');

    results.push({
      name: testCase.name,
      lines: testCase.code.split('\n').length,
      grade: result.grade,
      score: result.score,
      confidence: Math.round(result.confidence * 100),
      critical: result.criticalIssues.length,
      handlers: result.handlers?.valid ? 'PASS' : 'FAIL',
      complexity: result.complexity?.valid ? 'PASS' : 'FAIL',
      time: result.telemetry.totalTimeMs,
      valid: result.valid,
    });
  }

  // Summary table
  console.log('='.repeat(80));
  console.log('  SUMMARY TABLE');
  console.log('='.repeat(80));
  console.log('');
  console.log(
    '| Test Case   | Lines | Grade | Score | Conf | Critical | Handler | Complex | Time   | Pass |'
  );
  console.log(
    '|-------------|-------|-------|-------|------|----------|---------|---------|--------|------|'
  );
  for (const r of results) {
    console.log(
      `| ${r.name.padEnd(11)} | ${String(r.lines).padStart(5)} | ${r.grade.padStart(5)} | ${String(r.score).padStart(5)}% | ${String(r.confidence).padStart(4)}% | ${String(r.critical).padStart(8)} | ${r.handlers.padStart(7)} | ${r.complexity.padStart(7)} | ${String(r.time).padStart(5)}ms | ${r.valid ? ' YES' : '  NO'} |`
    );
  }
  console.log('');

  // Cache test
  console.log('='.repeat(80));
  console.log('  CACHE PERFORMANCE TEST');
  console.log('='.repeat(80));
  console.log('');

  // First call (cache miss)
  const firstStart = performance.now();
  await validateCodeV2(PRODUCTION_CODE, { userPrompt: USER_PROMPT, enableCache: true });
  const firstTime = performance.now() - firstStart;

  // Second call (cache hit)
  const secondStart = performance.now();
  const cachedResult = await validateCodeV2(PRODUCTION_CODE, {
    userPrompt: USER_PROMPT,
    enableCache: true,
  });
  const secondTime = performance.now() - secondStart;

  console.log(`  First call (cache miss):  ${Math.round(firstTime)}ms`);
  console.log(`  Second call (cache hit):  ${Math.round(secondTime)}ms`);
  console.log(`  Speedup:                  ${Math.round(firstTime / secondTime)}x`);
  console.log(`  Cache status:             ${cachedResult.telemetry.cacheHit ? 'HIT' : 'MISS'}`);
  console.log('');

  // Quick validate test
  console.log('='.repeat(80));
  console.log('  QUICK VALIDATE (Sync) TEST');
  console.log('='.repeat(80));
  console.log('');

  const quickStart = performance.now();
  for (let i = 0; i < 100; i++) {
    quickValidate(PRODUCTION_CODE);
  }
  const quickTime = performance.now() - quickStart;

  console.log(`  100 quick validations: ${Math.round(quickTime)}ms`);
  console.log(`  Average per validation: ${(quickTime / 100).toFixed(2)}ms`);
  console.log('');

  // Final verdict
  console.log('='.repeat(80));
  console.log('  VALIDATION EFFECTIVENESS');
  console.log('='.repeat(80));
  console.log('');
  console.log(
    `  Does STUB output get REJECTED?      ${results[0].valid ? '❌ NO (bad)' : '✅ YES (correct)'}`
  );
  console.log(
    `  Does MINIMAL output get REJECTED?   ${results[1].valid ? '❌ NO (bad)' : '✅ YES (correct)'}`
  );
  console.log(
    `  Does PRODUCTION output get ACCEPTED? ${results[2].valid ? '✅ YES (correct)' : '❌ NO (bad)'}`
  );
  console.log('');

  const allCorrect = !results[0].valid && !results[1].valid && results[2].valid;
  if (allCorrect) {
    console.log('  ✅ VALIDATION SYSTEM V2 IS WORKING CORRECTLY');
  } else {
    console.log('  ❌ VALIDATION SYSTEM V2 NEEDS ADJUSTMENT');
  }
  console.log('');
  console.log('='.repeat(80));
}

// Run the test
runStressTestV2().catch(console.error);
