#!/usr/bin/env node

/**
 * Setup script for claude-sap-win-lsps plugins.
 * Installs npm dependencies into each plugin's CLAUDE_PLUGIN_DATA directory.
 *
 * Usage (from Claude Code prompt):
 *   ! node ~/.claude/plugins/marketplaces/claude-sap-win-lsps/setup.js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const home = process.env.HOME || process.env.USERPROFILE;
const claudeDir = path.join(home, ".claude", "plugins");
const cacheDir = path.join(claudeDir, "cache", "claude-sap-win-lsps");
const dataDir = path.join(claudeDir, "data");

const marketplace = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, ".claude-plugin", "marketplace.json"),
    "utf8"
  )
);

let installed = 0;
let failed = 0;

for (const plugin of marketplace.plugins) {
  const pluginName = plugin.name;
  const pluginDataDir = path.join(dataDir, `${pluginName}-claude-sap-win-lsps`);

  // Find the cached plugin version directory
  const pluginCacheDir = path.join(cacheDir, pluginName);
  if (!fs.existsSync(pluginCacheDir)) {
    console.log(`[SKIP] ${pluginName} -- not installed (run /plugin install ${pluginName}@claude-sap-win-lsps first)`);
    failed++;
    continue;
  }

  const versions = fs.readdirSync(pluginCacheDir).filter((f) =>
    fs.statSync(path.join(pluginCacheDir, f)).isDirectory()
  );
  if (versions.length === 0) {
    console.log(`[SKIP] ${pluginName} -- no version found in cache`);
    failed++;
    continue;
  }

  const versionDir = path.join(pluginCacheDir, versions[versions.length - 1]);
  const srcPackageJson = path.join(versionDir, "package.json");

  if (!fs.existsSync(srcPackageJson)) {
    console.log(`[SKIP] ${pluginName} -- no package.json in ${versionDir}`);
    failed++;
    continue;
  }

  // Ensure data directory exists
  fs.mkdirSync(pluginDataDir, { recursive: true });

  // Copy package.json to data dir
  fs.copyFileSync(srcPackageJson, path.join(pluginDataDir, "package.json"));

  // Run npm install
  console.log(`[INSTALL] ${pluginName} -- installing dependencies...`);
  try {
    execSync("npm install --silent", {
      cwd: pluginDataDir,
      stdio: "inherit",
      timeout: 120000,
    });
    console.log(`[OK] ${pluginName} -- done`);
    installed++;
  } catch (e) {
    console.error(`[FAIL] ${pluginName} -- npm install failed: ${e.message}`);
    // Clean up so SessionStart hook retries next session
    try { fs.unlinkSync(path.join(pluginDataDir, "package.json")); } catch {}
    failed++;
  }
}

console.log(`\nSetup complete: ${installed} installed, ${failed} failed.`);
if (installed > 0) {
  console.log("Restart Claude Code for LSP servers to activate.");
}
