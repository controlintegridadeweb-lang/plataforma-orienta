import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = ["src", "docs", "README.md"];
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "coverage", "dist", "build"]);
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".sql", ".yml", ".yaml"]);

const FORBIDDEN_PATTERNS = [
  { name: "yes_no_partial", regex: /\byes_no_partial\b/g },
  { name: "partially_valid", regex: /\bpartially_valid\b/g },
  { name: "implementacao_parcial", regex: /\bimplementacao_parcial\b/g },
  { name: "parcialmente", regex: /\bparcialmente\b/gi },
  { name: "analyst", regex: /\banalyst\b/gi },
  { name: "analista", regex: /\banalista\b/gi },
];

function normalizeForPrint(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

async function collectFiles(entryPath, results) {
  const entryStat = await stat(entryPath);
  if (entryStat.isDirectory()) {
    const base = path.basename(entryPath);
    if (IGNORE_DIRS.has(base)) return;
    const entries = await readdir(entryPath);
    for (const entry of entries) {
      await collectFiles(path.join(entryPath, entry), results);
    }
    return;
  }

  const ext = path.extname(entryPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return;
  results.push(entryPath);
}

function findMatches(content) {
  const matches = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.regex.test(line)) {
        matches.push({ lineNumber: i + 1, pattern: pattern.name, line });
      }
      pattern.regex.lastIndex = 0;
    }
  }
  return matches;
}

async function main() {
  const files = [];
  for (const target of TARGETS) {
    const absolute = path.join(ROOT, target);
    try {
      await collectFiles(absolute, files);
    } catch {
      // Ignore missing targets to keep script resilient.
    }
  }

  const findings = [];
  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    const matches = findMatches(content);
    if (matches.length > 0) {
      findings.push({ filePath, matches });
    }
  }

  if (findings.length === 0) {
    console.log("V2 terminology check passed: no legacy terms found.");
    return;
  }

  console.error("V2 terminology check failed. Legacy terms found:");
  for (const finding of findings) {
    console.error(`\n- ${normalizeForPrint(finding.filePath)}`);
    for (const match of finding.matches) {
      console.error(`  L${match.lineNumber} [${match.pattern}] ${match.line.trim()}`);
    }
  }
  process.exit(1);
}

await main();
