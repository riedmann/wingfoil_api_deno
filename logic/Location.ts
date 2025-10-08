import { TrackPoint } from "../util/types.ts";

export default interface Location {
  getLocation(point: TrackPoint): Promise<any>;
}
