import type { Analysis } from "./Analysis.ts";

type AnalyzerConstructor = new () => Analysis;

export async function loadAnalyzers(): Promise<Map<string, Analysis>> {
  const analyzers = new Map<string, Analysis>();
  const analyzerDirectory = new URL("./", import.meta.url);

  for await (const entry of Deno.readDir(analyzerDirectory)) {
    if (
      !entry.isFile ||
      !entry.name.endsWith(".ts") ||
      entry.name === "Analysis.ts" ||
      entry.name === "registry.ts"
    ) {
      continue;
    }

    const module = (await import(
      new URL(entry.name, analyzerDirectory).href
    )) as { default?: AnalyzerConstructor };
    const AnalyzerClass = module.default;

    if (!AnalyzerClass) {
      throw new Error(
        `Analyzer module ${entry.name} must default-export an analyzer class`,
      );
    }

    analyzers.set(AnalyzerClass.name, new AnalyzerClass());
  }

  return analyzers;
}
