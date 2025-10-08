import { TrackPoint, TrackStatistics } from "../util/types.ts";
import { Analysis } from "./Analysis.ts";

export interface AnalysisConfig {
  /** Minimum speed to be considered "flying" (default: 6 km/h) */
  flyingSpeedThresholdKmh: number;
  /** Minimum speed to maintain during a flying jibe (default: 6 km/h) */
  flyingJibeSpeedThresholdKmh: number;
  /** Minimum angle change to be considered a jibe (downwind turn, default: 140°) */
  jibeAngleThreshold?: number;
  /** Minimum angle change to be considered a tack (upwind turn, default: 80°) */
  tackAngleThreshold?: number;
  /** Maximum time window to detect maneuvers (default: 15 seconds) */
  maneuverTimeWindowSeconds?: number;
  /** Minimum segment duration to count as valid flying (default: 5 seconds) */
  minFlyingSegmentSeconds?: number;
}
export class AnalysisBase implements Analysis {
  constructor(private config: AnalysisConfig) {}

  getConfig() {
    return this.config;
  }
  getStatistics(points: TrackPoint[]): TrackStatistics {
    return getAnalysisData(points, this.config);
  }
}

const getAnalysisData = (
  points: TrackPoint[],
  config: AnalysisConfig
): TrackStatistics => {
  if (!points || points.length < 2) {
    throw Error();
  }

  // Calculate total distance (sum of all point distances)
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistance(points[i - 1], points[i]);
    totalDistance += distance;
  }

  // Calculate total time
  const startTime = new Date(points[0].time);
  const endTime = new Date(points[points.length - 1].time);
  const totalTimeMs = endTime.getTime() - startTime.getTime();
  const totalTimeSeconds = totalTimeMs / 1000;

  // Calculate speeds
  //const speeds = points.map((p) => p.speed || 0);
  const maxSpeed = getMaxSpeed(points);
  const avgSpeed = averageSpeedWeighted(points);

  // Calculate time above 10 km/h
  let timeAbove10kmh = 0;
  for (let i = 1; i < points.length; i++) {
    const prevPoint = points[i - 1];
    const currentPoint = points[i];

    const prevSpeedKmh = (prevPoint.speed || 0) * 3.6; // Convert m/s to km/h
    const currentSpeedKmh = (currentPoint.speed || 0) * 3.6;

    if (
      prevSpeedKmh > config.flyingJibeSpeedThresholdKmh ||
      currentSpeedKmh > 8
    ) {
      const segmentTime =
        new Date(currentPoint.time).getTime() -
        new Date(prevPoint.time).getTime();
      // If both speeds are above 10, count full segment time
      // If only one is above, count half the segment time (approximation)
      const timeToAdd =
        prevSpeedKmh > config.flyingSpeedThresholdKmh &&
        currentSpeedKmh > config.flyingJibeSpeedThresholdKmh
          ? segmentTime
          : segmentTime / 2;

      timeAbove10kmh += timeToAdd;
    }
  }

  // Calculate max distance from start point
  const startPoint = points[0];
  let maxDistanceFromStart = 0;

  for (let i = 1; i < points.length; i++) {
    const distanceFromStart = calculateDistance(startPoint, points[i]);
    if (distanceFromStart > maxDistanceFromStart) {
      maxDistanceFromStart = distanceFromStart;
    }
  }

  // Calculate longest sequence where speed > 10 km/h
  let currentSequenceTime = 0;
  let longestSequenceTime = 0;
  let sequenceStartIndex = -1;

  for (let i = 0; i < points.length; i++) {
    const speedKmh = (points[i].speed || 0) * 3.6;

    if (speedKmh > config.flyingSpeedThresholdKmh) {
      // Start or continue a sequence
      if (sequenceStartIndex === -1) {
        sequenceStartIndex = i;
      }

      // If we're at the last point and in a sequence, calculate the sequence time
      if (i === points.length - 1 && sequenceStartIndex !== -1) {
        const sequenceStart = new Date(
          points[sequenceStartIndex].time
        ).getTime();
        const sequenceEnd = new Date(points[i].time).getTime();
        currentSequenceTime = (sequenceEnd - sequenceStart) / 1000;

        if (currentSequenceTime > longestSequenceTime) {
          longestSequenceTime = currentSequenceTime;
        }
      }
    } else if (sequenceStartIndex !== -1) {
      // End of a sequence
      const sequenceStart = new Date(points[sequenceStartIndex].time).getTime();
      const sequenceEnd = new Date(points[i - 1].time).getTime();
      currentSequenceTime = (sequenceEnd - sequenceStart) / 1000;

      if (currentSequenceTime > longestSequenceTime) {
        longestSequenceTime = currentSequenceTime;
      }

      sequenceStartIndex = -1;
    }
  }

  // Detect jibes, tacks, and flying jibes
  // For this example, we'll use a simple bearing change detection
  // In a real app, you might want to use more sophisticated algorithms

  const MIN_JIBE_ANGLE = 140; // Minimum angle change for a jibe
  const MIN_TACK_ANGLE = 80; // Minimum angle change for a tack
  const FLY_JIBE_THRESHOLD = 10; // km/h

  let jibeCount = 0;
  let tackCount = 0;
  let flyingJibeCount = 0;

  // Calculate bearings
  const bearings: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    bearings.push(calculateBearing(points[i], points[i + 1]));
  }
  bearings.push(bearings[bearings.length - 1]); // Add last bearing

  // Detect maneuvers
  for (let i = 1; i < points.length - 1; i++) {
    // Look ahead for significant direction changes within a time window
    const MAX_MANEUVER_TIME = 10; // seconds
    let maxAngleChange = 0;
    let maneuverEndIndex = -1;

    for (let j = i + 1; j < points.length; j++) {
      // Check if we're still within the time window
      const timeDiff =
        (new Date(points[j].time).getTime() -
          new Date(points[i].time).getTime()) /
        1000;
      if (timeDiff > MAX_MANEUVER_TIME) break;

      // Calculate angle change
      const angleChange = angleDifference(bearings[i - 1], bearings[j - 1]);

      if (angleChange > maxAngleChange) {
        maxAngleChange = angleChange;
        maneuverEndIndex = j;
      }
    }

    // Classify the maneuver
    if (maxAngleChange >= MIN_JIBE_ANGLE) {
      jibeCount++;

      // Check if it's a flying jibe
      let isFlying = true;
      for (let j = i; j <= maneuverEndIndex; j++) {
        if ((points[j].speed || 0) * 3.6 <= FLY_JIBE_THRESHOLD) {
          isFlying = false;
          break;
        }
      }

      if (isFlying) {
        flyingJibeCount++;
      }

      // Skip ahead to after the jibe
      i = maneuverEndIndex;
    } else if (maxAngleChange >= MIN_TACK_ANGLE) {
      tackCount++;

      // Skip ahead to after the tack
      i = maneuverEndIndex;
    }
  }
  let stats: TrackStatistics = {
    totalDistance,
    totalTime: totalTimeSeconds,
    avgSpeed: avgSpeed,
    maxSpeed: maxSpeed,
    timeAbove10kmh: timeAbove10kmh / 1000, // Convert to seconds
    maxDistanceFromStart,
    longestSequenceAbove10kmh: longestSequenceTime,
    jibeCount,
    tackCount,
    flyingJibeCount,
  };

  return stats;
};

