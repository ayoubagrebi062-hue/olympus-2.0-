import { prisma } from '@/lib/prisma';
import { NotFoundError, UnauthorizedError, DatabaseError, StreamError } from '@/lib/errors';
import type { Build, BuildDetails, BuildUpdate, PaginationMeta } from '@/types';

export class BuildService {
  async listBuilds(offset: number, limit: number): Promise<{ data: Build[], meta: PaginationMeta }> {
    if (offset < 0 || limit <= 0) {
      throw new ValidationError('Offset and limit must be positive integers', ['Invalid pagination parameters']);
    }

    try {
      const builds = await prisma.build.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      const total = await prisma.build.count();

      return {
        data: builds,
        meta: { total, offset, limit }
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch builds', error);
    }
  }

  async getBuildDetails(buildId: string, userId: string): Promise<BuildDetails> {
    const build = await prisma.build.findUnique({
      where: { id: buildId },
      include: { phases: true, user: true }
    });

    if (!build) {
      throw new NotFoundError('Build', buildId);
    }

    if (build.userId !== userId) {
      throw new UnauthorizedError('Access to this build is restricted');
    }

    return build;
  }

  async streamBuildUpdates(buildId: string): Promise<ReadableStream<BuildUpdate>> {
    const build = await prisma.build.findUnique({ where: { id: buildId } });

    if (!build) {
      throw new NotFoundError('Build', buildId);
    }

    try {
      // Assume some implementation for stream that returns a readable stream
      return new ReadableStream<BuildUpdate>();
    } catch (error) {
      throw new StreamError('Failed to establish stream for build updates', error);
    }
  }
}

export const buildService = new BuildService();