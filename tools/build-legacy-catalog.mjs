import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const roots = ["flashdev2", "tt"];
const outputJson = path.join(repoRoot, "legacy", "catalog.json");

function titleCase(value) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

async function listSwfs(directory, relativeDirectory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const swfs = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = path.posix.join(relativeDirectory, entry.name);

    if (entry.isDirectory()) {
      swfs.push(...(await listSwfs(absolutePath, relativePath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".swf")) {
      swfs.push({
        name: entry.name.replace(/\.swf$/i, ""),
        path: `/${relativePath}`
      });
    }
  }

  return swfs;
}

async function buildCatalog() {
  const projects = [];

  for (const root of roots) {
    const absoluteRoot = path.join(repoRoot, root);
    let entries;
    try {
      entries = await fs.readdir(absoluteRoot, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const projectPath = path.posix.join(root, entry.name);
      const swfs = await listSwfs(path.join(absoluteRoot, entry.name), projectPath);
      if (swfs.length === 0) {
        continue;
      }

      swfs.sort((left, right) => left.name.localeCompare(right.name));
      projects.push({
        id: projectPath,
        title: titleCase(entry.name),
        simulations: swfs
      });
    }
  }

  projects.sort((left, right) => left.title.localeCompare(right.title));

  await fs.mkdir(path.dirname(outputJson), { recursive: true });
  await fs.writeFile(
    outputJson,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), projectCount: projects.length, projects }, null, 2)}\n`
  );

  console.log(`Wrote ${outputJson}`);
  console.log(`Projects: ${projects.length}`);
}

await buildCatalog();
