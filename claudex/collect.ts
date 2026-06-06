import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import chokidar from "chokidar";
import { Command } from "commander";

const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

function getDataDir(): string {
  const home = os.homedir();
  let base: string;
  if (process.platform === "win32")
    base = process.env.APPDATA || path.join(home, "AppData", "Roaming");
  else if (process.platform === "darwin")
    base = path.join(home, "Library", "Application Support");
  else base = process.env.XDG_DATA_HOME || path.join(home, ".local", "share");
  const dir = path.join(base, "claudex");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
const STATE_FILE = path.join(getDataDir(), "state.json");
const CONFIG_FILE = path.join(getDataDir(), "config.json");

type Bucket = {
  date: string; hour: number; model: string; project: string;
  inTokens: number; outTokens: number; cacheCreate: number; cacheRead: number;
  messages: number; sessions: string[];
};
type State = {
  version: number;
  files: Record<string, { offset: number }>;
  seenUuids: string[];
  buckets: Record<string, Bucket>;
};
type Config = { token?: string; serverUrl?: string; lastSyncAt?: number };
type Summary = { files: number; newLines: number; buckets: number; totalIn: number; totalOut: number; uuids: number };

function loadState(): State {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); }
  catch { return { version: 1, files: {}, seenUuids: [], buckets: {} }; }
}
function saveState(s: State) { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); }
function loadConfig(): Config {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch { return {}; }
}
function saveConfig(c: Config) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2)); }

function findJsonlFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findJsonlFiles(full));
    else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

function runScan(): Summary {
  const state = loadState();
  const seen = new Set(state.seenUuids);
  const buckets = new Map<string, Bucket>(Object.entries(state.buckets));
  let newLines = 0;

  function fold(entry: any) {
    const usage = entry?.message?.usage;
    if (entry?.type !== "assistant" || !usage) return;
    const model = entry.message?.model ?? "unknown";
    if (model === "<synthetic>") return;
    if (entry.uuid && seen.has(entry.uuid)) return;
    if (entry.uuid) seen.add(entry.uuid);
    const ts = new Date(entry.timestamp ?? Date.now());
    const pad = (n: number) => String(n).padStart(2, "0");
    const date = `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}`;
    const hour = ts.getHours();
    const project = entry.cwd ? path.basename(entry.cwd) : "unknown";
    const sessionId = entry.sessionId ?? "unknown";
    const key = `${date}|${hour}|${model}|${project}`;
    let b = buckets.get(key);
    if (!b) {
      b = { date, hour, model, project, inTokens: 0, outTokens: 0, cacheCreate: 0, cacheRead: 0, messages: 0, sessions: [] };
      buckets.set(key, b);
    }
    b.inTokens += usage.input_tokens ?? 0;
    b.outTokens += usage.output_tokens ?? 0;
    b.cacheCreate += usage.cache_creation_input_tokens ?? 0;
    b.cacheRead += usage.cache_read_input_tokens ?? 0;
    b.messages += 1;
    if (!b.sessions.includes(sessionId)) b.sessions.push(sessionId);
    newLines++;
  }

  function scanFile(file: string) {
    let fd: number;
    try { fd = fs.openSync(file, "r"); } catch { return; }
    try {
      const size = fs.fstatSync(fd).size;
      let start = state.files[file]?.offset ?? 0;
      if (start > size) start = 0;
      const length = size - start;
      if (length <= 0) return;
      const buf = Buffer.alloc(length);
      fs.readSync(fd, buf, 0, length, start);
      const lastNl = buf.lastIndexOf(0x0a);
      if (lastNl === -1) return;
      const consumable = buf.subarray(0, lastNl + 1);
      for (const line of consumable.toString("utf8").split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try { fold(JSON.parse(t)); } catch { /* skip malformed */ }
      }
      state.files[file] = { offset: start + consumable.length };
    } finally { fs.closeSync(fd); }
  }

  const files = findJsonlFiles(PROJECTS_DIR);
  for (const f of files) scanFile(f);
  state.seenUuids = [...seen];
  state.buckets = Object.fromEntries(buckets);
  saveState(state);

  let totalIn = 0, totalOut = 0;
  for (const b of buckets.values()) { totalIn += b.inTokens; totalOut += b.outTokens; }
  return { files: files.length, newLines, buckets: buckets.size, totalIn, totalOut, uuids: seen.size };
}

