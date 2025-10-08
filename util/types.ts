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
    bearingChange:number;
    isFlyJybe?:boolean;
  };

  export type TrackPoint = {
    lat: number;
    lon: number;
    speed?: number;
    time: string;
    distance?: number;
    hr?: number;
  };

  export type Session = {
    id: string;
    name: string;
    date: string;
    location: string;
    country:string;
    village:string;
    hamlet:string;
    points: TrackPoint[];
    statistics?: TrackStatistics;
  }
  export interface TrackStatistics {
    totalDistance: number;              // in meters
    totalTime: number;                  // in seconds
    avgSpeed: number;                   // in m/s
    maxSpeed: number;                   // in m/s
    timeAbove10kmh: number;            // in seconds
    maxDistanceFromStart: number;      // in meters
    longestSequenceAbove10kmh: number; // in seconds
    jibeCount: number;
    tackCount: number;
    flyingJibeCount: number;
  }
  
  export type SegmentType = 'straight' | 'tack' | 'jibe' | 'slow' | 'flightjibe';
  
 

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