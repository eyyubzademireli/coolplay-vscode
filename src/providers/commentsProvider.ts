import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CommentsProvider implements vscode.TreeDataProvider<CommentItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CommentItem | undefined | null | void> = new vscode.EventEmitter<CommentItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CommentItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private comments: CommentItem[] = [];
    private allComments: CommentItem[] = [];
    private activeFilter: string | null = null;
    private showActiveFileOnly: boolean = true;
    private scanTimeout: NodeJS.Timeout | undefined;
    private tabType: 'pending' | 'completed';
    
    private readonly commentPatterns = [
        { type: 'FIXME', regex: /\/\/\s*(?:@DONE-)?FIXME:?\s*(.+)/gi, icon: 'bug' },
        { type: 'TODO', regex: /\/\/\s*(?:@DONE-)?TODO:?\s*(.+)/gi, icon: 'checklist' },
        { type: 'HACK', regex: /\/\/\s*(?:@DONE-)?HACK:?\s*(.+)/gi, icon: 'warning' },
        { type: 'NOTE', regex: /\/\/\s*(?:@DONE-)?NOTE:?\s*(.+)/gi, icon: 'info' },
        { type: 'BUG', regex: /\/\/\s*(?:@DONE-)?BUG:?\s*(.+)/gi, icon: 'bug' },
        { type: 'REVIEW', regex: /\/\/\s*(?:@DONE-)?REVIEW:?\s*(.+)/gi, icon: 'eye' },
        { type: 'OPTIMIZE', regex: /\/\/\s*(?:@DONE-)?OPTIMIZE:?\s*(.+)/gi, icon: 'rocket' },
        { type: 'WARNING', regex: /\/\/\s*(?:@DONE-)?WARNING:?\s*(.+)/gi, icon: 'alert' }
    ];

    constructor(tabType: 'pending' | 'completed' = 'pending') {
        this.tabType = tabType;
        this.scanWorkspaceForComments();
        
        // Watch for file changes with debounce
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js,tsx,jsx,py,java,cpp,c,cs,php,go,rs}');
        watcher.onDidChange(() => this.debouncedScan());
        watcher.onDidCreate(() => this.debouncedScan());
        watcher.onDidDelete(() => this.debouncedScan());
        
        // Watch for active editor changes - always enabled
        vscode.window.onDidChangeActiveTextEditor(() => {
            this.applyFilter();
        });
    }

    private debouncedScan(): void {
        // Clear existing timeout
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
        }
        
        // Set new timeout for 500ms
        this.scanTimeout = setTimeout(() => {
            this.scanWorkspaceForComments();
        }, 500);
    }

    refresh(): void {
        // Clear any pending scans
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
        }
        this.scanWorkspaceForComments();
    }

    private async scanWorkspaceForComments(): Promise<void> {
        this.allComments = [];
        
        if (!vscode.workspace.workspaceFolders) {
            this.applyFilter();
            return;
        }

        for (const folder of vscode.workspace.workspaceFolders) {
            await this.scanDirectory(folder.uri.fsPath);
        }

        // Sort comments by type and then by file
        this.allComments.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }
            return a.filePath.localeCompare(b.filePath);
        });

        this.applyFilter();
    }

    private async scanDirectory(dirPath: string): Promise<void> {
        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (entry.isDirectory()) {
                    // Skip node_modules, .git, out, dist directories
                    if (!['node_modules', '.git', 'out', 'dist', '.vscode'].includes(entry.name)) {
                        await this.scanDirectory(fullPath);
                    }
                } else if (entry.isFile()) {
                    // Only scan code files
                    const ext = path.extname(entry.name).toLowerCase();
                    if (['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.go', '.rs'].includes(ext)) {
                        await this.scanFile(fullPath);
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning directory:', error);
        }
    }

    private async scanFile(filePath: string): Promise<void> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const lines = content.split('\n');
            const relativePath = vscode.workspace.asRelativePath(filePath);
    
            lines.forEach((line, index) => {
                for (const pattern of this.commentPatterns) {
                    pattern.regex.lastIndex = 0; // Reset regex
                    const match = pattern.regex.exec(line.trim());
                    if (match) {
                        const message = match[1].trim();
                        // Check if the line contains @DONE- prefix
                        const isChecked = line.includes(`@DONE-${pattern.type}:`);
                        this.allComments.push(new CommentItem(
                            pattern.type,
                            message,
                            relativePath,
                            index + 1,
                            pattern.icon,
                            filePath,
                            isChecked
                        ));
                    }
                }
            });
        } catch (error) {
            console.error('Error reading file:', error);
        }
    }

    private applyFilter(): void {
        let filteredComments = [...this.allComments];
        
        // Filter by tab type (pending/completed)
        if (this.tabType === 'pending') {
            filteredComments = filteredComments.filter(comment => !comment.isChecked);
        } else {
            filteredComments = filteredComments.filter(comment => comment.isChecked);
        }
        
        // Always filter by active file
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const activeFilePath = activeEditor.document.uri.fsPath;
            filteredComments = filteredComments.filter(comment => comment.fullPath === activeFilePath);
        } else {
            filteredComments = [];
        }
        
        // Apply type filter
        if (this.activeFilter) {
            filteredComments = filteredComments.filter(comment => comment.type === this.activeFilter);
        }
        
        this.comments = filteredComments;
        this._onDidChangeTreeData.fire();
    }

    async showFilterOptions(): Promise<void> {
        const availableTypes = [...new Set(this.allComments.map(comment => comment.type))];
        const options = ['All Comments', ...availableTypes];
        
        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select comment type to filter'
        });
        
        if (selected) {
            if (selected === 'All Comments') {
                this.activeFilter = null;
            } else {
                this.activeFilter = selected;
            }
            this.applyFilter();
        }
    }

    getChildren(element?: CommentItem): Thenable<CommentItem[]> {
        if (!element) {
            return Promise.resolve(this.comments);
        }
        return Promise.resolve([]);
    }

    addComment(comment: string, title?: string): void {
        const commentTitle = title || 'Manual Comment';
        this.comments.push(new CommentItem(
            'MANUAL',
            comment,
            'Manual Entry',
            0,
            'comment',
            ''
        ));
        this._onDidChangeTreeData.fire();
    }

    removeComment(index: number): void {
        if (index >= 0 && index < this.comments.length) {
            this.comments.splice(index, 1);
            this._onDidChangeTreeData.fire();
        }
    }

    clearComments(): void {
        this.comments = [];
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CommentItem): vscode.TreeItem {
        return element;
    }

    // Add toggleComment method to CommentsProvider
    async toggleComment(commentItem: CommentItem): Promise<void> {
        try {
            await this.updateCommentInFile(commentItem);
            // Refresh after update
            setTimeout(() => {
                this.refresh();
            }, 100);
        } catch (error) {
            console.error('Error toggling comment:', error);
            vscode.window.showErrorMessage('Error occurred while updating comment');
        }
    }

    private async updateCommentInFile(commentItem: CommentItem): Promise<void> {
        try {
            const content = await fs.promises.readFile(commentItem.fullPath, 'utf8');
            const lines = content.split('\n');
            const lineIndex = commentItem.lineNumber - 1;
            
            if (lineIndex >= 0 && lineIndex < lines.length) {
                const currentLine = lines[lineIndex];
                let newLine: string;
                
                if (commentItem.isChecked) {
                    // Remove @DONE- prefix and restore original comment type
                    newLine = currentLine.replace(new RegExp(`@DONE-(${commentItem.type}:?\\s*)`), '$1');
                } else {
                    // Add @DONE-TYPE: prefix
                    const commentMatch = currentLine.match(new RegExp(`(\/\/\\s*)(${commentItem.type}:?\\s*)(.+)`));
                    if (commentMatch) {
                        newLine = currentLine.replace(commentMatch[2], `@DONE-${commentItem.type}: `);
                    } else {
                        newLine = currentLine;
                    }
                }
                
                lines[lineIndex] = newLine;
                const newContent = lines.join('\n');
                await fs.promises.writeFile(commentItem.fullPath, newContent, 'utf8');
            }
        } catch (error) {
            console.error('Error updating file:', error);
            throw error;
        }
    }

    dispose(): void {
        if (this.scanTimeout) {
            clearTimeout(this.scanTimeout);
        }
    }
}

