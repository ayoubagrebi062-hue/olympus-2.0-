import { validateHandlers } from '../handler-validator';

const GOOD_CODE = `
onClick={() => setIsAddDialogOpen(true)}
onClick={() => setEditingTask(task)}
onClick={() => handleDeleteTask(task.id)}
onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
onChange={(e) => setNewTaskTitle(e.target.value)}
onClick={() => setIsAddDialogOpen(false)}
`;

const result = validateHandlers(GOOD_CODE);
console.log('=== HANDLER VALIDATION DEBUG ===');
console.log('Total:', result.totalHandlers);
console.log('Real:', result.realHandlers);
console.log('Fake:', result.fakeHandlers);
console.log('');
result.analysis.forEach((h, i) => {
  console.log(`[${i + 1}] ${h.location}`);
  console.log(`    Status: ${h.isReal ? 'REAL' : 'FAKE'}`);
  console.log(`    Reason: ${h.reason}`);
  console.log(`    Body: ${h.body}`);
  console.log('');
});
