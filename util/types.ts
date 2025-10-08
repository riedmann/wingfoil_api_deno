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

export interface TrackStatistics {
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

export type SegmentType = "straight" | "tack" | "jibe" | "slow" | "flightjibe";

export interface TrackStatistics {
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