function printSummary(s: Summary, reason = "") {
  const tag = reason ? `${reason} → ` : "";
  console.log(`${tag}files:${s.files} | new lines:${s.newLines} | buckets:${s.buckets} | total in:${s.totalIn} out:${s.totalOut} | uuids:${s.uuids}`);
}
function printBuckets() {
  const s = loadState();
  const rows = Object.values(s.buckets).sort((a, b) =>
    `${a.date} ${String(a.hour).padStart(2, "0")}`.localeCompare(`${b.date} ${String(b.hour).padStart(2, "0")}`));
  for (const b of rows)
    console.log(`${b.date} ${String(b.hour).padStart(2, "0")}h | ${b.model} | ${b.project} | in:${b.inTokens} out:${b.outTokens} cacheR:${b.cacheRead} msgs:${b.messages} sessions:${b.sessions.length}`);
}

async function syncToServer(force = false) {
  const cfg = loadConfig();
  if (!cfg.token || !cfg.serverUrl) {
    console.log("Not configured. Run: claudiom login <token> --server <url>");
    return;
  }
  if (!force && cfg.lastSyncAt && Date.now() - cfg.lastSyncAt < 60_000) {
    console.log("Skipped (synced <60s ago; use --force to override).");
    return;
  }
  const state = loadState();
  const buckets = Object.values(state.buckets).map((b) => ({
    date: b.date, hour: b.hour, model: b.model, project: b.project,
    inTokens: b.inTokens, outTokens: b.outTokens,
    cacheCreate: b.cacheCreate, cacheRead: b.cacheRead,
    messages: b.messages, sessions: b.sessions.length,
  }));
  try {
    const res = await fetch(cfg.serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.token}` },
      body: JSON.stringify({ client: "claudex", v: 1, buckets }),
    });
    console.log(`Sync → ${res.status} ${res.statusText} (${buckets.length} buckets sent)`);
    if (res.ok) { cfg.lastSyncAt = Date.now(); saveConfig(cfg); }
  } catch (e: any) {
    console.log(`Sync failed: ${e.message}`);
  }
}

function startWatch() {
  printSummary(runScan(), "startup catch-up");
  void syncToServer();
  const watcher = chokidar.watch(PROJECTS_DIR, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 5000, pollInterval: 300 },
  });
  const onActivity = async () => {
    printSummary(runScan(), `[${new Date().toLocaleTimeString()}] activity`);
    await syncToServer();
  };
  watcher.on("add", onActivity);
  watcher.on("change", onActivity);
  setInterval(async () => { runScan(); await syncToServer(true); }, 60 * 60 * 1000);
  console.log(`Watching ${PROJECTS_DIR} — Ctrl+C to stop.`);
}

const LAUNCH_LABEL = "com.claudex.watch";

function winVbsPath(): string {
  return path.join(getDataDir(), "claudex-watch.vbs");
}
function winLegacyStartupVbsPath(): string {
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const dir = path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
  return path.join(dir, "claudex-watch.vbs");
}
function macPlistPath(): string {
  return path.join(os.homedir(), "Library", "LaunchAgents", `${LAUNCH_LABEL}.plist`);
}

function resolveTarget(): { node: string; script: string } | null {
  const node = process.execPath;
  const script = process.argv[1] ? path.resolve(process.argv[1]) : "";
  if (!script || script.endsWith(".ts")) return null;
  return { node, script };
}

const xmlEsc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function enableAutostart() {
  const target = resolveTarget();
  if (!target) {
    console.log(
      "Auto-start needs the built binary. Run: npm run build && npm link, " +
      "then `claudiom login <token> --server <url>` (not `npx tsx`)."
    );
    return;
  }
  const { node, script } = target;
  try {
    if (process.platform === "win32") {
      const vbs = winVbsPath();
      const nodeQ = node.replace(/"/g, '""');
      const scriptQ = script.replace(/"/g, '""');
      const content =
        `Set s = CreateObject("WScript.Shell")\r\n` +
        `s.Run Chr(34) & "${nodeQ}" & Chr(34) & " " & Chr(34) & "${scriptQ}" & Chr(34) & " watch", 0, False\r\n`;
      fs.writeFileSync(vbs, content);
      try { const old = winLegacyStartupVbsPath(); if (fs.existsSync(old)) fs.unlinkSync(old); } catch { /* ignore */ }
      const ps1 = path.join(getDataDir(), "register-autostart.ps1");
      const vbsLit = vbs.replace(/'/g, "''");
      const regScript =
        `$ErrorActionPreference = 'Stop'\r\n` +
        `$vbs = '${vbsLit}'\r\n` +
        `$cmd = 'wscript.exe "' + $vbs + '"'\r\n` +
        `$run = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'\r\n` +
        `New-ItemProperty -Path $run -Name 'claudex-watch' -Value $cmd -PropertyType String -Force | Out-Null\r\n`;
      fs.writeFileSync(ps1, regScript);
      execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      console.log("Auto-start enabled (Windows Run key: claudex-watch).");
    } else if (process.platform === "darwin") {
      const plist = macPlistPath();
      fs.mkdirSync(path.dirname(plist), { recursive: true });
      const logDir = getDataDir();
      const outLog = path.join(logDir, "watch.out.log");
      const errLog = path.join(logDir, "watch.err.log");
      const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LAUNCH_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEsc(node)}</string>
    <string>${xmlEsc(script)}</string>
    <string>watch</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xmlEsc(outLog)}</string>
  <key>StandardErrorPath</key><string>${xmlEsc(errLog)}</string>
