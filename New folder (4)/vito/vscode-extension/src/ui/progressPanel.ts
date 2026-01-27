import * as vscode from 'vscode';

export interface ProgressUpdate {
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

export class ProgressPanel {
    private panel: vscode.WebviewPanel | undefined;
    private extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
    }

    show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'olympusProgress',
            'OLYMPUS Build Progress',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [this.extensionUri]
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    updateProgress(update: ProgressUpdate) {
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'progressUpdate',
                data: update
            });
        }
    }

    dispose() {
        this.panel?.dispose();
    }

    private getWebviewContent(): string {
        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>OLYMPUS Build Progress</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    padding: 20px;
                }
                .progress-container {
                    margin-bottom: 20px;
                }
                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background-color: var(--vscode-progressBar-background);
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 10px 0;
                }
                .progress-fill {
                    height: 100%;
                    background-color: var(--vscode-progressBar-foreground);
                    transition: width 0.3s ease;
                }
                .agent-status {
                    display: flex;
                    align-items: center;
                    margin: 8px 0;
                    padding: 8px;
                    border-radius: 4px;
                    background-color: var(--vscode-list-inactiveSelectionBackground);
                }
                .agent-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-right: 8px;
                }
                .status-idle { background-color: var(--vscode-descriptionForeground); }
                .status-running { background-color: var(--vscode-progressBar-foreground); }
                .status-completed { background-color: var(--vscode-charts-green); }
                .status-failed { background-color: var(--vscode-errorForeground); }
            </style>
        </head>
        <body>
            <h2>🚀 OLYMPUS Build Progress</h2>
            <div id="progress-container">
                <p>Waiting for build to start...</p>
            </div>

            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();
                let currentBuild = null;

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'progressUpdate') {
                        updateProgress(message.data);
                    }
                });

                function updateProgress(update) {
                    currentBuild = update;
                    const container = document.getElementById('progress-container');

                    let html = \`
                        <div class="progress-container">
                            <h3>Build Status: \${update.status.toUpperCase()}</h3>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: \${update.progress}%"></div>
                            </div>
                            <p><strong>\${update.progress.toFixed(1)}%</strong> - \${update.message || 'Processing...'}</p>
                        </div>

                        <h4>Agent Status:</h4>
                    \`;

                    update.agents.forEach(agent => {
                        const statusClass = \`status-\${agent.status}\`;
                        html += \`
                            <div class="agent-status">
                                <div class="agent-dot \${statusClass}"></div>
                                <span><strong>\${agent.name}</strong> - \${agent.status} (\${agent.progress.toFixed(1)}%)</span>
                            </div>
                        \`;
                    });

                    container.innerHTML = html;
                }
            </script>
        </body>
        </html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}