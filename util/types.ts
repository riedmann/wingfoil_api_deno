export type SegmentType = "straight" | "tack" | "jibe" | "slow" | "flightjibe";

export type JibeType = "flying" | "regular" | "crash";

export type JibeInfo = {
  type: JibeType;
  startIndex: number;
  endIndex: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  angleChange: number;
  minSpeed: number; // in km/h
  maxSpeed: number; // in km/h
  avgSpeed: number; // in km/h
};

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
  leisure?: string;
  village?: string;
  county?: string;
  state?: string;
  country_code?: string;
};

export type Session = {
  id?: string;
  metadata: SessionMetadata;
  points: TrackPoint[];
  statistics?: TrackStatistics;
  config: Record<string, unknown>;
};

export interface RawTrackStatistics {
  totalDistance: number; // in meters
  totalTime: number; // in seconds
  startTime: number; // ISO string
  endTime: number; // ISO string
  avgSpeed: number; // in m/s
  maxSpeed: number; // in m/s
  timeAbove10kmh: number; // in seconds
  maxDistanceFromStart: number; // in meters
  longestSequenceAbove10kmh: number; // in seconds
  jibeCount: number;
  tackCount: number;
  flyingJibeCount: number;
  jibes: JibeInfo[];
}

export interface TrackStatistics {
  general: {
    date: Date;
    totalTime: number; // in ms
    startTime: number; // in ms
    endTime: number; // in ms
  };
  speed: {
    avg: number; // e.g. "9.8 km/h"
    max: number; // e.g. "24.2 km/h"
  };
  flying: {
    time: number; // ms
    longestSequence: number; // ms
    percentage: number; // e.g. "59.6%"
  };
  maneuvers: {
    jibes: number;
    tacks: number;
    flyingJibes: number;
    flyingJibePercentage: number; // e.g. "0.0%"
    jibesList: JibeInfo[];
  };
  distance: {
    total: number; // e.g. "20.54 km"
    maxFromStart: number; // e.g. "0.39 km"
  };
}