type Point = {
  lat: number;
  lon: number;
  time: string; // ISO string
  speed?: number; // m/s or km/h
  hr?: number;
};

function averageSpeedWeighted(points: TrackPoint[]): number {
  if (points.length < 2) return 0;

  let totalWeighted = 0;
  let totalTime = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (p1.speed === undefined || p2.speed === undefined) continue;

    const t1 = new Date(p1.time).getTime();
    const t2 = new Date(p2.time).getTime();
    const dt = (t2 - t1) / 1000; // seconds

    if (dt <= 0) continue;

    // Use average of the two speeds for this segment
    const segmentSpeed = (p1.speed + p2.speed) / 2;

    // Outlier filter: skip if speed is unrealistically high
    if (segmentSpeed > 100) continue; // adjust threshold as needed

    totalWeighted += segmentSpeed * dt;
    totalTime += dt;
  }

  return totalTime > 0 ? totalWeighted / totalTime : 0;
}

// If speeds are in km/h, either convert to m/s at input (s / 3.6)
// or set jumpMps = 7.2 for "2 m/s" equivalent.
const DEFAULT_JUMP_MPS = 2; // 2 m/s

function toMs(t: string | number | Date): number {
  return typeof t === "number" ? t : new Date(t).getTime();
}

/**
 * Keep only points whose speed does not jump by more than `jumpMps`
 * compared to the last *kept* speed. Also enforces strictly increasing time.
 */
