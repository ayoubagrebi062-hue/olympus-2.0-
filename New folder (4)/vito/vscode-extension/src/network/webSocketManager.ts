import WebSocket from 'ws';

export interface BuildUpdate {
    buildId: string;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    currentStep: string;
    message: string;
    agents: Array<{
        id: string;
        name: string;
        status: 'idle' | 'running' | 'completed' | 'failed';
        progress: number;
    }>;
    timestamp: string;
}

export class WebSocketManager {
    private ws: WebSocket | null = null;
    private endpoint: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private subscribers = new Map<string, (update: BuildUpdate) => void>();
    private isConnecting = false;
    private connectionStatusSubscribers = new Set<(connected: boolean) => void>();

    constructor(endpoint: string) {
        this.endpoint = endpoint.replace('http', 'ws');
    }

    connect(): void {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        // Check for internet connectivity before attempting connection
        if (!this.isOnline()) {
            console.log('OLYMPUS: No internet connection, deferring WebSocket connection');
            this.scheduleReconnectWhenOnline();
            return;
        }

        this.isConnecting = true;

        try {
            // Add connection timeout
            const connectionTimeout = setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                    console.error('OLYMPUS: WebSocket connection timeout');
                    this.ws.close();
                    this.isConnecting = false;
                    this.attemptReconnect();
                }
            }, 10000); // 10 second timeout

            this.ws = new WebSocket(`${this.endpoint}/ws`);

            this.ws.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('OLYMPUS: WebSocket connected');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.notifyConnectionStatus(true);
            };

            this.ws.onmessage = (event) => {
                try {
                    const rawData = JSON.parse(event.data.toString());

                    // Validate message structure
                    if (!rawData || typeof rawData !== 'object') {
                        console.warn('OLYMPUS: Invalid message structure received');
                        return;
                    }

                    // Transform server message to BuildUpdate format with validation
                    const update: BuildUpdate = {
                        buildId: this.validateString(rawData.buildId, 'unknown'),
                        status: this.validateStatus(rawData.status),
                        progress: this.validateProgress(rawData.progress),
                        currentStep: this.validateString(rawData.step, ''),
                        message: this.validateString(rawData.message, ''),
                        agents: this.validateAgents(rawData.agents),
                        timestamp: this.validateTimestamp(rawData.timestamp)
                    };

                    this.notifySubscribers(update);
                } catch (error) {
                    console.error('OLYMPUS: Failed to parse WebSocket message:', error);
                    // Don't close connection for parsing errors, just log
                }
            };

            this.ws.onclose = (event) => {
                clearTimeout(connectionTimeout);
                const wasClean = event.wasClean;
                const code = event.code;
                const reason = event.reason;

                console.log(`OLYMPUS: WebSocket disconnected (clean: ${wasClean}, code: ${code}, reason: ${reason})`);
                this.isConnecting = false;
                this.notifyConnectionStatus(false);

                // Only attempt reconnection for unexpected disconnections
                if (!wasClean || code !== 1000) {
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('OLYMPUS: WebSocket error:', error);
                this.isConnecting = false;
                this.notifyConnectionStatus(false);
            };

        } catch (error) {
            console.error('OLYMPUS: Failed to create WebSocket connection:', error);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscribers.clear();
    }

    subscribeToBuild(buildId: string, callback: (update: BuildUpdate) => void): void {
        this.subscribers.set(buildId, callback);

        // Send subscription message if connected
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                buildId
            }));
        }
    }

    unsubscribeFromBuild(buildId: string): void {
        this.subscribers.delete(buildId);

        // Send unsubscribe message if connected
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe',
                buildId
            }));
        }
    }

    private notifySubscribers(update: BuildUpdate): void {
        const callback = this.subscribers.get(update.buildId);
        if (callback) {
            callback(update);
        }

        // Also notify global subscribers (for build explorer updates)
        this.subscribers.forEach((cb, buildId) => {
            if (buildId === 'global') {
                cb(update);
            }
        });
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('OLYMPUS: Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`OLYMPUS: Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    // Send a message to the server
    send(message: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('OLYMPUS: WebSocket not connected, message not sent');
        }
    }

    // Check connection status
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    // Subscribe to all build updates (for build explorer)
    subscribeToAllBuilds(callback: (update: BuildUpdate) => void): void {
        this.subscribers.set('global', callback);
    }

    // Connection status management
    private isOnline(): boolean {
        // In VS Code extension context, we assume online unless we get connection errors
        // In production, you might want to add a ping test to the OLYMPUS endpoint
        return true; // Default to online, rely on connection errors to detect offline
    }

    private scheduleReconnectWhenOnline(): void {
        // In a real implementation, listen for online events
        setTimeout(() => {
            if (this.isOnline()) {
                this.connect();
            } else {
                this.scheduleReconnectWhenOnline();
            }
        }, 5000); // Check every 5 seconds
    }

    private notifyConnectionStatus(connected: boolean): void {
        this.connectionStatusSubscribers.forEach(callback => {
            try {
                callback(connected);
            } catch (error) {
                console.error('OLYMPUS: Error in connection status callback:', error);
            }
        });
    }

    // Subscribe to connection status changes
    onConnectionStatusChange(callback: (connected: boolean) => void): void {
        this.connectionStatusSubscribers.add(callback);
    }

    // Data validation methods
    private validateString(value: unknown, defaultValue: string): string {
        return typeof value === 'string' ? value : defaultValue;
    }

    private validateStatus(value: unknown): 'running' | 'completed' | 'failed' | 'cancelled' {
        const validStatuses = ['running', 'completed', 'failed', 'cancelled'];
        return validStatuses.includes(value as string) ? value as any : 'running';
    }

    private validateProgress(value: unknown): number {
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        return isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
    }

    private validateAgents(value: unknown): Array<{id: string; name: string; status: 'idle' | 'running' | 'completed' | 'failed'; progress: number}> {
        if (!Array.isArray(value)) return [];

        return value.map(agent => ({
            id: this.validateString(agent.id, 'unknown'),
            name: this.validateString(agent.name, 'Unknown Agent'),
            status: this.validateAgentStatus(agent.status),
            progress: this.validateProgress(agent.progress)
        }));
    }

    private validateAgentStatus(value: unknown): 'idle' | 'running' | 'completed' | 'failed' {
        const validStatuses = ['idle', 'running', 'completed', 'failed'];
        const status = this.validateString(value as string, 'idle');
        return validStatuses.includes(status) ? status as any : 'idle';
    }

    private validateTimestamp(value: unknown): string {
        if (typeof value === 'string') {
            // Basic ISO date validation
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return value;
            }
        }
        return new Date().toISOString();
    }
}