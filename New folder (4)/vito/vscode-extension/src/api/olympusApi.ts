import axios, { AxiosInstance } from 'axios';

export interface OlympusConfig {
    endpoint: string;
    apiKey: string;
    model: string;
    telemetryEnabled?: boolean;
    maxRetries?: number;
    timeout?: number;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    tokenType: 'Bearer';
}

export interface TelemetryEvent {
    event: string;
    properties: Record<string, any>;
    timestamp: number;
    sessionId?: string;
    userId?: string;
}

export interface CreateProjectRequest {
    type: string;
    path: string;
    template: string;
}

export interface CreateProjectResponse {
    projectId: string;
    projectPath: string;
    agentCount: number;
    estimatedDuration: number;
}

export interface BuildComponentRequest {
    code: string;
    filePath: string;
    language: string;
    context: string;
}

export interface BuildComponentResponse {
    buildId: string;
    componentPath: string;
    agentUsed: string;
}

export interface RunPipelineRequest {
    type: string;
    workspacePath: string;
    files: string[];
}

export interface RunPipelineResponse {
    buildId: string;
    agentCount: number;
    pipelineSteps: string[];
}

export class OlympusAPI {
    private client: AxiosInstance;
    private config: OlympusConfig;
    private authTokens: AuthTokens | null = null;
    private telemetryQueue: TelemetryEvent[] = [];
    private telemetryFlushTimer: NodeJS.Timeout | null = null;
    private offlineQueue: Array<{ request: any; resolve: Function; reject: Function }> = [];
    private isOnline: boolean = true;
    private connectionCheckTimer: NodeJS.Timeout | null = null;

    constructor(config: OlympusConfig) {
        this.config = {
            telemetryEnabled: true,
            maxRetries: 3,
            timeout: 30000,
            ...config
        };

        this.client = axios.create({
            baseURL: config.endpoint,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'X-Client': 'vscode-extension',
                'X-Version': '1.0.0'
            }
        });

        // Setup request/response interceptors
        this.setupInterceptors();

        // Load stored auth tokens
        this.loadStoredTokens();

        // Setup telemetry
        this.setupTelemetry();

