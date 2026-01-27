import * as vscode from 'vscode';
import * as path from 'path';

export interface BuildItem {
    id: string;
    label: string;
    description?: string;
    tooltip?: string;
    iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
    command?: vscode.Command;
    children?: BuildItem[];
    contextValue?: string;
}

export class BuildExplorerProvider implements vscode.TreeDataProvider<BuildItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BuildItem | undefined | null | void> = new vscode.EventEmitter<BuildItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BuildItem | undefined | null | void> = this._onDidChangeTreeData.fire;

    private builds: BuildItem[] = [];

    constructor() {
        // Initialize with sample data
        this.refresh();
    }

    refresh(): void {
        // Simulate fetching recent builds
        this.builds = [
            {
                id: 'recent-builds',
                label: 'Recent Builds',
                children: [
                    {
                        id: 'build-1',
                        label: 'E-commerce Dashboard',
                        description: 'Completed 2 hours ago',
                        tooltip: 'React dashboard with analytics charts',
                        iconPath: new vscode.ThemeIcon('rocket'),
                        command: {
                            command: 'olympus.showProgress',
                            title: 'Show Build Details'
                        }
                    },
                    {
                        id: 'build-2',
                        label: 'User Authentication System',
                        description: 'Completed 5 hours ago',
                        tooltip: 'JWT-based auth with password reset',
                        iconPath: new vscode.ThemeIcon('shield'),
                        command: {
                            command: 'olympus.showProgress',
                            title: 'Show Build Details'
                        }
                    }
                ]
            },
            {
                id: 'templates',
                label: 'Project Templates',
                children: [
                    {
                        id: 'template-nextjs',
                        label: 'Next.js Blog',
                        description: 'Modern blog with MDX',
                        iconPath: new vscode.ThemeIcon('file-text'),
                        command: {
                            command: 'olympus.createProject',
                            title: 'Create Next.js Blog'
                        }
                    },
                    {
                        id: 'template-dashboard',
                        label: 'Analytics Dashboard',
                        description: 'React dashboard with charts',
                        iconPath: new vscode.ThemeIcon('graph'),
                        command: {
                            command: 'olympus.createProject',
                            title: 'Create Analytics Dashboard'
                        }
                    },
                    {
                        id: 'template-ecommerce',
                        label: 'E-commerce Store',
                        description: 'Complete online store',
                        iconPath: new vscode.ThemeIcon('package'),
                        command: {
                            command: 'olympus.createProject',
                            title: 'Create E-commerce Store'
                        }
                    }
                ]
            },
            {
                id: 'agents',
                label: 'Available Agents',
                children: [
                    {
                        id: 'agent-strategos',
                        label: 'Strategos (Discovery)',
                        description: 'Market research & planning',
                        iconPath: new vscode.ThemeIcon('search'),
                        tooltip: 'Analyzes market opportunities and user needs'
                    },
                    {
                        id: 'agent-archon',
                        label: 'Archon (Architecture)',
                        description: 'System design & planning',
                        iconPath: new vscode.ThemeIcon('circuit-board'),
                        tooltip: 'Designs scalable system architectures'
                    },
                    {
                        id: 'agent-datum',
                        label: 'Datum (Data)',
                        description: 'Database design & models',
                        iconPath: new vscode.ThemeIcon('database'),
                        tooltip: 'Creates optimized database schemas'
                    },
                    {
                        id: 'agent-nexus',
                        label: 'Nexus (API)',
                        description: 'API design & integration',
                        iconPath: new vscode.ThemeIcon('plug'),
                        tooltip: 'Builds robust API contracts'
                    },
                    {
                        id: 'agent-pixel',
                        label: 'Pixel (UI/UX)',
                        description: 'Interface design & components',
                        iconPath: new vscode.ThemeIcon('paintbrush'),
                        tooltip: 'Creates beautiful, accessible interfaces'
                    }
                ]
            }
        ];

        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: BuildItem): vscode.TreeItem {
        return {
            id: element.id,
            label: element.label,
            description: element.description,
            tooltip: element.tooltip,
            iconPath: element.iconPath,
            command: element.command,
            contextValue: element.contextValue,
            collapsibleState: element.children
                ? vscode.TreeItemCollapsibleState.Expanded
                : vscode.TreeItemCollapsibleState.None
        };
    }

    getChildren(element?: BuildItem): Thenable<BuildItem[]> {
        if (!element) {
            return Promise.resolve(this.builds);
        }

        return Promise.resolve(element.children || []);
    }

    addBuild(build: Omit<BuildItem, 'children'>): void {
        const recentBuilds = this.builds.find(b => b.id === 'recent-builds');
        if (recentBuilds && recentBuilds.children) {
            recentBuilds.children.unshift(build);
            // Keep only last 10 builds
            recentBuilds.children = recentBuilds.children.slice(0, 10);
            this._onDidChangeTreeData.fire();
        }
    }

    updateBuildStatus(buildId: string, status: string, description: string): void {
        const findAndUpdate = (items: BuildItem[]): boolean => {
            for (const item of items) {
                if (item.id === buildId) {
                    item.description = description;
                    return true;
                }
                if (item.children && findAndUpdate(item.children)) {
                    return true;
                }
            }
            return false;
        };

        if (findAndUpdate(this.builds)) {
            this._onDidChangeTreeData.fire();
        }
    }
}