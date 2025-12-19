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

export interface ExtendedPath extends Path {
  _variantDuration?: number; 
  _frequency?: number;
  _fullPathNodes?: string[];
  _startIndex?: number; 
  _endIndex?: number; 
  _pathType?: "absolute" | "relative";
  _variantTimings?: number[];
  _specificEdgeDurations?: Record<string, number>;
}

export interface PaletteOption {
  key: string;
  label: string;
  gradient: string;
}

export type SidebarTab = "Filter" | "Routing" | "Settings" | "Nodes" | "Outliers" | "SearchCaseIds";

export interface GraphData {
  Source_Activity: string;
  Target_Activity: string;
  Mean_Duration_Seconds: number;
  Tooltip_Total_Time: string;
  Tooltip_Mean_Time: string;
  Weight_Value: number;
  Edge_Label: string;
  Case_Count: number;
}
export interface Variant {
  Variant_Path: string[];
  Frequency: number;
  Avg_Timings: number[];
  Total_Timings: number[];
  Percentage: number;
}
export interface ProcessMiningData {
  graphData: GraphData[];
  variants: Variant[];
  outliers: Variant[];
  startActivities: string[];
  endActivities: string[];
}

export interface SearchCaseIdsData{
  found: boolean;
  data?: {
    nodes: string[];
    edge_durations: number[];
    total_duration: number;
    case_id: number;
    position_stats: {
      duration_percentile: number;
      is_slower_than_average: boolean;
    }
  }
}

export interface HistogramData {
  bins: number[];   
  counts: number[]; 
}

export interface EdgeStatisticsGlobalData{
  total_time: HistogramData;
  steps: HistogramData;
}

export interface NodeTooltipType{
  edgeId: string; label: string; weight: string | number ; direction: 'incoming' | 'outgoing'
}