# CoolPlay - Track Your Files' Progress

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.74.0+-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

<a href="https://www.buymeacoffee.com/coolplay" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

CoolPlay is a comprehensive VS Code extension that enhances your development workflow with intelligent file status management, customizable coding rules, and advanced comment tracking.

## ✨ Features

### 📊 Status Management

![Status Management Demo](https://raw.githubusercontent.com/eyyubzademireli/cp/Status.gif)

- **File Status Tracking**: Mark files as DRAFT, ONGOING, or DONE
- **Visual Indicators**: Color-coded badges in the file explorer
- **Status Persistence**: Automatically saves status across sessions

### 📋 Rules System

![Rules Management Demo](https://raw.githubusercontent.com/eyyubzademireli/cp/Rules.gif)

- **Global Rules**: Create rules that apply to all files in your workspace
- **Local Rules**: File-specific rules for targeted guidance
- **Persistent Storage**: Rules are saved in `.coolplay` directory

### 💬 Comment Management

![Comments Management Demo](https://raw.githubusercontent.com/eyyubzademireli/cp/Comment.gif)

- **Smart Detection**: Automatically finds TODO, REVIEW, NOTE, HACK, FIXME, BUG, OPTIMIZE and WARNING comments
- **Real-time Updates**: Monitors file changes and updates comment list
- **Status Tracking**: Mark comments as completed or pending
- **Quick Navigation**: Click to jump directly to comment location

## 📖 Usage

### Getting Started

1. Look for the ⚡ (lightning) icon in the Activity Bar
2. Click to open the CoolPlay panel
3. You'll see three sections: Status, Rules, and Comments

### Status Management

- **Set Status**: Open CoolPlay panel and click the "Toggle File Status" icon button to change file status
- **View Status**: File badges show current status (D=Draft, O=Ongoing, ✓=Done)

### Rules Management

- **Add Global Rule**: Click "+" in Rules section → Add Global Rule
- **Add Local Rule**: Click "+" in Rules section → Add Local Rule
- **Edit Rules**: Right-click any rule → Edit
- **Filter Rules**: Use filter buttons to show All/Global/Local rules
- **Sort Rules**: Sort by completion status

### Comment Tracking

- **Auto-Detection**: Comments are automatically detected when you open files
- **Mark Complete**: Click the checkbox next to any comment
- **Navigate**: Click comment text to jump to its location
- **Filter**: Switch between Pending and Completed views

### File Status Colors

- **DRAFT**: Blue badge (D)
- **ONGOING**: Yellow badge (O)
- **DONE**: Green badge (✓)

### Supported Comment Types

- `TODO`: Tasks to be completed
- `REVIEW`: Needs review
- `NOTE`: Important notes
- `HACK`: Temporary workarounds
- `FIXME`: Issues that need fixing
- `BUG`: Known bugs
- `OPTIMIZE`: Performance improvements needed
- `WARNING`: Critical issues

## 📁 File Structure

CoolPlay creates a `.coolplay` directory in your workspace root. Don't delete this directory. Don't add this directory to gitignore.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
