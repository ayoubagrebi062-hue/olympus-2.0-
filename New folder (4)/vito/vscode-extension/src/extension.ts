import * as vscode from 'vscode';
import { OlympusAPI } from './api/olympusApi';
import { ProgressPanel } from './ui/progressPanel';
import { BuildExplorerProvider } from './providers/buildExplorer';
import { WebSocketManager } from './network/webSocketManager';
import { DelightEngine } from './intelligence/delightEngine';

let olympusApi: OlympusAPI;
let progressPanel: ProgressPanel;
let buildExplorer: BuildExplorerProvider;
let webSocketManager: WebSocketManager;
let delightEngine: DelightEngine;

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('OLYMPUS Extension: Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't crash the extension, just log
});

process.on('uncaughtException', (error) => {
    console.error('OLYMPUS Extension: Uncaught Exception:', error);
    // Don't crash the extension, just log
});

export function activate(context: vscode.ExtensionContext) {
    try {
        console.log('OLYMPUS AI Agent Builder extension is now active!');

        // Record activation telemetry with privacy controls
        const config = vscode.workspace.getConfiguration('olympus');
        if (config.get('telemetryEnabled', true)) {
            recordTelemetry('extension_activated', {
                vscodeVersion: vscode.version,
                platform: process.platform,
                nodeVersion: process.version,
                // Don't send personally identifiable info
                anonymousId: generateAnonymousId()
            });
        }

        // Show loading indicator with timeout
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.text = "$(loading~spin) OLYMPUS Initializing...";
        statusBarItem.show();

        // Add initialization timeout
        const initTimeout = setTimeout(() => {
            statusBarItem.text = "$(warning) OLYMPUS: Initialization timeout";
            console.warn('OLYMPUS: Extension initialization timed out after 30 seconds');
        }, 30000);

        // Initialize core services with error handling
        try {
            initializeServices(context);
        } catch (error) {
            console.error('OLYMPUS Extension: Failed to initialize services:', error);
            vscode.window.showErrorMessage('OLYMPUS: Failed to initialize. Please check your settings.');
            statusBarItem.dispose();
            return;
        }

        // Register commands with error boundaries
        try {
            registerCommands(context);
        } catch (error) {
            console.error('OLYMPUS Extension: Failed to register commands:', error);
            vscode.window.showErrorMessage('OLYMPUS: Failed to register commands.');
        }

        // Register providers
        try {
            registerProviders(context);
        } catch (error) {
            console.error('OLYMPUS Extension: Failed to register providers:', error);
        }

        // Setup real-time updates
        try {
            setupRealTimeUpdates(context);
        } catch (error) {
            console.error('OLYMPUS Extension: Failed to setup real-time updates:', error);
        }

        // Hide loading indicator and show welcome
        setTimeout(() => {
            clearTimeout(initTimeout);
            statusBarItem.dispose();
            try {
                showWelcomeMessage();
            } catch (error) {
                console.error('OLYMPUS Extension: Failed to show welcome message:', error);
            }
        }, 1000);

    } catch (error) {
        console.error('OLYMPUS Extension: Critical activation error:', error);
        vscode.window.showErrorMessage('OLYMPUS: Extension failed to activate. Please reload VS Code.');
    }
}

function initializeServices(context: vscode.ExtensionContext) {
    // Initialize API client
    const config = vscode.workspace.getConfiguration('olympus');
    olympusApi = new OlympusAPI({
        endpoint: config.get('api.endpoint', 'https://api.olympus.ai'),
        apiKey: config.get('api.key', ''),
        model: config.get('agent.model', 'claude-sonnet-4-20250514')
    });

    // Initialize UI components
    progressPanel = new ProgressPanel(context.extensionUri);
    buildExplorer = new BuildExplorerProvider();

    // Initialize WebSocket for real-time updates
    webSocketManager = new WebSocketManager(config.get('api.endpoint', 'https://api.olympus.ai'));
}

