import { XMLParser } from "npm:fast-xml-parser";
import { SessionMetadata, TrackPoint } from "../util/types.ts";
import LocationOpenStreetmap from "./LocationOpenStreetmap.ts";
import Location from "./Location.ts";

const parser = new XMLParser({
  ignoreAttributes: false, // 👈 keep attributes
  attributeNamePrefix: "", // 👈 remove @ prefix for cleaner keys
});
export class Parser {
  static parseXMLtoJSON(xml: string): any {
    const data = parser.parse(xml); // parse XML → JS object
    return data;
  }
  static getPointsFromRawJson(data: any): TrackPoint[] {
    const points = data.gpx.trk.trkseg.trkpt;
    const convertedPoints: TrackPoint[] = points.map((raw: any) => {
      const extensions = raw.extensions ?? {};
      return {
        lat: parseFloat(raw.lat),
        lon: parseFloat(raw.lon),
        time: raw.time,
        hr: extensions["gpxdata:hr"],
        distance: extensions["gpxdata:distance"],
        speed: extensions["gpxdata:speed"] ?? null,
      };
    });

    // Calculate speed from GPS coordinates if not available
    return this.calculateMissingSpeed(convertedPoints);
  }

  static getTotalDistanceFromRawJson(data: any): number | undefined {
    const distance = Number(data.gpx.trk.extensions?.totalDistance);
    return Number.isFinite(distance) && distance > 0 ? distance : undefined;
  }

  /**
   * Calculate speed from GPS coordinates for points that don't have speed data
   */
  private static calculateMissingSpeed(points: TrackPoint[]): TrackPoint[] {
    if (points.length < 2) return points;

    // Set first point speed to 0 if missing
    if (points[0].speed === null) {
      points[0].speed = 0;
    }

    for (let i = 1; i < points.length; i++) {
      // Only calculate speed if it's missing
      if (points[i].speed === null) {
        const prevPoint = points[i - 1];
        const currentPoint = points[i];

        // Calculate distance between points using Haversine formula
        const distance = this.calculateDistance(prevPoint, currentPoint);

        // Calculate time difference in seconds
        const prevTime = new Date(prevPoint.time).getTime();
        const currTime = new Date(currentPoint.time).getTime();
        const timeDiffSeconds = (currTime - prevTime) / 1000;

        if (timeDiffSeconds > 0) {
          points[i].speed = distance / timeDiffSeconds; // m/s
        } else {
          // If time difference is 0 or negative, use previous point's speed
          points[i].speed = prevPoint.speed || 0;
        }
      }
    }

    return points;
  }

  /**
   * Calculate distance between two GPS points using Haversine formula
   * Returns distance in meters
   */
  private static calculateDistance(pt1: TrackPoint, pt2: TrackPoint): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number): number => (deg * Math.PI) / 180;

    const lat1 = toRad(pt1.lat);
    const lon1 = toRad(pt1.lon);
    const lat2 = toRad(pt2.lat);
    const lon2 = toRad(pt2.lon);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  static async getMetadata(rawJson: any): Promise<SessionMetadata> {
    const location: Location = new LocationOpenStreetmap();
    const firstPoint = rawJson.gpx.trk.trkseg.trkpt[0];
    const loc: any = await location.getLocation(firstPoint);
    const address = loc.address ?? {};

    const metadata: SessionMetadata = {
      name: rawJson.gpx.trk.name ?? rawJson.gpx.name ?? "n.a.",
      type: rawJson.gpx.trk.type ?? "n.a.",
      time: rawJson.gpx.metadata?.time ?? firstPoint.time,
      city: address.city || "n.a.",
      district: address.city_district || "n.a.",
      hamlet: address.hamlet || "n.a.",
      road: address.road || "n.a.",
      country: address.country || "n.a.",
      leisure: address.leisure || "n.a.",
      village: address.village || "n.a.",
      county: address.county || "n.a.",
      state: address.state || "n.a.",
      country_code: address.country_code || "n.a.",
    };

    return metadata;
  }
}
