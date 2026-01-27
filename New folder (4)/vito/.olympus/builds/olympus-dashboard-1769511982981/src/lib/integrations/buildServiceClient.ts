import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface Build {
  id: string;
  status: string;
  timestamp: string;
  duration: string;
}

interface BuildDetails {
  id: string;
  phases: Phase[];
  agents: Agent[];
  constitutionalChecks: ConstitutionalCheck[];
}

interface Phase {
  name: string;
  status: string;
  startTime: string;
  endTime: string;
  explanation: string;
}

interface Agent {
  name: string;
  role: string;
  status: string;
  currentTask: string;
}

interface ConstitutionalCheck {
  articleName: string;
  status: string;
  explanation: string;
}

class BuildServiceClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({ baseURL });
  }

  async getBuilds(): Promise<Build[]> {
    try {
      const response: AxiosResponse<{ data: Build[] }> = await this.client.get('/api/builds');
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch builds', error);
      throw new Error('Could not retrieve builds.');
    }
  }

  async getBuildDetails(buildId: string): Promise<BuildDetails> {
    try {
      const response: AxiosResponse<{ data: BuildDetails }> = await this.client.get(`/api/builds/${buildId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Failed to fetch details for build ${buildId}`, error);
      throw new Error('Could not retrieve build details.');
    }
  }
}

export default BuildServiceClient;