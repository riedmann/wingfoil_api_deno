import { TrackPoint } from "../util/types.ts";
import Location from "./Location.ts";

export default class LocationOpenStreetmap implements Location {
  async getLocation(point: TrackPoint): Promise<any> {
    try {
      const location = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lon}`
      );
      const data = await location.json();
      return data;
    } catch (error) {
      throw new Error("xx");
    }
  }
}
