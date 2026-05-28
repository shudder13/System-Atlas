#!/usr/bin/env node
// SessionStart hook: inject a compact summary of the architecture/ pack into
// the new session's context, so AI agents start from the atlas without having
// to ask the architect or re-discover the codebase.
//
// Outputs nothing (exit 0) when no pack is present — agents fall back to
// reading SKILL.md and source code as usual.

import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const packRoot = path.join(repoRoot, "architecture");

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function readFirstLines(filePath, maxLines = 40) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    return lines.slice(0, maxLines).join("\n");
  } catch { return ""; }
}

async function readJson(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")); } catch { return null; }
}

if (!(await exists(packRoot))) {
  process.exit(0);
}

const manifestPath = path.join(packRoot, "manifest.yaml");
const overviewPath = path.join(packRoot, "generated", "overview.md");
const generatedMeta = await readJson(path.join(packRoot, "generated", "metadata.json"));
const evidenceMeta = await readJson(path.join(packRoot, "evidence", "metadata.json"));

const sections = [];
sections.push("=== System Atlas — pack auto-loaded on session start ===");
sections.push("");

if (await exists(manifestPath)) {
  const manifestPreview = await readFirstLines(manifestPath, 6);
  sections.push("architecture/manifest.yaml (first 6 lines):");
  sections.push("```yaml");
  sections.push(manifestPreview);
  sections.push("```");
  sections.push("");
}

if (await exists(overviewPath)) {
  const overview = await readFirstLines(overviewPath, 60);
  sections.push("architecture/generated/overview.md (truncated):");
  sections.push(overview);
  sections.push("");
}

if (generatedMeta || evidenceMeta) {
  sections.push("Pack metadata:");
  if (generatedMeta) sections.push(`- generated: exportId=${generatedMeta.exportId ?? "?"} sourceRevision=${(generatedMeta.architectureSourceRevision ?? "?").slice(0, 12)} generatedAt=${generatedMeta.generatedAt ?? "?"}`);
  if (evidenceMeta) sections.push(`- evidence:  exportId=${evidenceMeta.exportId ?? "?"} sourceRevision=${(evidenceMeta.architectureSourceRevision ?? "?").slice(0, 12)} generatedAt=${evidenceMeta.generatedAt ?? "?"}`);
  if (generatedMeta && evidenceMeta && generatedMeta.exportId !== evidenceMeta.exportId) {
    sections.push("- WARNING: generated and evidence metadata disagree on exportId. Run /api/export or click Export in the UI to realign.");
  }
  sections.push("");
}

sections.push("Read .claude/skills/system-atlas/SKILL.md for the full atlas protocol.");
sections.push("Read architecture/generated/atlas.json for the full graph snapshot when you need detail.");
sections.push("=== End atlas summary ===");

process.stdout.write(sections.join("\n") + "\n");
