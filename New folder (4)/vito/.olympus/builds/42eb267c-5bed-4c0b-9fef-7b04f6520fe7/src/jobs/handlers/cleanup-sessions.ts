import { db } from '@/lib/db';

export async function cleanupExpiredSessions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db.session.deleteMany({ where: { expiresAt: { lt: cutoff } } });
  console.log('Cleaned up', result.count, 'expired sessions');
  return { deleted: result.count };
}