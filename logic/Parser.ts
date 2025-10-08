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
        speed: raw.extensions["gpxdata:speed"] ?? 0,
      };
    });
    return convertedPoints;
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