</dict>
</plist>
`;
      fs.writeFileSync(plist, xml);
      try { execFileSync("launchctl", ["unload", plist], { stdio: "ignore" }); } catch { }
      execFileSync("launchctl", ["load", "-w", plist], { stdio: "ignore" });
      console.log(`Auto-start enabled (macOS LaunchAgent): ${plist}`);
    } else {
      const AutoLaunch = (await import("auto-launch")).default as any;
      const launcher = new AutoLaunch({ name: "claudex", path: node, args: [script, "watch"] });
      if (!(await launcher.isEnabled())) await launcher.enable();
      console.log("Auto-start enabled (auto-launch).");
    }
  } catch (e: any) {
    const detail = (e && e.stderr && String(e.stderr).trim()) || (e && e.message) || String(e);
    console.log(`(Auto-start not set: ${detail}. Run 'claudex watch' manually if needed.)`);
  }
}

async function disableAutostart() {
  try {
    if (process.platform === "win32") {
      try {
        execFileSync("powershell.exe",
          ["-NoProfile", "-Command",
           "Remove-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'claudex-watch' -ErrorAction SilentlyContinue"],
          { stdio: "ignore" });
      } catch {  }
      const vbs = winVbsPath();
      if (fs.existsSync(vbs)) fs.unlinkSync(vbs);
      try { const old = winLegacyStartupVbsPath(); if (fs.existsSync(old)) fs.unlinkSync(old); } catch { /* ignore */ }
      console.log("Auto-start disabled.");
    } else if (process.platform === "darwin") {
      const plist = macPlistPath();
      try { execFileSync("launchctl", ["unload", "-w", plist], { stdio: "ignore" }); } catch { /* not loaded */ }
      if (fs.existsSync(plist)) fs.unlinkSync(plist);
      console.log("Auto-start disabled.");
    } else {
      const AutoLaunch = (await import("auto-launch")).default as any;
      const launcher = new AutoLaunch({ name: "claudex", path: process.execPath, args: [process.argv[1], "watch"] });
      await launcher.disable();
      console.log("Auto-start disabled.");
    }
  } catch (e: any) {
    console.log(`(Could not disable auto-start: ${e.message})`);
  }
}

const program = new Command();
program.name("claudiom").description("Claude Code usage tracker").version("0.1.0");

program.command("login").argument("<token>").option("--server <url>", "ingest endpoint URL")
  .action(async (token: string, opts: { server?: string }) => {
    const cfg = loadConfig();
    cfg.token = token;
    if (opts.server) cfg.serverUrl = opts.server;
    saveConfig(cfg);
    console.log(`Saved. token: set | server: ${cfg.serverUrl ?? "(none — pass --server)"}`);
    await enableAutostart();
    runScan();
    await syncToServer(true);
  });

program.command("status").action(() => {
  const cfg = loadConfig();
  const s = runScan();
  console.log(`token: ${cfg.token ? "set" : "NOT set"} | server: ${cfg.serverUrl ?? "none"} | lastSync: ${cfg.lastSyncAt ? new Date(cfg.lastSyncAt).toLocaleString() : "never"}`);
  printSummary(s);
});

program.command("sync").option("--force", "ignore the 60s throttle")
  .action(async (opts: { force?: boolean }) => { runScan(); await syncToServer(!!opts.force); });

program.command("watch").action(() => startWatch());
program.command("enable").description("run claudex at every login").action(enableAutostart);
program.command("disable").description("stop running at login").action(disableAutostart);

program.action(() => { runScan(); printBuckets(); });

program.parseAsync();