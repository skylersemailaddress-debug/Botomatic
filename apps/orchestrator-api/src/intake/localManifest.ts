export type LocalFolderManifest = {
  sourceType: "local_folder_manifest";
  path: string;
  include: string[];
  exclude: string[];
  intent?: string;
};

export function validateLocalFolderManifest(input: unknown): LocalFolderManifest {
  const value = (input || {}) as Record<string, unknown>;
  if (value.sourceType !== "local_folder_manifest") {
    throw new Error("local_folder_manifest sourceType is required.");
  }
  const folderPath = String(value.path || "").trim();
  if (!folderPath) {
    throw new Error("Manifest path is required.");
  }
  const include = Array.isArray(value.include) ? value.include.map((item) => String(item)) : [];
  const exclude = Array.isArray(value.exclude) ? value.exclude.map((item) => String(item)) : [];
  if (include.length === 0) {
    throw new Error("Manifest include list is required.");
  }

  return {
    sourceType: "local_folder_manifest",
    path: folderPath,
    include,
    exclude,
    intent: String(value.intent || ""),
  };
}
