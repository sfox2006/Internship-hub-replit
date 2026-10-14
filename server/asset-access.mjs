import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function findManifestEntry(manifest, suffix) {
  return Object.entries(manifest).find(([key, entry]) => {
    const source = entry.src ?? key;
    return source.replaceAll("\\", "/").endsWith(suffix);
  })?.[0];
}

function collectFiles(manifest, entryKey, includeDynamicImports) {
  const files = new Set();
  const visited = new Set();
  function visit(key) {
    if (!key || visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) return;
    if (entry.file) files.add(`/${entry.file.replace(/^\/+/, "")}`);
    for (const css of entry.css ?? [])
      files.add(`/${css.replace(/^\/+/, "")}`);
    for (const imported of entry.imports ?? []) visit(imported);
    if (includeDynamicImports)
      for (const imported of entry.dynamicImports ?? []) visit(imported);
  }
  visit(entryKey);
  return files;
}

export function loadClientAssetPolicy(clientRoot) {
  const manifestPath = path.join(clientRoot, ".vite", "manifest.json");
  if (!existsSync(manifestPath))
    return { publicAssets: new Set(), memberAssets: new Set(), adminAssets: new Set() };

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return { publicAssets: new Set(), memberAssets: new Set(), adminAssets: new Set() };
  }

  const appEntry =
    findManifestEntry(manifest, "src/main.tsx") ??
    Object.entries(manifest).find(
      ([, entry]) => entry.isEntry && /\.(?:m?js)$/i.test(entry.file ?? ""),
    )?.[0];
  const memberEntry = findManifestEntry(manifest, "src/MemberHub.tsx");
  const adminEntry = findManifestEntry(manifest, "src/pages/Admin.tsx");
  return {
    publicAssets: collectFiles(manifest, appEntry, false),
    memberAssets: collectFiles(manifest, memberEntry, true),
    adminAssets: collectFiles(manifest, adminEntry, false),
  };
}
