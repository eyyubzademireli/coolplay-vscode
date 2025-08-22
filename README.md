# CoolPlay - Track Your Files' Progress

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.74.0+-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

CoolPlay is a comprehensive VS Code extension that enhances your development workflow with intelligent file status management, customizable coding rules, and advanced comment tracking.

## ✨ Features

### 📊 Status Management

- **File Status Tracking**: Mark files as DRAFT, ONGOING, or DONE
- **Visual Indicators**: Color-coded badges in the file explorer
- **Status Persistence**: Automatically saves status across sessions

### 📋 Rules System

- **Global Rules**: Create rules that apply to all files in your workspace
- **Local Rules**: File-specific rules for targeted guidance
- **Persistent Storage**: Rules are saved in `.coolplay` directory

### 💬 Comment Management

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

- **Set Status**: Right-click any file in explorer → CoolPlay → Set Status
- **Toggle Status**: Use the status panel or keyboard shortcuts
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

CoolPlay creates a `.coolplay` directory in your workspace root. Don't delete this directory.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**CPcode**

- GitHub: [https://github.com/CPcode]
- Email: [your-email@example.com]

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/CPcode/coolplay-vscode/issues).
