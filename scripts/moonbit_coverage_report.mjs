#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  const [covTxtPath, srcDir, outJson, outMd] = process.argv.slice(2);
  if (!covTxtPath || !srcDir || !outJson || !outMd) {
    console.error('Usage: node scripts/moonbit_coverage_report.mjs <covTxtPath> <srcDir> <outJson> <outMd>');
    process.exit(0); // do not fail CI step; workflow uses `|| true`
  }

  const safePct = (covered, total) => {
    if (!total || total === 0) return 0;
    return (covered / total) * 100;
  };

  let covered = 0, total = 0;
  try {
    const txt = await fs.readFile(covTxtPath, 'utf8');
    // Try to find a line like: "Total: 123/456"
    const m = txt.match(/Total:\s*(\d+)\/(\d+)/);
    if (m) {
      covered = parseInt(m[1], 10);
      total = parseInt(m[2], 10);
    }
  } catch (e) {
    // ignore, will generate 0 summary
  }

  // Attempt to enumerate source files for completeness (best-effort)
  async function listFiles(dir) {
    const acc = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          acc.push(...await listFiles(p));
        } else {
          // Heuristic: include common MoonBit source extensions if any; fallback to all files
          if (/\.(mbt|moon|mb)$/.test(ent.name) || dir.includes(path.sep + 'src' + path.sep)) {
            acc.push(p);
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return acc;
  }

  const files = await listFiles(srcDir);

  const summary = {
    generatedAt: new Date().toISOString(),
    totals: { covered, total, percent: Number(safePct(covered, total).toFixed(2)) },
    // Per-file data not available from summary text alone; include discovered file list for completeness
    files: files.map(f => ({ file: path.relative(process.cwd(), f), covered: null, total: null, percent: null }))
  };

  const mdLines = [];
  mdLines.push('# MoonBit Coverage Summary');
  mdLines.push('');
  mdLines.push(`Overall: ${covered}/${total} (${safePct(covered, total).toFixed(2)}%)`);
  mdLines.push('');
  if (files.length) {
    mdLines.push('## Files (no per-file metrics available from summary)');
    mdLines.push('');
    mdLines.push('| File | Covered | Total | Percent |');
    mdLines.push('|---|---:|---:|---:|');
    for (const f of files) {
      mdLines.push(`| ${path.relative(process.cwd(), f)} | - | - | - |`);
    }
  }

  await fs.mkdir(path.dirname(outJson), { recursive: true }).catch(() => {});
  await fs.mkdir(path.dirname(outMd), { recursive: true }).catch(() => {});

  await fs.writeFile(outJson, JSON.stringify(summary, null, 2), 'utf8');
  await fs.writeFile(outMd, mdLines.join('\n') + '\n', 'utf8');
}

main().catch(() => process.exit(0)); // never fail CI
