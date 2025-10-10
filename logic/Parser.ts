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
      return {
        lat: parseFloat(raw.lat),
        lon: parseFloat(raw.lon),
        time: raw.time,
        hr: raw.extensions["gpxdata:hr"],
        distance: raw.extensions["gpxdata:distance"],
        speed: raw.extensions["gpxdata:speed"] ?? null, // Use null if no speed data
      };
    });
    
    // Calculate speed from GPS coordinates if not available
    return this.calculateMissingSpeed(convertedPoints);
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

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  static async getMetadata(rawJson: any): Promise<SessionMetadata> {
    const location: Location = new LocationOpenStreetmap();
    const loc: any = await location.getLocation(
      rawJson.gpx.trk.trkseg.trkpt[0]
    );

    const metadata: SessionMetadata = {
      name: rawJson.gpx.trk.name,
      type: rawJson.gpx.trk.type,
      time: rawJson.gpx.metadata.time,
      city: loc.address.city,
      district: loc.address.city_district,
      hamlet: loc.address.hamlet,
      road: loc.address.road,
      country: loc.address.country,
    };

    return metadata;
  }
}
