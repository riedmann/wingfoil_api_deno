import { Hono } from "hono";

import { Analysis } from "./logic/Analysis.ts";
import { KIAnalysis } from "./logic/KIAnalysis.ts";
import { Parser } from "./logic/Parser.ts";
import {
  Session,
  SessionMetadata,
  TrackPoint,
  TrackStatistics,
} from "./util/types.ts";
import { AnalysisBase } from "./logic/AnalysisBase.ts";

const app = new Hono();
const analyzer: Analysis = new AnalysisBase({
  flyingSpeedThresholdKmh: 4,
  flyingJibeSpeedThresholdKmh: 2,
  jibeAngleThreshold: 22,
});

// Create KI Analysis with custom wingfoil configuration
const analyzer1: Analysis = new KIAnalysis({
  flyingSpeedThresholdKmh: 6, // Speed above water (configurable)
  flyingJibeSpeedThresholdKmh: 6, // Flying jibe threshold (configurable)
  jibeAngleThreshold: 140, // Jibe angle (downwind turn)
  tackAngleThreshold: 80, // Tack angle (upwind turn)
  maneuverTimeWindowSeconds: 15, // Time window for maneuver detection
  minFlyingSegmentSeconds: 5, // Minimum flying segment duration
});

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
  const xmlText = await c.req.text();
  const json = Parser.parseXMLtoJSON(xmlText);
  const points: TrackPoint[] = Parser.getPointsFromRawJson(json);
  const metadata: SessionMetadata = await Parser.getMetadata(json);
  const statistics: TrackStatistics = await analyzer.getStatistics(points);

  const session: Session = {
    metadata,
    statistics,
    config: analyzer.getConfig(),
    points,
  };

  return c.json(session);
});

app.post("/", async (c) => {
  // Legacy endpoint - redirect to basic analyze
  const xmlText = await c.req.text();
  const json = Parser.parseXMLtoJSON(xmlText);
  const points: TrackPoint[] = Parser.getPointsFromRawJson(json);
  const metadata: SessionMetadata = await Parser.getMetadata(json);
  const statistics: TrackStatistics = await analyzer.getStatistics(points);

  const session: Session = {
    metadata,
    statistics,
    config: { ...analyzer.getConfig(), type: analyzer.constructor.name },
    points,
  };

  return c.json(session);
});

Deno.serve(app.fetch);
