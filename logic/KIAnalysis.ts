import {
  RawTrackStatistics,
  TrackPoint,
  TrackStatistics,
} from "../util/types.ts";
import { formatDateTime } from "../util/utils.ts";
import { Analysis } from "./Analysis.ts";

export interface KIAnalysisConfig {
  /** Minimum speed to be considered "flying" (default: 6 km/h) */
  flyingSpeedThresholdKmh: number;
  /** Minimum speed to maintain during a flying jibe (default: 6 km/h) */
  flyingJibeSpeedThresholdKmh: number;
  /** Minimum angle change to be considered a jibe (downwind turn, default: 140°) */
  jibeAngleThreshold: number;
  /** Minimum angle change to be considered a tack (upwind turn, default: 80°) */
  tackAngleThreshold: number;
  /** Maximum time window to detect maneuvers (default: 15 seconds) */
  maneuverTimeWindowSeconds: number;
  /** Minimum segment duration to count as valid flying (default: 5 seconds) */
  minFlyingSegmentSeconds: number;
  /** Minimum duration a speed must be sustained to count as max speed (default: 5 seconds) */
  minMaxSpeedDurationSeconds: number;
}

export class KIAnalysis implements Analysis {
  private config: KIAnalysisConfig;

  constructor(config?: Partial<KIAnalysisConfig>) {
    this.config = {
      flyingSpeedThresholdKmh: 8,
      flyingJibeSpeedThresholdKmh: 8,
      jibeAngleThreshold: 140,
      tackAngleThreshold: 80,
      maneuverTimeWindowSeconds: 15,
      minFlyingSegmentSeconds: 5,
      minMaxSpeedDurationSeconds: 3,
      ...config,
    };
  }

  getStatistics(points: TrackPoint[]): TrackStatistics {
    const rawStats = this.getKIAnalysisData(points);
    return this.formatStatistics(rawStats);
  }

  private getKIAnalysisData(points: TrackPoint[]): RawTrackStatistics {
    if (!points || points.length < 2) {
      throw new Error("Insufficient data points for analysis");
    }

    // Calculate basic metrics
    const totalDistance = this.calculateTotalDistance(points);
    const totalTimeSeconds = this.calculateTotalTime(points);
    const maxSpeed = this.getMaxSpeed(points);
    const avgSpeed = this.calculateAverageSpeed(points);

    // Calculate wingfoil-specific metrics
    const timeAbove10kmh = this.calculateFlyingTime(points);
    const maxDistanceFromStart = this.calculateMaxDistanceFromStart(points);
    const longestSequenceAbove10kmh =
      this.calculateLongestFlyingSequence(points);

    // Detect maneuvers
    const maneuvers = this.detectManeuvers(points);

    return {
      totalDistance,
      totalTime: totalTimeSeconds,
      startTime: points[0].time,
      endTime: points[points.length - 1].time,
      avgSpeed,
      maxSpeed,
      timeAbove10kmh: timeAbove10kmh / 1000, // Convert to seconds
      maxDistanceFromStart,
      longestSequenceAbove10kmh,
      jibeCount: maneuvers.jibes,
      tackCount: maneuvers.tacks,
      flyingJibeCount: maneuvers.flyingJibes,
    };
  }

  private formatStatistics(rawStats: RawTrackStatistics): TrackStatistics {
    const flyingPercentage = (
      (rawStats.timeAbove10kmh / rawStats.totalTime) *
      100
    ).toFixed(1);
    const flyingJibePercentage =
      rawStats.jibeCount > 0
        ? ((rawStats.flyingJibeCount / rawStats.jibeCount) * 100).toFixed(1)
        : "0";

    return {
      general: {
        date: new Date(rawStats.startTime),
        totalTime: this.formatDuration(rawStats.totalTime),
        startTime: formatDateTime(rawStats.startTime),
        endTime: formatDateTime(rawStats.endTime),
      },
      speed: {
        avg: `${(rawStats.avgSpeed * 3.6).toFixed(1)} km/h`,
        max: `${(rawStats.maxSpeed * 3.6).toFixed(1)} km/h`,
      },
      flying: {
        time: this.formatDuration(rawStats.timeAbove10kmh),
        longestSequence: this.formatDuration(
          rawStats.longestSequenceAbove10kmh
        ),
        percentage: `${flyingPercentage}%`,
      },
      maneuvers: {
        jibes: rawStats.jibeCount,
        tacks: rawStats.tackCount,
        flyingJibes: rawStats.flyingJibeCount,
        flyingJibePercentage: `${flyingJibePercentage}%`,
      },
      distance: {
        total: `${(rawStats.totalDistance / 1000).toFixed(2)} km`,
        maxFromStart: `${(rawStats.maxDistanceFromStart / 1000).toFixed(2)} km`,
      },
    };
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
  }

