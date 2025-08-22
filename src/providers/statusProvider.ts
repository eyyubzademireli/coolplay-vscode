import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface FileStatus {
    filePath: string;
    status: 'DRAFT' | 'ONGOING' | 'DONE';
    lastModified: number;
}

export class StatusProvider implements vscode.TreeDataProvider<StatusItem>, vscode.FileDecorationProvider {
    private _onDidChangeTreeData: vscode.EventEmitter<StatusItem | undefined | null | void> = new vscode.EventEmitter<StatusItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<StatusItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private _onDidChangeFileDecorations: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined> = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
    readonly onDidChangeFileDecorations: vscode.Event<vscode.Uri | vscode.Uri[] | undefined> = this._onDidChangeFileDecorations.event;

    private fileStatuses: Map<string, FileStatus> = new Map();
    private statusItems: StatusItem[] = [];

    constructor() {
        this.loadFileStatuses();
        this.updateStatusItems();
        
        // Watch for file changes
        vscode.workspace.onDidOpenTextDocument(() => {
            this.refresh();
        });
        
        vscode.workspace.onDidCloseTextDocument(() => {
            this.refresh();
        });
        
        vscode.window.onDidChangeActiveTextEditor(() => {
            this.refresh();
        });
    }

    // File Decoration Provider methods
    provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
        const filePath = uri.fsPath;
        const relativePath = this.getRelativePath(filePath);
        const fileStatus = this.fileStatuses.get(relativePath);
        
        if (!fileStatus) {
            return undefined;
        }

