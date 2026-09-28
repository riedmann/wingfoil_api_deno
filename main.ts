import { Hono } from "hono";
import { cors } from "hono/cors";

import { loadAnalyzers } from "./logic/analyzers/registry.ts";
import { Parser } from "./logic/Parser.ts";

import {
  Session,
  SessionMetadata,
  TrackPoint,
  TrackStatistics,
} from "./util/types.ts";

const app = new Hono();

// Enable CORS for all routes
app.use("/*", cors());

const analyzers = await loadAnalyzers();
const defaultAnalyzerName = "AnalysisBase";
const API_VERSION = "1.0.1";

app.get("/", (c) => {
  return c.json({
    title: "Wingfoil API",
    version: API_VERSION,
    endpoints: {
      "/": "API info",
      "/analyze": "Basic GPX analysis",
      "/analyze-wingfoil":
        "Wingfoil-specific analysis with configurable parameters",
      algorithms: [...analyzers.keys()],
    },
  });
});

app.post("/analyze", async (c) => {
  const requestedAlgorithm = c.req.query("algorithm") ?? defaultAnalyzerName;
  const requestedAlgorithmName =
    requestedAlgorithm === "KI" ? "KIAnalysis" : requestedAlgorithm;
  const algo =
    analyzers.get(requestedAlgorithmName) ?? analyzers.get(defaultAnalyzerName);
  if (!algo) {
    throw new Error(`Default analyzer ${defaultAnalyzerName} not found`);
  }
  const algorithmName = algo.constructor.name;

  const xmlText = await c.req.text();
  const json = Parser.parseXMLtoJSON(xmlText);
  const points: TrackPoint[] = Parser.getPointsFromRawJson(json);
  const metadata: SessionMetadata = {
    ...(await Parser.getMetadata(json)),
    algorithm: algorithmName,
  };
  const totalDistance = Parser.getTotalDistanceFromRawJson(json);
  const smoothedGpsMaxSpeed = Parser.getSmoothedGpsMaxSpeedFromRawJson(json);
  const statistics: TrackStatistics = algo.getStatistics(
    points,
    totalDistance,
    smoothedGpsMaxSpeed,
  );

  const session: Session = {
    metadata,
    statistics,
    config: { type: algorithmName },
    points,
  };

  return c.json({
    version: API_VERSION,
    ...session,
  });
});

Deno.serve(app.fetch);
