#!/usr/bin/env node
// collect.ts — claudex CLI: login / sync / watch / status / enable / disable
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
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
    console.log("Not configured. Run: claudex login <token> --server <url>");
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

// ---- run-at-login registration (best-effort; never crashes login) ----
async function getLauncher() {
  const AutoLaunch = (await import("auto-launch")).default as any;
  return new AutoLaunch({
    name: "claudex",
    path: process.execPath,           // the node binary
    args: [process.argv[1], "watch"], // run this script in watch mode at login
  });
}
async function enableAutostart() {
  try {
    const launcher = await getLauncher();
    if (!(await launcher.isEnabled())) await launcher.enable();
    console.log("Auto-start enabled — claudex will watch on every login.");
  } catch (e: any) {
    console.log(`(Auto-start not set: ${e.message}. Run 'claudex watch' manually if needed.)`);
  }
}
async function disableAutostart() {
  try {
    const launcher = await getLauncher();
    await launcher.disable();
    console.log("Auto-start disabled.");
  } catch (e: any) {
    console.log(`(Could not disable auto-start: ${e.message})`);
  }
}

const program = new Command();
program.name("claudex").description("Claude Code usage tracker").version("0.1.0");

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