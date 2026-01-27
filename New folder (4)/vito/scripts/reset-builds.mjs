import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bxkrwzrisoqtojhpjdrw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4a3J3enJpc29xdG9qaHBqZHJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzcwODA1NCwiZXhwIjoyMDgzMjg0MDU0fQ.cJuOd_AX188y4la5cxMwkzNXtU2RC0YFq0oL0XEEwnI'
);

// Reset all running/failed builds to queued
const { data, error } = await supabase
  .from('builds')
  .update({ status: 'queued', progress: 0 })
  .in('status', ['running', 'failed'])
  .select('id, status');

if (error) {
  console.error('Error:', error.message);
} else {
  console.log('Reset builds:', data?.length || 0);
  data?.forEach(b => console.log(`  - ${b.id} -> queued`));
}
