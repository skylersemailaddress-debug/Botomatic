export function detectLanguages(files: string[]): string[] {
  const langs = new Set<string>();
  for (const file of files) {
    if (file.endsWith(".ts") || file.endsWith(".tsx")) langs.add("typescript");
    if (file.endsWith(".js") || file.endsWith(".jsx")) langs.add("javascript");
    if (file.endsWith(".py")) langs.add("python");
    if (file.endsWith(".go")) langs.add("go");
    if (file.endsWith(".rs")) langs.add("rust");
    if (file.endsWith(".java")) langs.add("java");
    if (file.endsWith(".cs")) langs.add("csharp");
    if (file.endsWith(".lua")) langs.add("lua");
  }
  return Array.from(langs);
}
