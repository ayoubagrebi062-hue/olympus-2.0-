import { prisma } from '@/lib/prisma';
import { DatabaseError } from '@/lib/errors';
import type { Agent } from '@/types';

export class AgentService {
  async listAgents(): Promise<Agent[]> {
    try {
      const agents = await prisma.agent.findMany({
        orderBy: { phase: 'asc' }
      });
      return agents;
    } catch (error) {
      throw new DatabaseError('Failed to fetch agents', error);
    }
  }
}

export const agentService = new AgentService();