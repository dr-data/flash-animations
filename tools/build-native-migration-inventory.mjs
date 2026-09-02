import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const sourceRoots = ["flashdev2", "codebase"];
const outputJson = path.join(repoRoot, "native", "migration-inventory.json");
const outputMarkdown = path.join(repoRoot, "native", "migration-inventory.md");

const interestingExtensions = new Set([
  ".fla",
  ".swf",
  ".as",
  ".html",
  ".htm",
  ".xml",
  ".json",
  ".css",
  ".js",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".mp3",
  ".wav",
  ".flv"
]);

async function walk(absoluteDirectory, relativeDirectory, files) {
  let entries;
  try {
    entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(absoluteDirectory, entry.name);
    const relativePath = path.posix.join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      await walk(absolutePath, relativePath, files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!interestingExtensions.has(extension)) {
      continue;
    }

    const stats = await fs.stat(absolutePath);
    files.push({
      path: relativePath,
      extension,
      size: stats.size
    });
  }
}

function projectKey(filePath) {
  const parts = filePath.split("/");
  if (parts[0] === "flashdev2" && parts.length > 1) {
    return `flashdev2/${parts[1]}`;
  }

  if (parts[0] === "codebase") {
    const flaIndex = parts.lastIndexOf("fla");
    if (flaIndex > 0) {
      return parts.slice(0, flaIndex).join("/");
    }
    return parts.slice(0, Math.min(parts.length - 1, 5)).join("/");
  }

  return parts.slice(0, -1).join("/") || ".";
}

function summariseProject(project, files) {
  const byExtension = {};
  for (const file of files) {
    byExtension[file.extension] = (byExtension[file.extension] || 0) + 1;
  }

  const sourceScore =
    (byExtension[".fla"] || 0) * 4 +
    (byExtension[".as"] || 0) * 3 +
    (byExtension[".swf"] || 0) * 2 +
    (byExtension[".html"] || 0) +
    (byExtension[".htm"] || 0);

  let migrationClass = "inspect";
  if ((byExtension[".fla"] || 0) && (byExtension[".swf"] || 0)) {
    migrationClass = "strong-source-pair";
  } else if (byExtension[".as"] || 0) {
    migrationClass = "actionscript-source";
  } else if (byExtension[".swf"] || 0) {
    migrationClass = "swf-only-or-partial";
  } else if ((byExtension[".html"] || 0) || (byExtension[".htm"] || 0)) {
    migrationClass = "wrapper-or-web-assets";
  }

  return {
    project,
    migrationClass,
    sourceScore,
    counts: byExtension,
    files: files.map(file => file.path).sort()
  };
}

function markdownForInventory(inventory) {
  const lines = [
    "# Flash migration inventory",
    "",
    `Generated from the repository source tree. Projects found: ${inventory.projects.length}.`,
    "",
    "| Project | Class | FLA | SWF | AS | HTML | Assets |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |"
  ];

  for (const project of inventory.projects) {
    const counts = project.counts;
    const assets = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".mp3", ".wav", ".flv"]
      .reduce((total, extension) => total + (counts[extension] || 0), 0);
    const htmlCount = (counts[".html"] || 0) + (counts[".htm"] || 0);

    lines.push(
      `| \`${project.project}\` | ${project.migrationClass} | ${counts[".fla"] || 0} | ${counts[".swf"] || 0} | ${counts[".as"] || 0} | ${htmlCount} | ${assets} |`
    );
  }

  lines.push(
    "",
    "## Meaning of migration classes",
    "",
    "* `strong-source-pair`: FLA and SWF are both present.",
    "* `actionscript-source`: ActionScript is available even when the project does not have a simple FLA and SWF pair.",
    "* `swf-only-or-partial`: compiled Flash is present but source recovery needs more inspection.",
    "* `wrapper-or-web-assets`: HTML or supporting web files exist without an obvious Flash source pair.",
    "* `inspect`: the project needs manual classification.",
    ""
  );

  return lines.join("\n");
}

const files = [];
for (const sourceRoot of sourceRoots) {
  await walk(path.join(repoRoot, sourceRoot), sourceRoot, files);
}

const grouped = new Map();
for (const file of files) {
  const key = projectKey(file.path);
  if (!grouped.has(key)) {
    grouped.set(key, []);
  }
  grouped.get(key).push(file);
}

const projects = [...grouped.entries()]
  .map(([project, projectFiles]) => summariseProject(project, projectFiles))
  .sort((a, b) => {
    if (b.sourceScore !== a.sourceScore) {
      return b.sourceScore - a.sourceScore;
    }
    return a.project.localeCompare(b.project);
  });

const totals = {};
for (const file of files) {
  totals[file.extension] = (totals[file.extension] || 0) + 1;
}

const inventory = {
  generatedAt: new Date().toISOString(),
  sourceRoots,
  totals,
  projects
};

await fs.mkdir(path.dirname(outputJson), { recursive: true });
await fs.writeFile(outputJson, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
await fs.writeFile(outputMarkdown, `${markdownForInventory(inventory)}\n`, "utf8");

console.log(`Wrote ${path.relative(repoRoot, outputJson)}`);
console.log(`Wrote ${path.relative(repoRoot, outputMarkdown)}`);
console.log(`Projects: ${projects.length}`);
