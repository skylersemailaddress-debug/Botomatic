export function detectFrameworks(files: string[]): string[] {
  const joined = files.join("\n").toLowerCase();
  const found = new Set<string>();
  if (joined.includes("next.config")) found.add("nextjs");
  if (joined.includes("vite.config")) found.add("vite");
  if (joined.includes("angular.json")) found.add("angular");
  if (joined.includes("nuxt.config")) found.add("nuxt");
  if (joined.includes("pubspec.yaml")) found.add("flutter");
  if (joined.includes("unity")) found.add("unity");
  return Array.from(found);
}
