import { db } from '@/lib/db';

export async function cleanupExpiredSessions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await db.session.deleteMany({ where: { expiresAt: { lt: cutoff } } });
  return { deleted: result.count, cutoff: cutoff.toISOString() };
}
