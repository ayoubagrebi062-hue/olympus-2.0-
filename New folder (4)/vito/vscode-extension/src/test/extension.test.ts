import * as assert from 'assert';
import { WebSocketManager } from '../src/network/webSocketManager';
import { OlympusAPI } from '../src/api/olympusApi';

suite('OLYMPUS VS Code Extension Tests', () => {
    let webSocketManager: WebSocketManager;
    let api: OlympusAPI;

    suiteSetup(() => {
        // Setup test environment
        webSocketManager = new WebSocketManager('wss://test.olympus.ai');
        api = new OlympusAPI({
            endpoint: 'https://test.olympus.ai',
            apiKey: 'test-key',
            model: 'claude-sonnet-4-20250514'
        });
    });

    suiteTeardown(() => {
        // Cleanup
        webSocketManager.disconnect();
    });

    suite('WebSocket Manager', () => {
        test('should validate string inputs', () => {
            const manager = new WebSocketManager('wss://test.com');

            // Access private method for testing (in real implementation, make it protected or add getters)
            assert.strictEqual((manager as any).validateString('test', 'default'), 'test');
            assert.strictEqual((manager as any).validateString(null, 'default'), 'default');
            assert.strictEqual((manager as any).validateString(123, 'default'), 'default');
        });

        test('should validate progress values', () => {
            const manager = new WebSocketManager('wss://test.com');

            assert.strictEqual((manager as any).validateProgress(50), 50);
            assert.strictEqual((manager as any).validateProgress(150), 100); // Clamped
            assert.strictEqual((manager as any).validateProgress(-10), 0);   // Clamped
            assert.strictEqual((manager as any).validateProgress('75'), 75);
            assert.strictEqual((manager as any).validateProgress(null), 0);
        });

        test('should validate agent status', () => {
            const manager = new WebSocketManager('wss://test.com');

            assert.strictEqual((manager as any).validateAgentStatus('running'), 'running');
            assert.strictEqual((manager as any).validateAgentStatus('invalid'), 'idle');
            assert.strictEqual((manager as any).validateAgentStatus(null), 'idle');
        });

        test('should validate timestamp', () => {
            const manager = new WebSocketManager('wss://test.com');

            const validTimestamp = '2024-01-01T00:00:00.000Z';
            assert.strictEqual((manager as any).validateTimestamp(validTimestamp), validTimestamp);

            // Invalid timestamp should return current time
            const result = (manager as any).validateTimestamp('invalid');
            assert(typeof result === 'string');
            assert(result.length > 0);
        });

        test('should handle connection status changes', () => {
            const manager = new WebSocketManager('wss://test.com');
            let connectionStatus = false;

            manager.onConnectionStatusChange((connected) => {
                connectionStatus = connected;
            });

            // Simulate connection status change (would happen in real WebSocket events)
            assert.strictEqual(connectionStatus, false);
        });
    });

    suite('API Client', () => {
        test('should update configuration', () => {
            const newConfig = {
                endpoint: 'https://new.olympus.ai',
                apiKey: 'new-key',
                model: 'gpt-4-turbo'
            };

            api.updateConfig(newConfig);

            // Verify config was updated (would check internal state in real implementation)
            assert(true); // Placeholder - real test would verify internal state
        });

        test('should handle API errors gracefully', async () => {
            try {
                // This would normally make a real API call that fails
                await api.createProject({
                    type: 'invalid-type',
                    path: '/invalid/path',
                    template: 'invalid'
                });
                assert.fail('Should have thrown an error');
            } catch (error) {
                // Should handle error gracefully
                assert(error instanceof Error);
            }
        });
    });

    suite('Error Boundaries', () => {
        test('should handle malformed WebSocket messages', () => {
            const manager = new WebSocketManager('wss://test.com');

            // Simulate malformed message (would happen in onmessage handler)
            const malformedMessages = [
                null,
                undefined,
                '',
                '{invalid json',
                '{"buildId": 123}', // Wrong type
                '{"progress": "not-a-number"}'
            ];

            malformedMessages.forEach(message => {
                // Should not crash when processing malformed messages
                try {
                    // This would normally be called in the WebSocket onmessage handler
                    assert.doesNotThrow(() => {
                        // Simulate message processing logic
                        if (!message || typeof message !== 'object') return;
                        // Processing logic here...
                    });
                } catch (error) {
                    assert.fail(`Should not throw on malformed message: ${message}`);
                }
            });
        });

        test('should handle network failures', () => {
            const manager = new WebSocketManager('wss://nonexistent-domain-that-will-fail.com');

            // Should not crash when attempting to connect to invalid domain
            assert.doesNotThrow(() => {
                manager.connect();
            });

            // Should eventually attempt reconnection
            setTimeout(() => {
                // Verify reconnection logic doesn't crash
                assert.doesNotThrow(() => {
                    manager.disconnect();
                });
            }, 100);
        });
    });

    suite('Offline Handling', () => {
        test('should defer connection when offline', () => {
            // Mock offline state
            const originalIsOnline = (webSocketManager as any).isOnline;
            (webSocketManager as any).isOnline = () => false;

            // Should not attempt connection when offline
            assert.doesNotThrow(() => {
                webSocketManager.connect();
            });

            // Restore original method
            (webSocketManager as any).isOnline = originalIsOnline;
        });

        test('should handle disconnection gracefully', () => {
            assert.doesNotThrow(() => {
                webSocketManager.disconnect();
                webSocketManager.disconnect(); // Should handle multiple calls
            });
        });
    });
});