        switch (fileStatus.status) {
            case 'DRAFT':
                return {
                    badge: 'D',
                    tooltip: 'Draft',
                    color: new vscode.ThemeColor('charts.blue')
                };
            case 'ONGOING':
                return {
                    badge: 'O',
                    tooltip: 'Ongoing', 
                    color: new vscode.ThemeColor('charts.yellow')
                };
            case 'DONE':
                return {
                    badge: '✓',
                    tooltip: 'Done',
                    color: new vscode.ThemeColor('charts.green')
                };
            default:
                return undefined;
        }
    }

    refresh(): void {
        this.updateStatusItems();
        this._onDidChangeTreeData.fire();
        this._onDidChangeFileDecorations.fire(undefined);
    }

    getTreeItem(element: StatusItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StatusItem): Thenable<StatusItem[]> {
        if (!element) {
            return Promise.resolve(this.statusItems);
        }
        return Promise.resolve([]);
    }

    private updateStatusItems(): void {
        this.statusItems = [];
        
        // Yalnız aktiv editordakı faylı göstər
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.isUntitled || activeEditor.document.uri.scheme !== 'file') {
            return;
        }
        
        const filePath = activeEditor.document.uri.fsPath;
        const relativePath = this.getRelativePath(filePath);
        const fileStatus = this.getFileStatus(filePath);
        
        // Fayl adından sonra status əlavə et
        const labelWithStatus = `${relativePath} - ${fileStatus.status}`;
        
        const statusItem = new StatusItem(
            labelWithStatus,
            fileStatus.status,
            vscode.TreeItemCollapsibleState.None,
            this.getStatusIcon(fileStatus.status),
            filePath
        );
        
        this.statusItems.push(statusItem);
    }

    private getStatusIcon(status: 'DRAFT' | 'ONGOING' | 'DONE'): string {
        switch (status) {
            case 'DRAFT': return 'edit';
            case 'ONGOING': return 'clock';
            case 'DONE': return 'check';
            default: return 'file';
        }
    }

    private getFileStatus(filePath: string): FileStatus {
        const relativePath = this.getRelativePath(filePath);
        if (!this.fileStatuses.has(relativePath)) {
            // New file - set as DRAFT by default
            const fileStatus: FileStatus = {
                filePath: relativePath, // Use relative path
                status: 'DRAFT',
                lastModified: Date.now()
            };
            this.fileStatuses.set(relativePath, fileStatus);
            this.saveFileStatuses();
        }
        return this.fileStatuses.get(relativePath)!;
    }

    toggleFileStatus(filePath: string): void {
        const relativePath = this.getRelativePath(filePath);
        const fileStatus = this.getFileStatus(filePath);
        
        // Cycle through statuses: DRAFT -> ONGOING -> DONE -> DRAFT
        switch (fileStatus.status) {
            case 'DRAFT':
                fileStatus.status = 'ONGOING';
                break;
            case 'ONGOING':
                fileStatus.status = 'DONE';
                break;
            case 'DONE':
                fileStatus.status = 'DRAFT';
                break;
        }
        
        fileStatus.lastModified = Date.now();
        this.fileStatuses.set(relativePath, fileStatus);
        this.saveFileStatuses();
        this.refresh();
    }

    setFileStatus(filePath: string, status: 'DRAFT' | 'ONGOING' | 'DONE'): void {
        const relativePath = this.getRelativePath(filePath);
        const fileStatus = this.getFileStatus(filePath);
        fileStatus.status = status;
        fileStatus.lastModified = Date.now();
        
        this.fileStatuses.set(relativePath, fileStatus);
        this.saveFileStatuses();
        this.refresh();
    }

    // Method to set status from file explorer context menu
    setFileStatusFromExplorer(uri: vscode.Uri, status: 'DRAFT' | 'ONGOING' | 'DONE'): void {
        this.setFileStatus(uri.fsPath, status);
    }

    private getRelativePath(absolutePath: string): string {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(absolutePath));
        if (workspaceFolder) {
            return path.relative(workspaceFolder.uri.fsPath, absolutePath);
        }
        return path.basename(absolutePath);
    }

    private getWorkspaceRoot(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            return workspaceFolders[0].uri.fsPath;
        }
        return undefined;
    }

    private getStatusFilePath(): string | undefined {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) {
            return undefined;
        }
        
        const coolplayDir = path.join(workspaceRoot, '.coolplay');
        if (!fs.existsSync(coolplayDir)) {
            fs.mkdirSync(coolplayDir, { recursive: true });
        }
        
        return path.join(coolplayDir, 'file-statuses.json');
    }

    private loadFileStatuses(): void {
        const statusFilePath = this.getStatusFilePath();
        if (!statusFilePath || !fs.existsSync(statusFilePath)) {
            return;
        }
        
        try {
            const data = fs.readFileSync(statusFilePath, 'utf8');
            const statusData: FileStatus[] = JSON.parse(data);
            
            this.fileStatuses.clear();
            statusData.forEach(status => {
                // Convert existing absolute paths to relative paths
                const relativePath = path.isAbsolute(status.filePath) 
                    ? this.getRelativePath(status.filePath)
                    : status.filePath;
                
                this.fileStatuses.set(relativePath, {
                    ...status,
                    filePath: relativePath
                });
            });
        } catch (error) {
            console.error('Error loading file statuses:', error);
        }
    }

    private saveFileStatuses(): void {
        const statusFilePath = this.getStatusFilePath();
        if (!statusFilePath) {
            return;
        }
        
        try {
            const statusData = Array.from(this.fileStatuses.values());
            fs.writeFileSync(statusFilePath, JSON.stringify(statusData, null, 2));
        } catch (error) {
            console.error('Error saving file statuses:', error);
        }
    }
}

class StatusItem extends vscode.TreeItem {
    public status: 'DRAFT' | 'ONGOING' | 'DONE';
    public filePath?: string;
    
    constructor(
        public readonly label: string,
        status: 'DRAFT' | 'ONGOING' | 'DONE',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        private readonly iconName?: string,
        filePath?: string
    ) {
        super(label, collapsibleState);
        this.status = status;
        this.filePath = filePath;
        this.updateDisplay();
        
        // Add context value for menu items
        this.contextValue = 'fileStatusItem';
    }

    private updateDisplay(): void {
        if (this.iconName) {
            this.iconPath = new vscode.ThemeIcon(this.iconName);
        }
        
        // Status rəngini əlavə et
        switch (this.status) {
            case 'DRAFT':
                this.iconPath = new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.blue'));
                break;
            case 'ONGOING':
                this.iconPath = new vscode.ThemeIcon('clock', new vscode.ThemeColor('charts.yellow'));
                break;
            case 'DONE':
                this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
                break;
        }
    }
}