function registerCommands(context: vscode.ExtensionContext) {
    // Create new project command
    const createProjectCmd = vscode.commands.registerCommand('olympus.createProject', async () => {
        try {
            const projectType = await vscode.window.showQuickPick([
                { label: 'React Application', description: 'Full-stack React app with API' },
                { label: 'Next.js Blog', description: 'Modern blog with MDX support' },
                { label: 'E-commerce Store', description: 'Complete online store' },
                { label: 'Dashboard App', description: 'Analytics dashboard with charts' },
                { label: 'Mobile App', description: 'React Native mobile application' }
            ], { placeHolder: 'Select project type' });

            if (!projectType) return;

            const folderUri = await vscode.window.showOpenDialog({
                canSelectFolders: true,
                canSelectFiles: false,
                openLabel: 'Select Project Folder'
            });

            if (!folderUri || folderUri.length === 0) return;

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Creating OLYMPUS Project...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Initializing project...' });

                const result = await olympusApi.createProject({
                    type: projectType.label.toLowerCase().replace(' ', '-'),
                    path: folderUri[0].fsPath,
                    template: 'professional'
                });

                progress.report({ increment: 50, message: 'Setting up project structure...' });

                // Open the created project
                const projectUri = vscode.Uri.file(result.projectPath);
                await vscode.commands.executeCommand('vscode.openFolder', projectUri, false);

                progress.report({ increment: 100, message: 'Project created successfully!' });

                vscode.window.showInformationMessage(
                    `🎉 OLYMPUS project created! ${result.agentCount} agents are ready to build.`
                );
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create project: ${error.message}`);
        }
    });

    // Build component command
    const buildComponentCmd = vscode.commands.registerCommand('olympus.buildComponent', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found.');
            return;
        }

        try {
            // Get selected text or current line context
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            const contextText = selectedText || editor.document.lineAt(selection.active.line).text;

            if (!contextText.trim()) {
                vscode.window.showWarningMessage('Please select some code or place cursor on a component to build.');
                return;
            }

            // Show progress panel
            progressPanel.show();

            // Start the build
            const buildResult = await olympusApi.buildComponent({
                code: contextText,
                filePath: editor.document.fileName,
                language: getLanguageFromFile(editor.document.fileName),
                context: getSurroundingContext(editor)
            });

            // Show real-time progress
            webSocketManager.subscribeToBuild(buildResult.buildId, (update) => {
                progressPanel.updateProgress({
                    buildId: update.buildId,
                    status: update.status,
                    progress: update.progress,
                    currentStep: update.currentStep,
                    message: update.message,
                    agents: update.agents,
                    timestamp: update.timestamp
                });
            });

            vscode.window.showInformationMessage('OLYMPUS agents are building your component...');

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to build component: ${error.message}`);
        }
    });

    // Run agent pipeline command
    const runAgentsCmd = vscode.commands.registerCommand('olympus.runAgents', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('Please open a workspace folder first.');
            return;
        }

        try {
            const pipelineType = await vscode.window.showQuickPick([
                { label: 'Full Application Build', description: 'Complete app from concept to deployment' },
                { label: 'Feature Development', description: 'Add new features to existing app' },
                { label: 'Code Review & Optimization', description: 'Review and improve existing code' },
                { label: 'Testing & Quality Assurance', description: 'Add comprehensive tests' },
                { label: 'Security Audit', description: 'Security analysis and fixes' }
            ], { placeHolder: 'Select pipeline type' });

            if (!pipelineType) return;

            progressPanel.show();

            const result = await olympusApi.runPipeline({
                type: pipelineType.label.toLowerCase().replace(/\s+/g, '-'),
                workspacePath: workspaceFolder.uri.fsPath,
                files: await getWorkspaceFiles(workspaceFolder)
            });

            webSocketManager.subscribeToBuild(result.buildId, (update) => {
                progressPanel.updateProgress({
                    buildId: update.buildId,
                    status: update.status,
                    progress: update.progress,
                    currentStep: update.currentStep,
                    message: update.message,
                    agents: update.agents,
                    timestamp: update.timestamp
                });
            });

            vscode.window.showInformationMessage(`🚀 OLYMPUS pipeline started! ${result.agentCount} agents activated.`);

        } catch (error) {
            vscode.window.showErrorMessage(`Pipeline failed: ${error.message}`);
        }
    });

    // Show progress command
    const showProgressCmd = vscode.commands.registerCommand('olympus.showProgress', () => {
        progressPanel.show();
    });

    context.subscriptions.push(
        createProjectCmd,
        buildComponentCmd,
        runAgentsCmd,
        showProgressCmd
    );
}

