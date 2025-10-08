import { Hono } from "hono";

import { TrackPoint } from "./util/types.ts";
import { Parser } from "./logic/Parser.ts";
import { Analysis } from "./logic/Analysis.ts";
import { AnalysisBase } from "./logic/AnalysisBase.ts";

const app = new Hono();
const analyzer: Analysis = new AnalysisBase();

app.get("/", (c) => {
  return c.json({ title: "Wingfoil API" });
});

app.post("/", async (c) => {
  const xmlText = await c.req.text(); // read raw XML body
  const json = Parser.parseXMLtoJSON(xmlText);
  const points: TrackPoint[] = Parser.getPointsFromRawJson(json);
  const metadata: any = await Parser.getMetadata(json);
  const statistics: any = await analyzer.getStatistics(points);

  return c.json({
    metadata,
    statistics,
    points,
  });
});

Deno.serve(app.fetch);
