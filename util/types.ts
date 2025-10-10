export type SegmentType = "straight" | "tack" | "jibe" | "slow" | "flightjibe";

export type Segment = {
  type: SegmentType;
  points: TrackPoint[];
  startSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  endSpeed: number;
  avgSpeed: number;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  pointCount: number;
  bearingChange: number;
  isFlyJybe?: boolean;
};

export type TrackPoint = {
  lat: number;
  lon: number;
  speed?: number;
  time: string;
  distance?: number;
  hr?: number;
};

export type SessionMetadata = {
  name: string;
  type: string;
  time: string;
  city?: string;
  district?: string;
  hamlet?: string;
  road?: string;
  country?: string;
};

export type Session = {
  id?: string;
  metadata: SessionMetadata;
  points: TrackPoint[];
  statistics?: TrackStatistics;
  config: any;
};

export interface RawTrackStatistics {
  totalDistance: number; // in meters
  totalTime: number; // in seconds
  avgSpeed: number; // in m/s
  maxSpeed: number; // in m/s
  timeAbove10kmh: number; // in seconds
  maxDistanceFromStart: number; // in meters
  longestSequenceAbove10kmh: number; // in seconds
  jibeCount: number;
  tackCount: number;
  flyingJibeCount: number;
}

export interface TrackStatistics {
  general: {
    totalTime: string;
  };
  speed: {
    avg: string; // e.g. "9.8 km/h"
    max: string; // e.g. "24.2 km/h"
  };
  flying: {
    time: string; // e.g. "1:18:10"
    longestSequence: string; // e.g. "4:04"
    percentage: string; // e.g. "59.6%"
  };
  maneuvers: {
    jibes: number;
    tacks: number;
    flyingJibes: number;
    flyingJibePercentage: string; // e.g. "0.0%"
  };
  distance: {
    total: string; // e.g. "20.54 km"
    maxFromStart: string; // e.g. "0.39 km"
  };
}
