/**
 * OLYMPUS 2.0 - Stress Test Framework
 *
 * Comprehensive stress testing for the generation retry system.
 * Tests various page types against feature checklists.
  *
 * @ETHICAL_OVERSIGHT - System-wide operations requiring ethical oversight
 * @HUMAN_ACCOUNTABILITY - Critical operations require human review
 * @HUMAN_OVERRIDE_REQUIRED - Execution decisions must be human-controllable
 */

import * as fs from 'fs';
import {
  generateWithRetry,
  FeatureChecklist,
  FeatureChecklistItem,
  GenerationResult,
} from '../generation-retry';
import { wireGenerator } from './wire-adapter';

// ════════════════════════════════════════════════════════════════════════════════
// TEST CASES
// ════════════════════════════════════════════════════════════════════════════════

interface TestCase {
  id: string;
  name: string;
  prompt: string;
  pageType: string;
  expectedFeatures: string[];
  checklist: FeatureChecklist;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'kanban',
    name: 'Kanban Board',
    prompt:
      'Build a kanban board like Linear with drag and drop, columns for status, and task cards',
    pageType: 'dashboard',
    expectedFeatures: ['kanban_columns', 'drag_drop', 'task_cards', 'dark_theme'],
    checklist: {
      critical: [
        {
          id: 'kanban_columns',
          name: 'Kanban Columns',
          description: 'Draggable columns for task status',
          acceptanceCriteria: [
            'At least 3 columns',
            'Column headers editable',
            'Drag to reorder columns',
          ],
          assignedTo: 'WIRE',
        },
        {
          id: 'task_cards',
          name: 'Task Cards',
          description: 'Draggable task cards',
          acceptanceCriteria: [
            'Card shows title and assignee',
            'Drag between columns',
            'Click to open detail',
          ],
          assignedTo: 'WIRE',
        },
        {
          id: 'responsive',
          name: 'Responsive Layout',
          description: 'Works on mobile',
          acceptanceCriteria: ['Horizontal scroll on mobile', 'Touch drag support'],
          assignedTo: 'WIRE',
        },
      ],
      important: [
        {
          id: 'filters',
          name: 'Task Filters',
          description: 'Filter by assignee/label',
          acceptanceCriteria: ['Filter dropdown', 'Multi-select'],
          assignedTo: 'WIRE',
        },
      ],
      niceToHave: [
        { id: 'keyboard', name: 'Keyboard Shortcuts', description: 'Cmd+K command palette' },
      ],
    },
  },
  {
    id: 'dashboard',
    name: 'Analytics Dashboard',
    prompt: 'Create an analytics dashboard with KPI stats, charts, and recent activity feed',
    pageType: 'dashboard',
    expectedFeatures: ['stats_grid', 'charts', 'activity_feed'],
    checklist: {
      critical: [
        {
          id: 'stats_grid',
          name: 'Stats Grid',
          description: '4 KPI cards with metrics',
          acceptanceCriteria: ['4 stat cards', 'Each shows value and trend', 'Grid responsive'],
          assignedTo: 'WIRE',
        },
        {
          id: 'charts',
          name: 'Charts',
          description: 'Line or bar chart',
          acceptanceCriteria: ['At least one chart', 'Responsive container', 'Legend'],
          assignedTo: 'WIRE',
        },
        {
          id: 'loading_states',
          name: 'Loading States',
          description: 'Skeleton loaders',
          acceptanceCriteria: ['Skeleton for stats', 'Skeleton for chart', 'Skeleton for feed'],
          assignedTo: 'WIRE',
        },
      ],
      important: [
        {
          id: 'activity_feed',
          name: 'Activity Feed',
          description: 'Recent events list',
          acceptanceCriteria: ['Scrollable list', 'Timestamps'],
          assignedTo: 'WIRE',
        },
      ],
      niceToHave: [],
    },
  },
  {
    id: 'ecommerce',
    name: 'E-commerce Product List',
    prompt: 'Build a product listing page with search, filters, grid/list toggle, and pagination',
    pageType: 'list',
    expectedFeatures: ['search', 'filters', 'product_grid', 'pagination'],
    checklist: {
      critical: [
        {
          id: 'product_grid',
          name: 'Product Grid',
          description: 'Grid of product cards',
          acceptanceCriteria: ['Product image', 'Price', 'Add to cart button', 'Grid responsive'],
          assignedTo: 'WIRE',
        },
        {
          id: 'search',
          name: 'Search',
          description: 'Search products',
          acceptanceCriteria: ['Search input', 'Filters results'],
          assignedTo: 'WIRE',
        },
        {
          id: 'empty_state',
          name: 'Empty State',
          description: 'No results found',
          acceptanceCriteria: ['Shows when no products', 'Clear filters CTA'],
          assignedTo: 'WIRE',
        },
      ],
      important: [
        {
          id: 'filters',
          name: 'Filters',
          description: 'Category/price filters',
          acceptanceCriteria: ['Sidebar filters', 'Multi-select'],
          assignedTo: 'WIRE',
        },
        {
          id: 'pagination',
          name: 'Pagination',
          description: 'Page navigation',
          acceptanceCriteria: ['Page numbers', 'Prev/Next'],
          assignedTo: 'WIRE',
        },
      ],
      niceToHave: [
        { id: 'view_toggle', name: 'Grid/List Toggle', description: 'Switch between views' },
      ],
    },
  },
  {
    id: 'auth',
    name: 'Auth Flow',
    prompt:
      'Create login and signup pages with form validation, error handling, and social login buttons',
    pageType: 'auth',
    expectedFeatures: ['login_form', 'signup_form', 'validation', 'social_auth'],
    checklist: {
      critical: [
        {
          id: 'login_form',
          name: 'Login Form',
          description: 'Email/password login',
          acceptanceCriteria: [
            'Email input',
            'Password input',
            'Submit button',
            'Validation errors',
          ],
          assignedTo: 'WIRE',
        },
        {
          id: 'validation',
          name: 'Form Validation',
          description: 'Client-side validation',
          acceptanceCriteria: ['Required fields', 'Email format', 'Error messages'],
          assignedTo: 'WIRE',
        },
        {
          id: 'loading',
          name: 'Loading State',
          description: 'Submit loading',
          acceptanceCriteria: ['Button loading state', 'Disabled during submit'],
          assignedTo: 'WIRE',
        },
      ],
      important: [
        {
          id: 'signup_form',
          name: 'Signup Form',
          description: 'Registration form',
          acceptanceCriteria: ['Name field', 'Email', 'Password', 'Confirm password'],
          assignedTo: 'WIRE',
        },
      ],
      niceToHave: [{ id: 'social', name: 'Social Login', description: 'Google/GitHub buttons' }],
    },
  },
  {
    id: 'settings',
    name: 'Settings Page',
    prompt:
      'Build a user settings page with profile editing, notification preferences, and account management',
    pageType: 'settings',
    expectedFeatures: ['profile_form', 'notifications', 'account'],
    checklist: {
      critical: [
        {
          id: 'profile_form',
          name: 'Profile Form',
          description: 'Edit user profile',
          acceptanceCriteria: ['Name field', 'Avatar upload', 'Save button'],
          assignedTo: 'WIRE',
        },
        {
          id: 'save_feedback',
          name: 'Save Feedback',
          description: 'Success/error states',
          acceptanceCriteria: ['Toast on save', 'Error handling'],
          assignedTo: 'WIRE',
        },
      ],
      important: [
        {
          id: 'notifications',
          name: 'Notification Settings',
          description: 'Toggle preferences',
          acceptanceCriteria: ['Toggle switches', 'Categories'],
          assignedTo: 'WIRE',
        },
      ],
      niceToHave: [{ id: 'danger_zone', name: 'Danger Zone', description: 'Delete account' }],
    },
  },
  {
    id: 'blog',
    name: 'Blog Listing',
    prompt: 'Create a blog listing page with article cards, categories, and featured post section',
    pageType: 'list',
    expectedFeatures: ['article_cards', 'categories', 'featured'],
    checklist: {
      critical: [
        {
          id: 'article_cards',
          name: 'Article Cards',
          description: 'Blog post cards',
          acceptanceCriteria: ['Title', 'Excerpt', 'Date', 'Author', 'Image'],
          assignedTo: 'WIRE',
        },
        {
          id: 'responsive',
          name: 'Responsive Grid',
          description: 'Card grid',
          acceptanceCriteria: ['3 cols desktop', '2 cols tablet', '1 col mobile'],
          assignedTo: 'WIRE',
        },
      ],
      important: [
        {
          id: 'categories',
          name: 'Category Filter',
          description: 'Filter by category',
          acceptanceCriteria: ['Category pills', 'Active state'],
          assignedTo: 'WIRE',
        },
      ],
      niceToHave: [{ id: 'featured', name: 'Featured Post', description: 'Hero featured article' }],
    },
  },
  {
    id: 'chat',
    name: 'Chat Interface',
    prompt: 'Build a real-time chat interface with message list, input, and conversation sidebar',
    pageType: 'detail',
    expectedFeatures: ['message_list', 'message_input', 'conversations'],
    checklist: {
      critical: [
        {
          id: 'message_list',
          name: 'Message List',
          description: 'Chat messages',
          acceptanceCriteria: ['Message bubbles', 'Timestamps', 'Sender info', 'Auto-scroll'],
          assignedTo: 'WIRE',
        },
        {
          id: 'message_input',
          name: 'Message Input',
          description: 'Send messages',
          acceptanceCriteria: ['Text input', 'Send button', 'Enter to send'],
          assignedTo: 'WIRE',
        },
      ],
      important: [
        {
          id: 'conversations',
          name: 'Conversation List',
          description: 'Sidebar with chats',
          acceptanceCriteria: ['List of conversations', 'Active state', 'Unread indicator'],
          assignedTo: 'WIRE',
        },
      ],
      niceToHave: [{ id: 'typing', name: 'Typing Indicator', description: 'Show when typing' }],
    },
  },
  {
    id: 'crm',
    name: 'CRM Contacts',
    prompt:
      'Create a CRM contact management page with a data table showing contacts (name, email, status), search functionality to filter contacts, and add/edit/delete actions. Include an empty state when no contacts exist.',
    pageType: 'list',
    expectedFeatures: ['contact_table', 'search', 'crud', 'empty_state'],
    checklist: {
      critical: [
        {
          id: 'contact_table',
          name: 'Contact Table',
          description: 'Data table showing contacts',
          // More flexible acceptance criteria - looks for data display patterns
          acceptanceCriteria: ['Shows contact data', 'Table or card layout', 'Clickable items'],
          assignedTo: 'WIRE',
        },
        {
          id: 'search',
          name: 'Search',
          description: 'Search/filter contacts',
          acceptanceCriteria: ['Search input', 'Filters data'],
          assignedTo: 'WIRE',
        },
        {
          id: 'empty_state',
          name: 'Empty State',
          description: 'No contacts found state',
          acceptanceCriteria: ['Empty message', 'Add button'],
          assignedTo: 'WIRE',
        },
      ],
      important: [
        {
          id: 'crud',
          name: 'CRUD Actions',
          description: 'Add/edit/delete',
          acceptanceCriteria: ['Add button', 'Edit action', 'Delete action'],
          assignedTo: 'WIRE',
        },
      ],
      niceToHave: [
        { id: 'detail_drawer', name: 'Detail Drawer', description: 'Slide-out detail view' },
      ],
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════════
// METRICS
// ════════════════════════════════════════════════════════════════════════════════

export interface StressTestMetrics {
  totalTests: number;
  passed: number;
  failed: number;
  stubRate: number;
  avgFeatureCoverage: number;
  firstPassSuccessRate: number;
  avgAttempts: number;
  avgGenerationTimeMs: number;
  totalTimeMs: number;
  results: TestResult[];
}

export interface TestResult {
  testCase: string;
  passed: boolean;
  attempts: number;
  generationTimeMs: number;
  featureCoverage: number;
  criticalFeaturesMissing: string[];
  failures: string[];
  hasStubs: boolean;
  stubMatches?: string[];
}

// ════════════════════════════════════════════════════════════════════════════════
// STUB DETECTION - FIXED VERSION
// ════════════════════════════════════════════════════════════════════════════════

interface StubDetectionResult {
  hasStubs: boolean;
  matches: string[];
}

function detectStubs(code: string): StubDetectionResult {
  const matches: string[] = [];

  // Patterns that indicate stub/placeholder code
  // IMPORTANT: These must NOT match legitimate patterns like placeholder="..."
  const stubPatterns: { pattern: RegExp; name: string }[] = [
    // TODO comments (clear indicator of incomplete code)
    {
      pattern: /\/\/\s*TODO[:\s]/gi,
      name: 'TODO comment',
    },
    // FIXME comments
    {
      pattern: /\/\/\s*FIXME[:\s]/gi,
      name: 'FIXME comment',
    },
    // Literal placeholder text in JSX content (not HTML attributes!)
    // Matches: >placeholder<, >Placeholder text<
    // Does NOT match: placeholder="Search..." (legitimate input attribute)
    {
      pattern: />\s*placeholder\s*(?:text|content|here)?\s*</gi,
      name: 'Placeholder text in JSX',
    },
    // "Add X here" patterns in content
    {
      pattern: />\s*(?:add|put|insert)\s+\w+\s+here\s*</gi,
      name: 'Add X here text',
    },
    // Lorem ipsum
    {
      pattern: /lorem\s+ipsum/gi,
      name: 'Lorem ipsum',
    },
    // Components returning ONLY null (entire function body is just return null)
    // Does NOT match conditional returns like: if (loading) return null;
    {
      pattern: /=>\s*\{\s*return\s+null\s*;?\s*\}\s*$/gm,
      name: 'Component returns only null',
    },
    // Empty function bodies with just a comment
    {
      pattern: /\{\s*\/\*\s*\*\/\s*\}/g,
      name: 'Empty block with comment',
    },
    // Empty onClick with no logic
    {
      pattern: /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g,
      name: 'Empty onClick handler',
    },
    // Console.log-only handlers
    {
      pattern: /onClick=\{\s*\(\)\s*=>\s*console\.log/g,
      name: 'Console.log-only handler',
    },
    // Placeholder ellipsis in content - but NOT pagination ellipsis
    // Matches: >...<  but context matters - pagination uses ... legitimately
    // Only flag if surrounded by suspicious words like "add", "here", "content"
    {
      pattern: />\s*\.{3}\s+(?:here|add|content|todo)\s*</gi,
      name: 'Ellipsis placeholder',
    },
    // "Coming soon" or "Under construction"
    {
      pattern: /(?:coming\s+soon|under\s+construction)/gi,
      name: 'Coming soon text',
    },
    // "Not implemented"
    {
      pattern: /not\s+implemented/gi,
      name: 'Not implemented text',
    },
  ];

  for (const { pattern, name } of stubPatterns) {
    const found = code.match(pattern);
    if (found && found.length > 0) {
      matches.push(`${name}: "${found[0].substring(0, 40)}${found[0].length > 40 ? '...' : ''}"`);
    }
  }

  return {
    hasStubs: matches.length > 0,
    matches,
  };
}

function calculateFeatureCoverage(code: string, checklist: FeatureChecklist): number {
  const criticalFeatures = checklist.critical || [];
  if (criticalFeatures.length === 0) return 100;

  let implemented = 0;
  for (const feature of criticalFeatures) {
    const patterns = getFeaturePatterns(feature.id);
    if (patterns.some(p => p.test(code))) {
      implemented++;
    }
  }

  return Math.round((implemented / criticalFeatures.length) * 100);
}

function getFeaturePatterns(featureId: string): RegExp[] {
  const patternMap: Record<string, RegExp[]> = {
    kanban_columns: [/column/i, /board/i],
    task_cards: [/card/i, /task/i],
    drag_drop: [/drag|dnd|draggable/i],
    stats_grid: [/stat|kpi|metric/i, /grid|flex/i],
    charts: [/chart|recharts|victory/i],
    loading_states: [/skeleton|loading|spinner/i],
    activity_feed: [/activity|feed|timeline/i],
    product_grid: [/product|item/i, /grid|list/i],
    search: [/search|filter/i, /input/i],
    empty_state: [/empty|no.*found/i],
    pagination: [/pagination|page/i],
    login_form: [/login|signin/i, /form/i],
    validation: [/error|invalid|required/i],
    loading: [/loading|submitting/i],
    profile_form: [/profile|avatar/i, /form|input/i],
    save_feedback: [/toast|notification|success/i],
    article_cards: [/article|post|blog/i, /card/i],
    responsive: [/sm:|md:|lg:|xl:/],
    message_list: [/message/i, /list|map/i],
    message_input: [/input|textarea/i, /send/i],
    contact_table: [/table|datagrid/i, /contact/i],
    crud: [/create|add|edit|delete/i],
  };

  return patternMap[featureId] || [new RegExp(featureId.replace(/_/g, '.*'), 'i')];
}

// ════════════════════════════════════════════════════════════════════════════════
// MOCK GENERATOR (Replace with actual WIRE/PIXEL calls)
// ════════════════════════════════════════════════════════════════════════════════

async function mockGenerator(prompt: string): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return a realistic mock that sometimes has issues
  // This simulates the variability of LLM output
  const mockCode = `
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, Filter, Plus, Edit, Trash, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataItem {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function Page() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Simulated fetch
        await new Promise(resolve => setTimeout(resolve, 500));
        setData([
          { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active', createdAt: '2024-01-15' },
          { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'active', createdAt: '2024-01-14' },
          { id: '3', name: 'Bob Wilson', email: 'bob@example.com', status: 'inactive', createdAt: '2024-01-13' },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleAdd = () => {
    toast.success('Add item clicked');
  };

  const handleEdit = (id: string) => {
    toast.info(\`Edit item \${id}\`);
  };

  const handleDelete = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
    toast.success('Item deleted');
  };

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-muted-foreground mb-4">No items found</p>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add First Item
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredData.map(item => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(item.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.email}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.createdAt}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="flex items-center px-4">Page {currentPage}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentPage(p => p + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
`;

  return mockCode;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN STRESS TEST
// ════════════════════════════════════════════════════════════════════════════════

export async function runStressTest(
  generateFn: (prompt: string) => Promise<string> = wireGenerator,
  testCases: TestCase[] = TEST_CASES
): Promise<StressTestMetrics> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           OLYMPUS 2.0 STRESS TEST                          ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Test Cases: ${testCases.length.toString().padEnd(46)}║`);
  console.log(`║ Max Retries: 2                                             ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();
  const results: TestResult[] = [];
  let firstPassSuccess = 0;

  for (const testCase of testCases) {
    console.log(`\n▶ Running: ${testCase.name}...`);

    const result = await generateWithRetry(
      generateFn,
      testCase.prompt,
      testCase.checklist,
      'WIRE',
      testCase.pageType
    );

    const code = result.code || '';
    const stubResult = detectStubs(code);
    const featureCoverage = calculateFeatureCoverage(code, testCase.checklist);

    const criticalMissing = (testCase.checklist.critical || [])
      .filter(f => !getFeaturePatterns(f.id).some(p => p.test(code)))
      .map(f => f.name);

    const testResult: TestResult = {
      testCase: testCase.name,
      passed: result.passed,
      attempts: result.attempts,
      generationTimeMs: result.metrics.totalTimeMs,
      featureCoverage,
      criticalFeaturesMissing: criticalMissing,
      failures: result.failures,
      hasStubs: stubResult.hasStubs,
      stubMatches: stubResult.matches,
    };

    results.push(testResult);

    if (result.attempts === 1 && result.passed) {
      firstPassSuccess++;
    }

    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(
      `   ${status} | Attempts: ${result.attempts} | Coverage: ${featureCoverage}% | Time: ${result.metrics.totalTimeMs}ms`
    );

    // Debug output for failures
    if (!result.passed && criticalMissing.length > 0) {
      console.log(`   ⚠️ Missing critical features: ${criticalMissing.join(', ')}`);
    }

    if (stubResult.hasStubs && stubResult.matches.length > 0) {
      console.log(`   ⚠️ Stub patterns found: ${stubResult.matches.length}`);
      stubResult.matches.slice(0, 3).forEach(m => console.log(`      - ${m}`));
    }
  }

  // Calculate metrics
  const totalTime = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const stubCount = results.filter(r => r.hasStubs).length;
  const avgCoverage = results.reduce((sum, r) => sum + r.featureCoverage, 0) / results.length;
  const avgAttempts = results.reduce((sum, r) => sum + r.attempts, 0) / results.length;
  const avgTime = results.reduce((sum, r) => sum + r.generationTimeMs, 0) / results.length;

  const metrics: StressTestMetrics = {
    totalTests: testCases.length,
    passed,
    failed: testCases.length - passed,
    stubRate: Math.round((stubCount / testCases.length) * 100),
    avgFeatureCoverage: Math.round(avgCoverage),
    firstPassSuccessRate: Math.round((firstPassSuccess / testCases.length) * 100),
    avgAttempts: Math.round(avgAttempts * 10) / 10,
    avgGenerationTimeMs: Math.round(avgTime),
    totalTimeMs: totalTime,
    results,
  };

  // Print summary
  printSummary(metrics);

  // Save report
  saveReport(metrics);

  return metrics;
}

function printSummary(metrics: StressTestMetrics): void {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    STRESS TEST RESULTS                     ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Total Tests:          ${metrics.totalTests.toString().padEnd(36)}║`);
  console.log(`║ Passed:               ${metrics.passed.toString().padEnd(36)}║`);
  console.log(`║ Failed:               ${metrics.failed.toString().padEnd(36)}║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Stub Rate:            ${(metrics.stubRate + '%').padEnd(36)}║`);
  console.log(`║ Feature Coverage:     ${(metrics.avgFeatureCoverage + '%').padEnd(36)}║`);
  console.log(`║ First-Pass Success:   ${(metrics.firstPassSuccessRate + '%').padEnd(36)}║`);
  console.log(`║ Avg Attempts:         ${metrics.avgAttempts.toString().padEnd(36)}║`);
  console.log(`║ Avg Generation Time:  ${(metrics.avgGenerationTimeMs + 'ms').padEnd(36)}║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Total Time:           ${(metrics.totalTimeMs + 'ms').padEnd(36)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Targets check
  console.log('\n📊 TARGET COMPARISON:');
  console.log(
    `   Stub Rate:        ${metrics.stubRate}% ${metrics.stubRate <= 10 ? '✅' : '❌'} (target: <10%)`
  );
  console.log(
    `   Feature Coverage: ${metrics.avgFeatureCoverage}% ${metrics.avgFeatureCoverage >= 95 ? '✅' : '❌'} (target: >95%)`
  );
  console.log(
    `   First-Pass:       ${metrics.firstPassSuccessRate}% ${metrics.firstPassSuccessRate >= 70 ? '✅' : '❌'} (target: >70%)`
  );
}

function saveReport(metrics: StressTestMetrics): void {
  const reportDir = './stress-test/reports';
  try {
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `${reportDir}/stress-test-${timestamp}.json`;

    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);
  } catch (error) {
    console.error('Failed to save report:', error);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// CLI ENTRY
// ════════════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  console.log('Using REAL WIRE generator via Anthropic API');
  console.log('Rate limited to 1 request per 6 seconds');
  console.log('');

  runStressTest(wireGenerator)
    .then(metrics => {
      process.exit(metrics.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Stress test failed:', error);
      process.exit(1);
    });
}

// Export for testing without API calls
export { TEST_CASES, mockGenerator };