function filterBySpeedJump(points: TrackPoint[], jumpMps = DEFAULT_JUMP_MPS) {
  const kept: { t: number; s: number }[] = [];
  let lastKeptSpeed: number | null = null;
  let prevT = -Infinity;

  for (const p of points) {
    const s = p.speed;
    if (typeof s !== "number" || !isFinite(s)) continue;

    const t = toMs(p.time);
    if (!(t > prevT)) continue; // enforce strictly increasing time

    if (lastKeptSpeed === null || Math.abs(s - lastKeptSpeed) <= jumpMps) {
      kept.push({ t, s });
      lastKeptSpeed = s;
      prevT = t;
    }
    // else: drop spike point
  }
  return kept;
}

/** Time-weighted average speed using the filtered GPX speeds. Returns m/s. */
function averageSpeedWeightedFromGpx(
  points: TrackPoint[],
  jumpMps = DEFAULT_JUMP_MPS
): number {
  const pts = filterBySpeedJump(points, jumpMps);
  if (pts.length < 2) return 0;

  let num = 0; // sum( avgSegmentSpeed * dt )
  let den = 0; // sum( dt )

  for (let i = 0; i < pts.length - 1; i++) {
    const dt = (pts[i + 1].t - pts[i].t) / 1000; // seconds
    if (dt <= 0) continue;
    const segSpeed = (pts[i].s + pts[i + 1].s) / 2; // trapezoid
    num += segSpeed * dt;
    den += dt;
  }
  return den ? num / den : 0;
}

/** Maximum speed after spike filtering. Returns m/s. */
function getMaxSpeed(points: TrackPoint[], jumpMps = DEFAULT_JUMP_MPS): number {
  const pts = filterBySpeedJump(points, jumpMps);
  let max = 0;
  for (const p of pts) if (p.s > max) max = p.s;
  return max;
}

// Calculate bearing between two points
const calculateBearing = (pt1: TrackPoint, pt2: TrackPoint): number => {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const toDeg = (rad: number): number => (rad * 180) / Math.PI;

  const lat1 = toRad(pt1.lat);
  const lon1 = toRad(pt1.lon);
  const lat2 = toRad(pt2.lat);
  const lon2 = toRad(pt2.lon);

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// Calculate angle difference accounting for 0/360 boundary
const angleDifference = (angle1: number, angle2: number): number => {
  const diff = Math.abs(angle1 - angle2);
  return diff > 180 ? 360 - diff : diff;
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (pt1: TrackPoint, pt2: TrackPoint): number => {
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
};

export const setCorrectSpeed = (points: TrackPoint[]) => {
  if (points[0].speed === undefined) {
    points[0].speed = 0; // Set default speed if not present
  }
  for (let i = 1; i < points.length; i++) {
    if (points[i].speed === undefined) {
      points[i].speed = 0; // Initialize speed if undefined
      const prevPoint = points[i - 1];
      const currPoint = points[i];

      // Calculate distance between points using Haversine formula
      const R = 6371000; // Earth radius in meters
      const toRad = (deg: number): number => (deg * Math.PI) / 180;

      const lat1 = toRad(prevPoint.lat);
      const lon1 = toRad(prevPoint.lon);
      const lat2 = toRad(currPoint.lat);
      const lon2 = toRad(currPoint.lon);

      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) *
          Math.cos(lat2) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = R * c; // in meters

      // Calculate time difference in seconds
      const prevTime = new Date(prevPoint.time).getTime();
      const currTime = new Date(currPoint.time).getTime();
      const timeDiffSeconds = (currTime - prevTime) / 1000;

      if (timeDiffSeconds > 0) {
        points[i].speed = distance / timeDiffSeconds; // m/s
      }
    }
  }
};

export const getLocationData = async (lon: number, lat: number) => {
  try {
    const proxy = `https://corsproxy.io/?`;

    let location = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
      {
        headers: {
          "User-Agent": "MyApp/1.0 (your@email.com)", // REQUIRED!
          Accept: "application/json",
        },
      }
    );

    let locationData = await location.json();
    return locationData;
  } catch (error) {
    console.error("Error fetching location data:", error);
    return {
      display_name: "unbekannt",
      address: {
        country: "unbekannt",
        village: "unbekannt",
        hamlet: "unbekannt",
      },
    };
  }
};
