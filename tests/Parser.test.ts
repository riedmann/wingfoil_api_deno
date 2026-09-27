import { assertEquals } from "@std/assert";
import { AnalysisBase } from "../logic/AnalysisBase.ts";
import { KIAnalysis } from "../logic/KIAnalysis.ts";
import { Parser } from "../logic/Parser.ts";

Deno.test(
  "parses GPX trackpoints without extensions and calculates total time",
  async () => {
    const xml = await Deno.readTextFile(
      "testfiles/20260927Radfahren im Freien_01.gpx",
    );
    const rawJson = Parser.parseXMLtoJSON(xml);
    const points = Parser.getPointsFromRawJson(rawJson);
    const totalDistance = Parser.getTotalDistanceFromRawJson(rawJson);
    const firstTime = new Date(points[0].time).getTime();
    const lastTime = new Date(points[points.length - 1].time).getTime();
    const statistics = new AnalysisBase().getStatistics(points, totalDistance);
    const kiStatistics = new KIAnalysis().getStatistics(points, totalDistance);

    assertEquals(points.length > 1, true);
    assertEquals(points[0].hr, undefined);
    assertEquals(points[0].speed, 0);
    assertEquals(totalDistance, 12002);
    assertEquals(statistics.general.totalTime, lastTime - firstTime);
    assertEquals(statistics.distance.total, 12);
    assertEquals(kiStatistics.distance.total, 12);
  },
);