class CommentItem extends vscode.TreeItem {
    public isChecked: boolean;

    constructor(
        public readonly type: string,
        public readonly message: string,
        public readonly filePath: string,
        public readonly lineNumber: number,
        private readonly iconName: string,
        public readonly fullPath: string,
        isChecked: boolean = false
    ) {
        super(`${type}: ${message}`, vscode.TreeItemCollapsibleState.None);
        
        this.isChecked = isChecked;
        this.tooltip = `${this.type}: ${this.message}\nFile: ${this.filePath}\nLine: ${this.lineNumber}`;
        this.description = `${this.filePath}:${this.lineNumber}`;
        
        this.updateDisplay();
        
        // Make item clickable to open file at specific line
        if (this.fullPath && this.lineNumber > 0) {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [
                    vscode.Uri.file(this.fullPath),
                    {
                        selection: new vscode.Range(
                            new vscode.Position(this.lineNumber - 1, 0),
                            new vscode.Position(this.lineNumber - 1, 0)
                        )
                    }
                ]
            };
        }
        
        // Context value for menu actions
        this.contextValue = 'commentItem';
    }

    private updateDisplay(): void {
        if (this.isChecked) {
            // Show uncheck icon for checked comments (completed tab)
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        } else {
            // Show original icon for unchecked comments (pending tab)
            if (this.iconName) {
                this.iconPath = new vscode.ThemeIcon(this.iconName);
            }
        }
    }

    toggleChecked(): void {
        this.isChecked = !this.isChecked;
        this.updateDisplay();
    }
}