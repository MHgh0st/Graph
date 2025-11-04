export interface FilterTypes {
  dateRange: { start: string; end: string };
  minCaseCount: number | null;
  maxCaseCount: number | null;
  meanTimeRange: { min: number | null; max: number | null };
  weightFilter: "cases" | "mean_time";
  timeUnitFilter: "s" | "m" | "h" | "d" | "w";
}

export interface Path {
  nodes: string[];
  edges: string[];
  totalDuration?: number;
  averageDuration?: number;
}

export interface PaletteOption {
  key: string;
  label: string;
  gradient: string;
}
