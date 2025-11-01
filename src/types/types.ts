export interface FilterTypes {
  dateRange: { start: string; end: string };
  minCaseCount: number | null;
  maxCaseCount: number | null;
  meanTimeRange: { min: number | null; max: number | null };
  weightFilter: "cases" | "mean_time";
  timeUnitFilter: "s" | "m" | "h" | "d" | "w";
}
