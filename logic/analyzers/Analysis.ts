import { TrackPoint, TrackStatistics } from "../../util/types.ts";

export interface Analysis {
  getStatistics(
    points: TrackPoint[],
    recordedTotalDistanceMeters?: number,
    smoothedGpsMaxSpeedMps?: number,
  ): TrackStatistics;
  getConfig(): any;
}