  private calculateTotalDistance(points: TrackPoint[]): number {
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.calculateDistance(points[i - 1], points[i]);
    }
    return totalDistance;
  }

  private calculateTotalTime(points: TrackPoint[]): number {
    const startTime = new Date(points[0].time);
    const endTime = new Date(points[points.length - 1].time);
    return (endTime.getTime() - startTime.getTime()) / 1000;
  }

  private getMaxSpeed(points: TrackPoint[]): number {
    const filteredPoints = this.filterSpeedOutliers(points);
    return this.getMaxSustainedSpeed(filteredPoints);
  }

  /**
   * Calculate the maximum speed that is sustained for at least the configured duration
   */
  private getMaxSustainedSpeed(points: TrackPoint[]): number {
    if (points.length < 2) return 0;

    let maxSustainedSpeed = 0;
    const minDuration = this.config.minMaxSpeedDurationSeconds;

    for (let i = 0; i < points.length; i++) {
      const currentSpeed = points[i].speed || 0;

      // Skip if speed is 0 or very low
      if (currentSpeed <= 0.1) continue; // 0.1 m/s = 0.36 km/h threshold

      // Find how long this speed (or higher) is sustained
      const sustainedDuration = this.calculateSustainedSpeedDuration(
        points,
        i,
        currentSpeed
      );

      // Only consider this speed if it's sustained for the minimum duration
      if (
        sustainedDuration >= minDuration &&
        currentSpeed > maxSustainedSpeed
      ) {
        maxSustainedSpeed = currentSpeed;
      }
    }

    return maxSustainedSpeed;
  }

  /**
   * Calculate how long a given speed (or higher) is sustained starting from a specific point
   */
  private calculateSustainedSpeedDuration(
    points: TrackPoint[],
    startIndex: number,
    targetSpeed: number
  ): number {
    if (startIndex >= points.length - 1) return 0;

    const startTime = new Date(points[startIndex].time).getTime();
    let endTime = startTime;

    // Find consecutive points where speed >= targetSpeed
    for (let i = startIndex; i < points.length; i++) {
      const currentSpeed = points[i].speed || 0;

      if (currentSpeed >= targetSpeed) {
        endTime = new Date(points[i].time).getTime();
      } else {
        // Speed dropped below target, stop here
        break;
      }
    }

    return (endTime - startTime) / 1000; // Return duration in seconds
  }

  private calculateAverageSpeed(points: TrackPoint[]): number {
    if (points.length < 2) return 0;

    const filteredPoints = this.filterSpeedOutliers(points);
    let totalWeighted = 0;
    let totalTime = 0;

    for (let i = 0; i < filteredPoints.length - 1; i++) {
      const p1 = filteredPoints[i];
      const p2 = filteredPoints[i + 1];

      if (p1.speed === undefined || p2.speed === undefined) continue;

      const dt =
        (new Date(p2.time).getTime() - new Date(p1.time).getTime()) / 1000;
      if (dt <= 0) continue;

      const segmentSpeed = (p1.speed + p2.speed) / 2;
      totalWeighted += segmentSpeed * dt;
      totalTime += dt;
    }

    return totalTime > 0 ? totalWeighted / totalTime : 0;
  }

  /**
   * Calculate time spent flying (speed > configured threshold)
   */
  private calculateFlyingTime(points: TrackPoint[]): number {
    let flyingTime = 0;
    const thresholdMs = this.config.flyingSpeedThresholdKmh / 3.6; // Convert to m/s

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];

      const prevSpeed = prevPoint.speed || 0;
      const currentSpeed = currentPoint.speed || 0;

      if (prevSpeed > thresholdMs || currentSpeed > thresholdMs) {
        const segmentTime =
          new Date(currentPoint.time).getTime() -
          new Date(prevPoint.time).getTime();

        // If both speeds are above threshold, count full segment time
        // If only one is above, count half the segment time (approximation)
        const timeToAdd =
          prevSpeed > thresholdMs && currentSpeed > thresholdMs
            ? segmentTime
            : segmentTime / 2;

        flyingTime += timeToAdd;
      }
    }

    return flyingTime;
  }

  private calculateMaxDistanceFromStart(points: TrackPoint[]): number {
    const startPoint = points[0];
    let maxDistance = 0;

    for (let i = 1; i < points.length; i++) {
      const distance = this.calculateDistance(startPoint, points[i]);
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    }

    return maxDistance;
  }

  /**
   * Calculate the longest continuous sequence where speed > flying threshold
   */
  private calculateLongestFlyingSequence(points: TrackPoint[]): number {
    const thresholdMs = this.config.flyingSpeedThresholdKmh / 3.6;
    let longestSequence = 0;
    let currentSequenceStart = -1;

    for (let i = 0; i < points.length; i++) {
      const speed = points[i].speed || 0;

      if (speed > thresholdMs) {
        if (currentSequenceStart === -1) {
          currentSequenceStart = i;
        }

        // If at the last point and in a sequence, calculate the sequence time
        if (i === points.length - 1 && currentSequenceStart !== -1) {
          const sequenceTime =
            (new Date(points[i].time).getTime() -
              new Date(points[currentSequenceStart].time).getTime()) /
            1000;

          if (sequenceTime >= this.config.minFlyingSegmentSeconds) {
            longestSequence = Math.max(longestSequence, sequenceTime);
          }
        }
      } else if (currentSequenceStart !== -1) {
        // End of sequence
        const sequenceTime =
          (new Date(points[i - 1].time).getTime() -
            new Date(points[currentSequenceStart].time).getTime()) /
          1000;

        if (sequenceTime >= this.config.minFlyingSegmentSeconds) {
          longestSequence = Math.max(longestSequence, sequenceTime);
        }

        currentSequenceStart = -1;
      }
    }

    return longestSequence;
  }

  /**
   * Detect jibes, tacks, and flying jibes based on bearing changes and speed
   */
  private detectManeuvers(points: TrackPoint[]): {
    jibes: number;
    tacks: number;
    flyingJibes: number;
  } {
    const bearings = this.calculateBearings(points);
    let jibes = 0;
    let tacks = 0;
    let flyingJibes = 0;

    for (let i = 1; i < points.length - 1; i++) {
      const maneuver = this.detectManeuverAtPoint(points, bearings, i);

      if (maneuver) {
        if (maneuver.type === "jibe") {
          jibes++;
          if (maneuver.isFlying) {
            flyingJibes++;
          }
          i = maneuver.endIndex; // Skip ahead to avoid double counting
        } else if (maneuver.type === "tack") {
          tacks++;
          i = maneuver.endIndex; // Skip ahead to avoid double counting
        }
      }
    }

    return { jibes, tacks, flyingJibes };
  }

  private detectManeuverAtPoint(
    points: TrackPoint[],
    bearings: number[],
    startIndex: number
  ): { type: "jibe" | "tack"; endIndex: number; isFlying: boolean } | null {
    let maxAngleChange = 0;
    let maneuverEndIndex = -1;

    // Look ahead within the time window
    for (let j = startIndex + 1; j < points.length; j++) {
      const timeDiff =
        (new Date(points[j].time).getTime() -
          new Date(points[startIndex].time).getTime()) /
        1000;

      if (timeDiff > this.config.maneuverTimeWindowSeconds) break;

      const angleChange = this.angleDifference(
        bearings[startIndex - 1],
        bearings[j - 1]
      );

      if (angleChange > maxAngleChange) {
        maxAngleChange = angleChange;
        maneuverEndIndex = j;
      }
    }

    // Classify the maneuver based on angle change
    if (maxAngleChange >= this.config.jibeAngleThreshold) {
      // Check if it's a flying jibe (speed never drops below threshold)
      const isFlying = this.isManeuverFlying(
        points,
        startIndex,
        maneuverEndIndex
      );
      return { type: "jibe", endIndex: maneuverEndIndex, isFlying };
    } else if (maxAngleChange >= this.config.tackAngleThreshold) {
      return { type: "tack", endIndex: maneuverEndIndex, isFlying: false };
    }

    return null;
  }

  /**
   * Check if a maneuver maintains flying speed throughout
   */
  private isManeuverFlying(
    points: TrackPoint[],
    startIndex: number,
    endIndex: number
  ): boolean {
    const thresholdMs = this.config.flyingJibeSpeedThresholdKmh / 3.6;

    for (let i = startIndex; i <= endIndex; i++) {
      if ((points[i].speed || 0) <= thresholdMs) {
        return false;
      }
    }

    return true;
  }

  private calculateBearings(points: TrackPoint[]): number[] {
    const bearings: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      bearings.push(this.calculateBearing(points[i], points[i + 1]));
    }

    // Add the last bearing to match array length
    if (bearings.length > 0) {
      bearings.push(bearings[bearings.length - 1]);
    }

    return bearings;
  }

  private calculateBearing(pt1: TrackPoint, pt2: TrackPoint): number {
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
  }

  private angleDifference(angle1: number, angle2: number): number {
    const diff = Math.abs(angle1 - angle2);
    return diff > 180 ? 360 - diff : diff;
  }

  private calculateDistance(pt1: TrackPoint, pt2: TrackPoint): number {
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

  /**
   * Filter out speed outliers that are unrealistically high
   */
  private filterSpeedOutliers(
    points: TrackPoint[],
    maxSpeedMs: number = 50
  ): TrackPoint[] {
    return points.filter((p) => (p.speed || 0) <= maxSpeedMs);
  }

  /**
   * Update configuration for the analysis
   */
  public updateConfig(newConfig: Partial<KIAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): Record<string, unknown> {
    return { ...this.config };
  }
}
