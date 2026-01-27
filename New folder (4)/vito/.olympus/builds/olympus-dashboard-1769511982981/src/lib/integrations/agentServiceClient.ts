import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface Agent {
  name: string;
  role: string;
  status: string;
  currentTask: string;
}

class AgentServiceClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({ baseURL });
  }

  async getAgents(): Promise<Agent[]> {
    try {
      const response: AxiosResponse<{ data: Agent[] }> = await this.client.get('/api/ai/agents');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch agents', error);
      throw new Error('Could not retrieve agents.');
    }
  }
}

export default AgentServiceClient;