# claude-sap-win-lsps

Windows-compatible LSP server plugins for Claude Code.

## The problem

Claude Code on Windows cannot spawn npm-installed binaries because npm creates `.cmd` wrapper scripts, and Claude Code's `child_process.spawn()` is called without `shell: true`. This means any LSP server installed via `npm install -g` fails silently with `ENOENT`.

This affects `typescript-language-server`, `@sap/cds-lsp`, and every other Node-based LSP tool on Windows. Native binaries (gopls, rust-analyzer, clangd) are not affected.

Tracked across multiple issues: [#19658](https://github.com/anthropics/claude-code/issues/19658), [#27061](https://github.com/anthropics/claude-code/issues/27061), [#32264](https://github.com/anthropics/claude-code/issues/32264), [#43469](https://github.com/anthropics/claude-code/issues/43469).

## The fix

Each plugin bundles its LSP server as a local npm dependency and launches it via `node` + `${CLAUDE_PLUGIN_ROOT}` -- a variable that Claude Code substitutes with the plugin's install path. No hardcoded paths, no `.cmd` shims, works on any Windows machine.

## Plugins

| Plugin | Language Server | Languages |
|--------|----------------|-----------|
| `typescript-lsp` | [typescript-language-server](https://github.com/typescript-language-server/typescript-language-server) | TypeScript, JavaScript, TSX, JSX |
| `cds-lsp` | [@sap/cds-lsp](https://www.npmjs.com/package/@sap/cds-lsp) | SAP CDS (CAP) |

## Installation

### 1. Add the marketplace

```
/plugin marketplace add abeshbh/claude-sap-win-lsps
```

### 2. Install plugins

```
/plugin install typescript-lsp@claude-sap-win-lsps
/plugin install cds-lsp@claude-sap-win-lsps
```

### 3. Install npm dependencies

After installing, run `npm install` inside each plugin's cache directory:

```powershell
# Find the plugin cache location
$cache = "$env:USERPROFILE\.claude\plugins\cache\claude-sap-win-lsps"

# Install TypeScript LSP dependencies
cd "$cache\typescript-lsp\*"
npm install

# Install CDS LSP dependencies
cd "$cache\cds-lsp\*"
npm install
```

### 4. Reload plugins

```
/reload-plugins
```

### 5. Disable conflicting plugins (if installed)

If you previously installed the official TypeScript LSP plugin, disable it:

```
/plugin disable typescript-lsp@claude-plugins-official
```

## How it works

The `.lsp.json` in each plugin uses `node` as the command and `${CLAUDE_PLUGIN_ROOT}` to reference the bundled entry point:

```json
{
  "typescript": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/node_modules/typescript-language-server/lib/cli.mjs", "--stdio"],
    "cwd": "${CLAUDE_PLUGIN_ROOT}",
    "extensionToLanguage": {
      ".ts": "typescript",
      ".js": "javascript"
    }
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` is substituted by Claude Code at runtime with the plugin's absolute install path. Since `node.exe` is a real binary (not a `.cmd` shim), `spawn()` finds it without issues.

## Requirements

- Windows 10/11
- Node.js 18+ (must be in PATH)
- Claude Code 2.1.50+

## Contributing

To add a new Node-based LSP server:

1. Create `plugins/<name>/` with `.claude-plugin/plugin.json`, `.lsp.json`, and `package.json`
2. Add the plugin entry to `.claude-plugin/marketplace.json`
3. Test on Windows with a fresh install

## License

MIT
