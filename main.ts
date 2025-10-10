import { Hono } from "hono";

import { Analysis } from "./logic/Analysis.ts";
import { KIAnalysis } from "./logic/KIAnalysis.ts";
import { Parser } from "./logic/Parser.ts";

import { AnalysisBase } from "./logic/AnalysisBase.ts";
import {
  Session,
  SessionMetadata,
  TrackPoint,
  TrackStatistics,
} from "./util/types.ts";

const app = new Hono();

// Basic analyzer configuration
const analyzer: Analysis = new AnalysisBase();
const kiAnalyzer: Analysis = new KIAnalysis();

app.get("/", (c) => {
  return c.json({
    title: "Wingfoil API",
    endpoints: {
      "/": "API info",
      "/analyze": "Basic GPX analysis",
      "/analyze-wingfoil":
        "Wingfoil-specific analysis with configurable parameters",
    },
  });
});

app.post("/analyze", async (c) => {
  const algorithm = c.req.query("algorithm");
  const algo = algorithm == "KI" ? kiAnalyzer : analyzer;

  const xmlText = await c.req.text();
  const json = Parser.parseXMLtoJSON(xmlText);
  const points: TrackPoint[] = Parser.getPointsFromRawJson(json);
  const metadata: SessionMetadata = await Parser.getMetadata(json);
  const statistics: TrackStatistics = algo.getStatistics(points);

  const session: Session = {
    metadata,
    statistics,
    config: { type: algo.constructor.name },
    points,
  };

  return c.json({
    ...session,
  });
});

Deno.serve(app.fetch);
