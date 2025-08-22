import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface GlobalRule {
    id: string;
    name: string;
    description: string;
}

interface FileRuleState {
    ruleId: string;
    isChecked: boolean;
}

interface FileRulesData {
    filePath: string;
    rules: FileRuleState[];
}

interface LocalRule {
    id: string;
    name: string;
    description: string;
    filePath: string;
    isChecked: boolean;
}

export class RulesProvider implements vscode.TreeDataProvider<RuleItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RuleItem | undefined | null | void> = new vscode.EventEmitter<RuleItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RuleItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private globalRules: GlobalRule[] = [];
    private localRules: LocalRule[] = [];
    private currentFilePath: string | undefined;
    private sortMode: 'default' | 'checked-first' | 'unchecked-first' = 'default';
    private filterMode: 'all' | 'global' | 'local' = 'all'; // Add filter mode

    constructor() {
        this.loadGlobalRules();
        this.loadLocalRules(); // Added missing call
        this.updateCurrentFile();
        
        // Listen for active editor changes
        vscode.window.onDidChangeActiveTextEditor(() => {
            this.updateCurrentFile();
        });
    }

    private updateCurrentFile(): void {
        const activeEditor = vscode.window.activeTextEditor;
        this.currentFilePath = activeEditor?.document.fileName;
        this.refresh();
    }

    private getWorkspaceRoot(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }

    private ensureCoolplayDir(): string | undefined {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return undefined;
        
        const coolplayDir = path.join(workspaceRoot, '.coolplay');
        
        if (!fs.existsSync(coolplayDir)) {
            fs.mkdirSync(coolplayDir, { recursive: true });
            
            // Windows-da folderi gizlət
            if (process.platform === 'win32') {
                try {
                    execSync(`attrib +h "${coolplayDir}"`, { stdio: 'ignore' });
                } catch (error) {
                    console.warn('Could not hide .coolplay directory:', error);
                }
            }
        }
        
        return coolplayDir;
    }

    private getGlobalRulesPath(): string | undefined {
        const coolplayDir = this.ensureCoolplayDir();
        return coolplayDir ? path.join(coolplayDir, 'global-rules.json') : undefined;
    }

    private getFileRulesPath(filePath: string): string | undefined {
        const coolplayDir = this.ensureCoolplayDir();
        if (!coolplayDir) return undefined;
        
        const fileName = path.basename(filePath);
        return path.join(coolplayDir, `rules-${fileName}.json`);
    }

    private loadGlobalRules(): void {
        const globalRulesPath = this.getGlobalRulesPath();
        if (!globalRulesPath || !fs.existsSync(globalRulesPath)) {
            this.globalRules = [];
            return;
        }

        try {
            const data = fs.readFileSync(globalRulesPath, 'utf8');
            this.globalRules = JSON.parse(data);
        } catch (error) {
            console.error('Error loading global rules:', error);
            this.globalRules = [];
        }
    }

    private saveGlobalRules(): void {
        const globalRulesPath = this.getGlobalRulesPath();
        if (!globalRulesPath) return;

        try {
            fs.writeFileSync(globalRulesPath, JSON.stringify(this.globalRules, null, 2));
        } catch (error) {
            console.error('Error saving global rules:', error);
        }
    }

    private loadFileRuleStates(filePath: string): FileRuleState[] {
        const fileRulesPath = this.getFileRulesPath(filePath);
        if (!fileRulesPath || !fs.existsSync(fileRulesPath)) {
            return [];
        }

        try {
            const data = fs.readFileSync(fileRulesPath, 'utf8');
            const fileData: FileRulesData = JSON.parse(data);
            return fileData.rules || [];
        } catch (error) {
            console.error('Error loading file rule states:', error);
            return [];
        }
    }

    private saveFileRuleStates(filePath: string, ruleStates: FileRuleState[]): void {
        const fileRulesPath = this.getFileRulesPath(filePath);
        if (!fileRulesPath) return;

        const fileData: FileRulesData = {
            filePath: this.getRelativePath(filePath),
            rules: ruleStates
        };

        try {
            fs.writeFileSync(fileRulesPath, JSON.stringify(fileData, null, 2));
        } catch (error) {
            console.error('Error saving file rule states:', error);
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    addRule(ruleName: string, ruleDescription?: string): void {
        const description = ruleDescription || 'Custom rule';
        const newRule: GlobalRule = {
            id: `rule_${Date.now()}_${Math.random()}`,
            name: ruleName,
            description
        };
        
        this.globalRules.push(newRule);
        this.saveGlobalRules();
        this.refresh();
    }

    removeRule(ruleItem: RuleItem): void {
        if (ruleItem.ruleType === 'global') {
            const index = this.globalRules.findIndex(rule => rule.id === ruleItem.ruleId);
            if (index >= 0) {
                this.globalRules.splice(index, 1);
                this.saveGlobalRules();
                // Remove global rule from all file-specific state files
                this.removeRuleFromAllFileStates(ruleItem.ruleId);
                this.refresh();
            }
        } else if (ruleItem.ruleType === 'local') {
            const index = this.localRules.findIndex(rule => rule.id === ruleItem.ruleId);
            if (index >= 0) {
                this.localRules.splice(index, 1);
                this.saveLocalRules();
                // Remove local rule from all file-specific state files
                this.removeRuleFromAllFileStates(ruleItem.ruleId);
                this.refresh();
            }
        }
    }

    private removeRuleFromAllFileStates(ruleId: string): void {
        const coolplayDir = this.ensureCoolplayDir();
        if (!coolplayDir) return;
    
        try {
            // Find all rules-*.json files in .coolplay folder
            const files = fs.readdirSync(coolplayDir);
            const ruleFiles = files.filter(file => file.startsWith('rules-') && file.endsWith('.json'));
    
            ruleFiles.forEach(fileName => {
                const filePath = path.join(coolplayDir, fileName);
                try {
                    const data = fs.readFileSync(filePath, 'utf8');
                    const fileData: FileRulesData = JSON.parse(data);
                    
                    // Remove this rule ID from rules array
                    const originalLength = fileData.rules.length;
                    fileData.rules = fileData.rules.filter(rule => rule.ruleId !== ruleId);
                    
                    // If there are changes, save the file again
                    if (fileData.rules.length !== originalLength) {
                        fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
                    }
                } catch (error) {
                    console.error(`Error processing file ${fileName}:`, error);
                }
            });
        } catch (error) {
            console.error('Error removing rule from file states:', error);
        }
    }

    editRule(ruleItem: RuleItem): void {
        vscode.window.showInputBox({
            prompt: 'Edit rule name',
            value: ruleItem.ruleName
        }).then(newName => {
            if (newName && newName.trim()) {
                vscode.window.showInputBox({
                    prompt: 'Edit rule description',
                    value: ruleItem.ruleDescription
                }).then(newDescription => {
                    if (newDescription !== undefined) {
                        const rule = this.globalRules.find(r => r.id === ruleItem.ruleId);
                        if (rule) {
                            rule.name = newName.trim();
                            rule.description = newDescription.trim() || 'Custom rule';
                            this.saveGlobalRules();
                            this.refresh();
                        }
                    }
                });
            }
        });
    }

    toggleRule(ruleItem: RuleItem): void {
        if (ruleItem.ruleType === 'local') {
            // Local rule üçün
            const localRule = this.localRules.find(rule => rule.id === ruleItem.ruleId);
            if (localRule) {
                localRule.isChecked = !localRule.isChecked;
                this.saveLocalRules();
                this.refresh();
            }
        } else {
            // Global rule üçün
            if (!this.currentFilePath) return;

            const fileRuleStates = this.loadFileRuleStates(this.currentFilePath);
            const existingStateIndex = fileRuleStates.findIndex(state => state.ruleId === ruleItem.ruleId);
            
            if (existingStateIndex >= 0) {
                fileRuleStates[existingStateIndex].isChecked = !fileRuleStates[existingStateIndex].isChecked;
            } else {
                fileRuleStates.push({
                    ruleId: ruleItem.ruleId,
                    isChecked: true
                });
            }
            
            this.saveFileRuleStates(this.currentFilePath, fileRuleStates);
            this.refresh();
        }
    }

    sortRules(): void {
        switch (this.sortMode) {
            case 'default':
                this.sortMode = 'checked-first';
                break;
            case 'checked-first':
                this.sortMode = 'unchecked-first';
                break;
            case 'unchecked-first':
                this.sortMode = 'default';
                break;
        }
        this.refresh();
    }

    getTreeItem(element: RuleItem): vscode.TreeItem {
        return element;
    }

    addGlobalRule(ruleName: string, ruleDescription?: string): void {
        const description = ruleDescription || 'Custom rule';
        const newRule: GlobalRule = {
            id: `global_rule_${Date.now()}_${Math.random()}`,
            name: ruleName,
            description
        };
        
        this.globalRules.push(newRule);
        this.saveGlobalRules();
        this.refresh();
    }

    addLocalRule(ruleName: string, ruleDescription?: string): void {
        if (!this.currentFilePath) {
            vscode.window.showErrorMessage('No active file');
            return;
        }
        
        const description = ruleDescription || 'Custom rule';
        const relativePath = this.getRelativePath(this.currentFilePath); // Use relative path
        
        const newRule: LocalRule = {
            id: `local_rule_${Date.now()}_${Math.random()}`,
            name: ruleName,
            description,
            filePath: relativePath, // Save relative path
            isChecked: false
        };
        
        this.localRules.push(newRule);
        this.saveLocalRules();
        this.refresh();
    }
    
    private loadLocalRules(): void {
        const coolplayDir = this.ensureCoolplayDir();
        if (!coolplayDir) return;
        
        const localRulesPath = path.join(coolplayDir, 'local-rules.json');
        if (!fs.existsSync(localRulesPath)) {
            this.localRules = [];
            return;
        }

        try {
            const data = fs.readFileSync(localRulesPath, 'utf8');
            const loadedRules: LocalRule[] = JSON.parse(data);
            
            // Convert existing absolute paths to relative paths
            this.localRules = loadedRules.map(rule => {
                if (path.isAbsolute(rule.filePath)) {
                    return {
                        ...rule,
                        filePath: this.getRelativePath(rule.filePath)
                    };
                }
                return rule;
            });
            
            // If there are changes, save the file again
            const hasChanges = loadedRules.some((rule, index) => 
                rule.filePath !== this.localRules[index].filePath
            );
            
            if (hasChanges) {
                this.saveLocalRules();
            }
        } catch (error) {
            console.error('Error loading local rules:', error);
            this.localRules = [];
        }
    }

    private saveLocalRules(): void {
        const coolplayDir = this.ensureCoolplayDir();
        if (!coolplayDir) return;
        
        const localRulesPath = path.join(coolplayDir, 'local-rules.json');
        try {
            fs.writeFileSync(localRulesPath, JSON.stringify(this.localRules, null, 2));
        } catch (error) {
            console.error('Error saving local rules:', error);
        }
    }

    
    filterRules(filterType: 'all' | 'global' | 'local'): void {
        this.filterMode = filterType;
        this.refresh();
    }

    // Update getChildren method to apply filter
    getChildren(element?: RuleItem): Thenable<RuleItem[]> {
        if (!element) {
            if (!this.currentFilePath) {
                return Promise.resolve([]);
            }

            const fileRuleStates = this.loadFileRuleStates(this.currentFilePath);
            
            // Global rules
            let globalRuleItems = this.globalRules.map(rule => {
                const fileState = fileRuleStates.find(state => state.ruleId === rule.id);
                const isChecked = fileState?.isChecked || false;
                
                return new RuleItem(rule.name, rule.description, isChecked, rule.id, 'global');
            });
            
            // Local rules for current file
            const currentRelativePath = this.getRelativePath(this.currentFilePath);
            let localRuleItems = this.localRules
                .filter(rule => rule.filePath === currentRelativePath)
                .map(rule => new RuleItem(rule.name, rule.description, rule.isChecked, rule.id, 'local'));
            
            // Apply filter
            let allRules: RuleItem[] = [];
            switch (this.filterMode) {
                case 'global':
                    allRules = globalRuleItems;
                    break;
                case 'local':
                    allRules = localRuleItems;
                    break;
                case 'all':
                default:
                    allRules = [...globalRuleItems, ...localRuleItems];
                    break;
            }

            // Apply sorting
            switch (this.sortMode) {
                case 'checked-first':
                    allRules.sort((a, b) => {
                        if (a.isChecked && !b.isChecked) return -1;
                        if (!a.isChecked && b.isChecked) return 1;
                        return 0;
                    });
                    break;
                case 'unchecked-first':
                    allRules.sort((a, b) => {
                        if (!a.isChecked && b.isChecked) return -1;
                        if (a.isChecked && !b.isChecked) return 1;
                        return 0;
                    });
                    break;
            }
            
            return Promise.resolve(allRules);
        }
        return Promise.resolve([]);
    }
    
    // Fix getRelativePath method
    private getRelativePath(absolutePath: string): string {
        const workspaceRoot = this.getWorkspaceRoot();
        if (!workspaceRoot) return absolutePath;
        
        // Calculate relative path from workspace folder
        const relativePath = path.relative(workspaceRoot, absolutePath);
        
        // Use \ for Windows
        return relativePath.replace(/\//g, '\\');
    }
}

class RuleItem extends vscode.TreeItem {
    public ruleName: string;
    public ruleDescription: string;
    public isChecked: boolean;
    public ruleId: string;
    public ruleType: 'global' | 'local';
    
    constructor(
        ruleName: string,
        ruleDescription: string,
        isChecked: boolean = false,
        ruleId: string,
        ruleType: 'global' | 'local'
    ) {
        super(ruleName, vscode.TreeItemCollapsibleState.None);
        
        this.ruleName = ruleName;
        this.ruleDescription = ruleDescription;
        this.isChecked = isChecked;
        this.ruleId = ruleId;
        this.ruleType = ruleType;
        
        this.updateDisplay();
        
        this.contextValue = 'ruleItem';
        
        this.command = {
            command: 'coolplay.toggleRule',
            title: 'Toggle Rule',
            arguments: [this]
        };
    }

    private updateDisplay(): void {
        this.iconPath = new vscode.ThemeIcon(this.isChecked ? 'check' : 'circle-outline');
        
        const typePrefix = this.ruleType === 'global' ? '🌐' : '📄';
        
        // Removed additional ✓ mark - icon is sufficient
        this.label = `${typePrefix} ${this.ruleName}`;
        
        this.tooltip = `${this.ruleName}: ${this.ruleDescription}\nType: ${this.ruleType === 'global' ? 'Global' : 'Local'}\nStatus: ${this.isChecked ? 'Completed' : 'Pending'}`;
        this.description = this.ruleDescription.length > 40 ? this.ruleDescription.substring(0, 40) + '...' : this.ruleDescription;
    }
}