function registerProviders(context: vscode.ExtensionContext) {
    // Register build explorer tree view
    vscode.window.registerTreeDataProvider('olympusExplorer', buildExplorer);
    context.subscriptions.push(buildExplorer);
}

function setupRealTimeUpdates(context: vscode.ExtensionContext) {
    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('olympus')) {
            // Reinitialize API with new config
            const config = vscode.workspace.getConfiguration('olympus');
            olympusApi.updateConfig({
                endpoint: config.get('api.endpoint'),
                apiKey: config.get('api.key'),
                model: config.get('agent.model')
            });
        }
    });

    // Setup WebSocket connection for real-time updates
    webSocketManager.connect();
}

function showWelcomeMessage() {
    const config = vscode.workspace.getConfiguration('olympus');
    const hasApiKey = !!config.get('api.key');

    if (!hasApiKey) {
        vscode.window.showInformationMessage(
            'Welcome to OLYMPUS! Please configure your API key in settings to get started.',
            'Open Settings'
        ).then(selection => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'olympus');
            }
        });
    } else {
        vscode.window.showInformationMessage(
            'OLYMPUS is ready! Use Ctrl+Shift+O (Cmd+Shift+O on Mac) to build components.'
        );
    }
}

// Telemetry utility
function recordTelemetry(event: string, properties: Record<string, any>): void {
    const config = vscode.workspace.getConfiguration('olympus');
    if (!config.get('telemetryEnabled', true)) return;

    // In production, this would send to analytics service
    console.log('Telemetry:', event, properties);

    // Could integrate with services like Mixpanel, Amplitude, etc.
    // Example: mixpanel.track(event, properties);
}

// Generate anonymous ID for telemetry (GDPR compliant)
function generateAnonymousId(): string {
    // Use VS Code's machine ID or generate a consistent anonymous ID
    // This ensures the same user gets the same ID without being personally identifiable
    const crypto = require('crypto');
    const machineId = vscode.env.machineId || 'unknown';
    return crypto.createHash('sha256').update(machineId).digest('hex').substring(0, 16);
}

// Utility functions
function getLanguageFromFile(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
        'ts': 'typescript',
        'tsx': 'typescript',
        'js': 'javascript',
        'jsx': 'javascript',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'go': 'go',
        'rs': 'rust'
    };
    return languageMap[ext || ''] || 'typescript';
}

function getSurroundingContext(editor: vscode.TextEditor): string {
    const document = editor.document;
    const currentLine = editor.selection.active.line;
    const startLine = Math.max(0, currentLine - 5);
    const endLine = Math.min(document.lineCount - 1, currentLine + 5);

    let context = '';
    for (let i = startLine; i <= endLine; i++) {
        context += document.lineAt(i).text + '\n';
    }
    return context;
}

async function getWorkspaceFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<string[]> {
    const files: string[] = [];
    const pattern = '**/*.{ts,tsx,js,jsx,py,java,go,rs,md,json}';

    const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, pattern),
        '**/node_modules/**',
        100
    );

    return uris.map(uri => vscode.workspace.asRelativePath(uri, workspaceFolder));
}

export function deactivate() {
    webSocketManager?.disconnect();
    progressPanel?.dispose();
}