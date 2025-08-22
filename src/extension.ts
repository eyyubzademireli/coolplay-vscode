import * as vscode from 'vscode';
import { StatusProvider } from './providers/statusProvider';
import { RulesProvider } from './providers/rulesProvider';
import { CommentsProvider } from './providers/commentsProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('CoolPlay extension is now active!');

    // Set context for when clause
    vscode.commands.executeCommand('setContext', 'coolplay:enabled', true);

    // Create providers
    const statusProvider = new StatusProvider();
    const rulesProvider = new RulesProvider();
    const pendingCommentsProvider = new CommentsProvider('pending');
    const completedCommentsProvider = new CommentsProvider('completed');

    // Register file decoration provider
    const fileDecorationProvider = vscode.window.registerFileDecorationProvider(statusProvider);

    // Register tree data providers
    vscode.window.createTreeView('coolplay-status', {
        treeDataProvider: statusProvider,
        showCollapseAll: false  // true-dan false-a dəyişdir
    });

    vscode.window.createTreeView('coolplay-rules', {
        treeDataProvider: rulesProvider,
        showCollapseAll: false
    });

    vscode.window.createTreeView('coolplay-comments-pending', {
        treeDataProvider: pendingCommentsProvider,
        showCollapseAll: false
    });

    vscode.window.createTreeView('coolplay-comments-completed', {
        treeDataProvider: completedCommentsProvider,
        showCollapseAll: false
    });

    // Register commands
    const refreshStatusCommand = vscode.commands.registerCommand('coolplay.refreshStatus', () => {
        statusProvider.refresh();
    });

    const addRuleCommand = vscode.commands.registerCommand('coolplay.addRule', async () => {
        // First ask for rule scope
        const scope = await vscode.window.showQuickPick(
            [
                { label: 'Global', description: 'For all files' },
                { label: 'Local', description: 'For active file only' }
            ],
            {
                placeHolder: 'Select rule scope'
            }
        );
        
        if (!scope) return;
        
        const rule = await vscode.window.showInputBox({
            prompt: 'Enter rule name'
        });
        
        if (rule) {
            const description = await vscode.window.showInputBox({
                prompt: 'Enter rule description (optional)',
                value: 'Custom rule'
            });
            
            if (scope.label === 'Global') {
                rulesProvider.addGlobalRule(rule, description);
            } else {
                rulesProvider.addLocalRule(rule, description);
            }
        }
    });

    // Old comment commands removed, new tab-specific commands added
    const refreshCommentsPendingCommand = vscode.commands.registerCommand('coolplay.refreshCommentsPending', () => {
        pendingCommentsProvider.refresh();
    });

    const refreshCommentsCompletedCommand = vscode.commands.registerCommand('coolplay.refreshCommentsCompleted', () => {
        completedCommentsProvider.refresh();
    });

    const filterCommentsPendingCommand = vscode.commands.registerCommand('coolplay.filterCommentsPending', () => {
        pendingCommentsProvider.showFilterOptions();
    });

    const filterCommentsCompletedCommand = vscode.commands.registerCommand('coolplay.filterCommentsCompleted', () => {
        completedCommentsProvider.showFilterOptions();
    });

    const toggleRuleCommand = vscode.commands.registerCommand('coolplay.toggleRule', (ruleItem) => {
        rulesProvider.toggleRule(ruleItem);
    });

    const editRuleCommand = vscode.commands.registerCommand('coolplay.editRule', (ruleItem) => {
        rulesProvider.editRule(ruleItem);
    });

    const deleteRuleCommand = vscode.commands.registerCommand('coolplay.deleteRule', async (ruleItem) => {
        const result = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the "${ruleItem.ruleName}" rule?`,
            { modal: true },
            'Yes', 'No'
        );
        
        if (result === 'Yes') {
            rulesProvider.removeRule(ruleItem);
        }
    });

    const sortRulesCommand = vscode.commands.registerCommand('coolplay.sortRules', () => {
        rulesProvider.sortRules();
    });

    const setCompletedCommand = vscode.commands.registerCommand('coolplay.setCompleted', (commentItem) => {
        pendingCommentsProvider.toggleComment(commentItem);
        // Refresh both views after toggle
        setTimeout(() => {
            pendingCommentsProvider.refresh();
            completedCommentsProvider.refresh();
        }, 200);
    });

    const returnBackCommand = vscode.commands.registerCommand('coolplay.returnBack', (commentItem) => {
        completedCommentsProvider.toggleComment(commentItem);
        // Refresh both views after toggle
        setTimeout(() => {
            pendingCommentsProvider.refresh();
            completedCommentsProvider.refresh();
        }, 200);
    });
    
    // Remove the entire toggleCommentCommand as it's no longer needed
    
    // Register filter command
    context.subscriptions.push(
        vscode.commands.registerCommand('coolplay.filterRules', async () => {
            const options = [
                { label: 'All Rules', value: 'all' },
                { label: 'Global Rules Only', value: 'global' },
                { label: 'Local Rules Only', value: 'local' }
            ];
            
            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Select filter type'
            });
            
            if (selected) {
                rulesProvider.filterRules(selected.value as 'all' | 'global' | 'local');
            }
        })
    );

    context.subscriptions.push(
        refreshStatusCommand,
        addRuleCommand,
        refreshCommentsPendingCommand,
        refreshCommentsCompletedCommand,
        filterCommentsPendingCommand,
        filterCommentsCompletedCommand,
        toggleRuleCommand,
        editRuleCommand,
        deleteRuleCommand,
        sortRulesCommand,
        setCompletedCommand,
        returnBackCommand
    );
    
    // Add this command in the activate function
    const setFileStatusDraftCommand = vscode.commands.registerCommand('coolplay.setFileStatusDraft', (statusItem) => {
        if (statusItem && statusItem.filePath) {
            statusProvider.setFileStatus(statusItem.filePath, 'DRAFT');
        }
    });
    
    const setFileStatusOngoingCommand = vscode.commands.registerCommand('coolplay.setFileStatusOngoing', (statusItem) => {
        if (statusItem && statusItem.filePath) {
            statusProvider.setFileStatus(statusItem.filePath, 'ONGOING');
        }
    });
    
    const setFileStatusDoneCommand = vscode.commands.registerCommand('coolplay.setFileStatusDone', (statusItem) => {
        if (statusItem && statusItem.filePath) {
            statusProvider.setFileStatus(statusItem.filePath, 'DONE');
        }
    });
    
    const toggleFileStatusCommand = vscode.commands.registerCommand('coolplay.toggleFileStatus', (statusItem) => {
        if (statusItem && statusItem.filePath) {
            statusProvider.toggleFileStatus(statusItem.filePath);
        }
    });
}

export function deactivate() {
    console.log('CoolPlay extension is now deactivated!');
}