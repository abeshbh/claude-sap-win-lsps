# claude-sap-win-lsps

Windows-compatible LSP server plugins for Claude Code.

## The problem

Claude Code on Windows cannot spawn npm-installed binaries because npm creates `.cmd` wrapper scripts, and Claude Code's `child_process.spawn()` is called without `shell: true`. This means any LSP server installed via `npm install -g` fails silently with `ENOENT`.

This affects `typescript-language-server`, `@sap/cds-lsp`, and every other Node-based LSP tool on Windows. Native binaries (gopls, rust-analyzer, clangd) are not affected.

Tracked across multiple issues: [#19658](https://github.com/anthropics/claude-code/issues/19658), [#27061](https://github.com/anthropics/claude-code/issues/27061), [#32264](https://github.com/anthropics/claude-code/issues/32264), [#43469](https://github.com/anthropics/claude-code/issues/43469).

## The fix

Each plugin:
1. Bundles a `package.json` with the LSP server as a dependency
2. Uses a `SessionStart` hook to auto-install dependencies into `${CLAUDE_PLUGIN_DATA}` (a persistent directory that survives plugin updates)
3. Launches the LSP via `node` + `${CLAUDE_PLUGIN_DATA}/node_modules/...` -- bypassing `.cmd` shims entirely

No hardcoded paths. No manual `npm install`. No global installs. Works on any Windows machine with Node.js.

## Plugins

| Plugin | Language Server | Languages |
|--------|----------------|-----------|
| `typescript-lsp` | [typescript-language-server](https://github.com/typescript-language-server/typescript-language-server) | TypeScript, JavaScript, TSX, JSX |
| `cds-lsp` | [@sap/cds-lsp](https://www.npmjs.com/package/@sap/cds-lsp) | SAP CDS (CAP) |

## Installation

```
/plugin marketplace add abeshbh/claude-sap-win-lsps
/plugin install typescript-lsp@claude-sap-win-lsps
/plugin install cds-lsp@claude-sap-win-lsps
/reload-plugins
```

Dependencies are installed automatically on the first session start. The first launch may take 30-60 seconds while npm installs packages.

## Disable conflicting plugins

If you previously installed the official TypeScript LSP plugin, disable it:

```
/plugin disable typescript-lsp@claude-plugins-official
```

## How it works

Each plugin has three key files:

**`package.json`** -- declares the LSP server as a dependency:
```json
{
  "dependencies": {
    "typescript-language-server": "^5.1.0",
    "typescript": "^5.7.0"
  }
}
```

**`.lsp.json`** -- configures Claude Code to launch via `node`:
```json
{
  "typescript": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_DATA}/node_modules/typescript-language-server/lib/cli.mjs", "--stdio"],
    "extensionToLanguage": { ".ts": "typescript", ".js": "javascript" }
  }
}
```

**`plugin.json`** -- includes a `SessionStart` hook that auto-installs deps:
```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "diff package.json ... || npm install",
        "timeout": 60,
        "async": true
      }]
    }]
  }
}
```

`${CLAUDE_PLUGIN_DATA}` is a persistent directory managed by Claude Code that survives plugin updates. Dependencies are installed there once and only reinstalled when `package.json` changes.

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