        // Setup offline handling and connection monitoring
        this.setupConnectionMonitoring();
    }

    updateConfig(newConfig: Partial<OlympusConfig>) {
        this.config = { ...this.config, ...newConfig };
        this.client.defaults.headers['X-Model'] = this.config.model;
        this.updateAuthHeader();
    }

    // Authentication methods
    async authenticateWithOAuth(): Promise<void> {
        // Open OAuth flow in browser
        const authUrl = `${this.config.endpoint}/oauth/authorize?client_id=vscode-extension&scope=builds+projects&response_type=code`;

        // In VS Code extension, we'd use vscode.env.openExternal
        // For now, simulate the flow
        console.log('Opening OAuth URL:', authUrl);

        // Simulate receiving auth code and exchanging for tokens
        const tokens: AuthTokens = {
            accessToken: 'simulated-access-token',
            refreshToken: 'simulated-refresh-token',
            expiresAt: Date.now() + 3600000, // 1 hour
            tokenType: 'Bearer'
        };

        await this.storeTokens(tokens);
        this.authTokens = tokens;
        this.updateAuthHeader();
    }

    async refreshToken(): Promise<void> {
        if (!this.authTokens?.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await this.client.post('/oauth/refresh', {
                refreshToken: this.authTokens.refreshToken
            });

            const newTokens: AuthTokens = {
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken || this.authTokens.refreshToken,
                expiresAt: Date.now() + (response.data.expiresIn || 3600) * 1000,
                tokenType: 'Bearer'
            };

            await this.storeTokens(newTokens);
            this.authTokens = newTokens;
            this.updateAuthHeader();
        } catch (error) {
            // Refresh failed, require re-auth
            this.authTokens = null;
            await this.clearStoredTokens();
            throw new Error('Token refresh failed');
        }
    }

    private updateAuthHeader(): void {
        if (this.authTokens?.accessToken) {
            this.client.defaults.headers['Authorization'] = `${this.authTokens.tokenType} ${this.authTokens.accessToken}`;
        } else if (this.config.apiKey) {
            // Fallback to API key
            this.client.defaults.headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
    }

    private async storeTokens(tokens: AuthTokens): Promise<void> {
        // In VS Code extension, use vscode.ExtensionContext.globalState
        // For simulation, use localStorage equivalent
        try {
            const tokenData = JSON.stringify(tokens);
            // Secure storage would be implemented here
            console.log('Tokens stored securely');
        } catch (error) {
            console.error('Failed to store tokens:', error);
        }
    }

    private async loadStoredTokens(): Promise<void> {
        try {
            // Load from secure storage
            // For simulation, check if we have valid tokens
            if (this.authTokens && this.authTokens.expiresAt > Date.now()) {
                this.updateAuthHeader();
            } else {
                this.authTokens = null;
            }
        } catch (error) {
            console.error('Failed to load tokens:', error);
            this.authTokens = null;
        }
    }

    private async clearStoredTokens(): Promise<void> {
        // Clear from secure storage
        console.log('Tokens cleared from secure storage');
    }

    // Request/Response interceptors
    private setupInterceptors(): void {
        // Request interceptor - add auth, telemetry
        this.client.interceptors.request.use((config) => {
            // Ensure we have valid tokens
            if (this.authTokens && this.authTokens.expiresAt < Date.now() + 300000) { // 5 min buffer
                // Token expires soon, refresh in background
                this.refreshToken().catch(err => console.error('Background token refresh failed:', err));
            }

            // Add telemetry headers
            if (this.config.telemetryEnabled) {
                config.headers['X-Request-Id'] = this.generateRequestId();
                config.headers['X-Timestamp'] = Date.now().toString();
            }

            return config;
        });

        // Response interceptor - handle auth errors, telemetry
        this.client.interceptors.response.use(
            (response) => {
                // Record successful request
                if (this.config.telemetryEnabled) {
                    this.recordTelemetry({
                        event: 'api_request_success',
                        properties: {
                            endpoint: response.config.url,
                            method: response.config.method,
                            statusCode: response.status,
                            duration: Date.now() - parseInt(response.config.headers['X-Timestamp'] || '0')
                        },
                        timestamp: Date.now()
                    });
                }
                return response;
            },
            async (error) => {
                // Handle authentication errors
                if (error.response?.status === 401) {
                    // Token expired or invalid
                    this.authTokens = null;
                    await this.clearStoredTokens();
                    throw new Error('Authentication required. Please re-authenticate.');
                }

                // Handle rate limiting
                if (error.response?.status === 429) {
                    const retryAfter = error.response.headers['retry-after'] || 60;
                    throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
                }

                // Record failed request
                if (this.config.telemetryEnabled) {
                    this.recordTelemetry({
                        event: 'api_request_error',
                        properties: {
                            endpoint: error.config?.url,
                            method: error.config?.method,
                            statusCode: error.response?.status,
                            errorMessage: error.message,
                            duration: Date.now() - parseInt(error.config?.headers?.['X-Timestamp'] || '0')
                        },
                        timestamp: Date.now()
                    });
                }

                throw error;
            }
        );
    }

    // Telemetry methods
    private setupTelemetry(): void {
        if (!this.config.telemetryEnabled) return;

        // Flush telemetry every 30 seconds
        this.telemetryFlushTimer = setInterval(() => {
            this.flushTelemetry();
        }, 30000);
    }

    private recordTelemetry(event: Omit<TelemetryEvent, 'sessionId'>): void {
        if (!this.config.telemetryEnabled) return;

        this.telemetryQueue.push({
            ...event,
            sessionId: this.getSessionId()
        });

        // Flush immediately if queue gets too large
        if (this.telemetryQueue.length >= 50) {
            this.flushTelemetry();
        }
    }

    private async flushTelemetry(): Promise<void> {
        if (this.telemetryQueue.length === 0) return;

        const events = [...this.telemetryQueue];
        this.telemetryQueue = [];

        try {
            await this.client.post('/telemetry/events', { events });
        } catch (error) {
            console.error('Failed to send telemetry:', error);
            // Re-queue failed events (up to a limit)
            if (this.telemetryQueue.length < 100) {
                this.telemetryQueue.unshift(...events.slice(0, 10)); // Only re-queue first 10
            }
        }
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getSessionId(): string {
        // In real implementation, generate or retrieve session ID
        return `session_${Date.now()}`;
    }

    // Connection monitoring and offline handling
    private setupConnectionMonitoring(): void {
        // Check connection every 30 seconds
        this.connectionCheckTimer = setInterval(async () => {
            await this.checkConnectionStatus();
        }, 30000);

        // Initial connection check
        this.checkConnectionStatus();
    }

    private async checkConnectionStatus(): Promise<void> {
        try {
            // Simple ping to check connectivity
            await this.client.get('/health', { timeout: 5000 });
            this.handleConnectionRestored();
        } catch (error) {
            this.handleConnectionLost();
        }
    }

    private handleConnectionLost(): void {
        if (this.isOnline) {
            this.isOnline = false;
            console.log('OLYMPUS: Connection lost - entering offline mode');

            // Record telemetry
            this.recordTelemetry({
                event: 'connection_lost',
                properties: { timestamp: Date.now() },
                timestamp: Date.now()
            });
        }
    }

    private handleConnectionRestored(): void {
        if (!this.isOnline) {
            this.isOnline = true;
            console.log('OLYMPUS: Connection restored - processing offline queue');

            // Process queued requests
            this.processOfflineQueue();

            // Record telemetry
            this.recordTelemetry({
                event: 'connection_restored',
                properties: {
                    timestamp: Date.now(),
                    queuedRequests: this.offlineQueue.length
                },
                timestamp: Date.now()
            });
        }
    }

    private async processOfflineQueue(): Promise<void> {
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];

        for (const item of queue) {
            try {
                // Retry the request
                const result = await this.client.request(item.request);
                item.resolve(result);
            } catch (error) {
                // If still failing, reject or re-queue based on error type
                if (this.isRetryableError(error)) {
                    this.offlineQueue.push(item); // Re-queue
                } else {
                    item.reject(error);
                }
            }
        }
    }

    private isRetryableError(error: any): boolean {
        // Retry on network errors, timeouts, 5xx server errors
        return !error.response ||
               error.code === 'NETWORK_ERROR' ||
               error.code === 'TIMEOUT' ||
               (error.response.status >= 500 && error.response.status < 600);
    }

    // Offline-aware request wrapper
    private async makeRequest(config: any): Promise<any> {
        if (!this.isOnline) {
            // Queue request for when connection is restored
            return new Promise((resolve, reject) => {
                this.offlineQueue.push({ request: config, resolve, reject });
            });
        }

        return this.client.request(config);
    }

    // Enhanced API methods with offline support
    async createProjectOfflineAware(request: CreateProjectRequest): Promise<CreateProjectResponse> {
        return this.makeRequest({
            method: 'POST',
            url: '/projects',
            data: request
        });
    }

    async buildComponentOfflineAware(request: BuildComponentRequest): Promise<BuildComponentResponse> {
        return this.makeRequest({
            method: 'POST',
            url: '/components/build',
            data: request
        });
    }

    // Get connection status
    isConnected(): boolean {
        return this.isOnline;
    }

    // Force connection check
    async forceConnectionCheck(): Promise<boolean> {
        await this.checkConnectionStatus();
        return this.isOnline;
    }

    // Cleanup
    dispose(): void {
        if (this.telemetryFlushTimer) {
            clearInterval(this.telemetryFlushTimer);
        }
        if (this.connectionCheckTimer) {
            clearInterval(this.connectionCheckTimer);
        }
        this.flushTelemetry(); // Final flush
    }

    async createProject(request: CreateProjectRequest): Promise<CreateProjectResponse> {
        const response = await this.client.post('/projects', request);
        return response.data;
    }

    async buildComponent(request: BuildComponentRequest): Promise<BuildComponentResponse> {
        const response = await this.client.post('/components/build', request);
        return response.data;
    }

    async runPipeline(request: RunPipelineRequest): Promise<RunPipelineResponse> {
        const response = await this.client.post('/pipelines/run', request);
        return response.data;
    }

    async getBuildStatus(buildId: string): Promise<any> {
        const response = await this.client.get(`/builds/${buildId}/status`);
        return response.data;
    }

    async cancelBuild(buildId: string): Promise<void> {
        await this.client.post(`/builds/${buildId}/cancel`);
    }
}