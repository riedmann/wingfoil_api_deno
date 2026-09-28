import { assertEquals } from "@std/assert";
import { loadAnalyzers } from "../logic/analyzers/registry.ts";

Deno.test("discovers analyzers from the analyzers folder", async () => {
  const analyzers = await loadAnalyzers();

  assertEquals(analyzers.has("AnalysisBase"), true);
  assertEquals(analyzers.has("KIAnalysis"), true);
  for (const analyzer of analyzers.values()) {
    assertEquals(typeof analyzer.getStatistics, "function");
    assertEquals(typeof analyzer.getConfig, "function");
  }
});
