// Migration scripts - stub implementation
// Prisma is not configured in this project. Use Supabase migrations instead.

export async function runMigrations(): Promise<void> {
  console.log('[Migrations] Prisma not configured. Using Supabase for database.');
  console.log('[Migrations] Run: npx supabase migration up');
}

// Only run if executed directly
if (require.main === module) {
  runMigrations()
    .then(() => console.log('[Migrations] Complete'))
    .catch(e => console.error('[Migrations] Error:', e));
}
