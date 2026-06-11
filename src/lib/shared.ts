// Dependency-free helpers shared by the pure domain module (src/lib/atlas.ts)
// and the server I/O layer (server/atlasFiles.ts). Both files used to carry
// private copies of these; the copies had already started to drift, which is
// exactly the failure mode this module exists to stop. atlasFiles.ts imports
// atlas.ts, so anything shared by both must live in a leaf module like this
// one to avoid a cycle.

export function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

export function basename(filePath: string) {
  return filePath.split("/").at(-1) ?? filePath;
}

export function dirname(filePath: string) {
  const parts = filePath.split("/");
  parts.pop();
  return parts.join("/");
}

export function normalizePath(filePath: string) {
  const parts: string[] = [];
  for (const part of filePath.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

// NOTE: drops falsy entries (the historical atlas.ts semantics -- empty
// strings must not survive into invariants/risks/file lists).
export function unique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function symbolNodeId(filePath: string, symbolName: string) {
  return `code.symbol.${slug(filePath)}.${slug(symbolName)}`;
}

// Case-insensitive multi-field filter used by the searchable list panels.
export function matchesQuery(query: string, ...values: Array<string | undefined>) {
  if (!query) return true;
  return values.some((value) => value?.toLowerCase().includes(query));
}
