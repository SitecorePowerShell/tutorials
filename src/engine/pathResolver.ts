import type { SitecoreNode, SitecoreItem, ResolvedPath } from "../types";
import { VIRTUAL_TREE } from "./virtualTree";

// The current working directory — matches real SPE ISE default
export const CWD = "/sitecore/content/Home";

export function resolvePath(
  pathStr: string,
  tree: { sitecore: SitecoreNode } = VIRTUAL_TREE
): ResolvedPath | null {
  let clean = pathStr.replace(/['"]/g, "").trim();

  // Handle "master:\" (with backslash) → root of drive (the sitecore node)
  if (/^(master|core|web):[\\/]$/i.test(clean)) {
    return { node: tree.sitecore, name: "sitecore", path: "/sitecore" };
  }

  // Handle "master:" (bare, no backslash) → current location (same as ".")
  if (/^(master|core|web):$/i.test(clean)) {
    return resolveAbsolutePath(CWD, tree);
  }

  // Strip drive prefix: master:\content\Home → content\Home
  clean = clean.replace(/^(master|core|web):[\\/]?/i, "");
  clean = clean.replace(/\\/g, "/");

  // Handle dot-paths relative to CWD
  if (clean === "." || clean === "") {
    return resolveAbsolutePath(CWD, tree);
  } else if (clean.startsWith("./")) {
    clean = CWD + clean.substring(1);
  } else if (clean.startsWith("/sitecore")) {
    // Already absolute with /sitecore prefix — keep as-is
  } else if (
    clean.startsWith("sitecore/") ||
    clean.toLowerCase() === "sitecore"
  ) {
    clean = "/" + clean;
  } else {
    // Relative path segment (e.g. "content/Home") — resolve from /sitecore
    clean = "/sitecore/" + clean;
  }

  return resolveAbsolutePath(clean, tree);
}

export function resolveAbsolutePath(
  cleanPath: string,
  tree: { sitecore: SitecoreNode } = VIRTUAL_TREE
): ResolvedPath | null {
  // Remove trailing slash
  const clean = cleanPath.replace(/\/$/, "");

  const parts = clean.split("/").filter(Boolean);
  let current: SitecoreNode | null = null;
  let currentName = "";

  for (const part of parts) {
    if (!current) {
      if (part.toLowerCase() === "sitecore") {
        current = tree.sitecore;
        currentName = "sitecore";
      } else return null;
    } else {
      const children: Record<string, SitecoreNode> = current._children || {};
      const match: string | undefined = Object.keys(children).find(
        (k) => k.toLowerCase() === part.toLowerCase()
      );
      if (match) {
        current = children[match];
        currentName = match;
      } else return null;
    }
  }
  return current ? { node: current, name: currentName, path: clean } : null;
}

export function getChildren(node: SitecoreNode): SitecoreItem[] {
  if (!node || !node._children) return [];
  return Object.entries(node._children).map(([name, child]) => ({
    name,
    node: child,
  }));
}

export function getAllDescendants(
  node: SitecoreNode,
  parentPath = ""
): SitecoreItem[] {
  const results: SitecoreItem[] = [];
  const children = node._children || {};
  for (const [name, child] of Object.entries(children)) {
    const path = parentPath + "/" + name;
    results.push({ name, node: child, path });
    results.push(...getAllDescendants(child, path));
  }
  return results;
}
