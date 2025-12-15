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
  _variantDuration?: number; // زمان دقیق محاسبه شده از واریانت
  _frequency?: number;
  _fullPathNodes?: string[]; // لیست تمام گره‌های این واریانت
  _startIndex?: number; // ایندکس گره شروع در مسیر کامل
  _endIndex?: number; // ایندکس گره پایان در مسیر کامل
  _pathType?: "absolute" | "relative";
  _variantTimings?: number[];
}

export interface PaletteOption {
  key: string;
  label: string;
  gradient: string;
}

export type SidebarTab = "Filter" | "Routing" | "Settings" | "Nodes" | "Outliers";

export interface GraphData {
  Source_Activity: string;
  Target_Activity: string;
  Mean_Duration_Seconds: number;
  Tooltip_Total_Time: string;
  Tooltip_Mean_Time: string;
  Weight_Value: number;
  Edge_Label: string;
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

export interface NodeTooltipType{
  edgeId: string; label: string; weight: string | number ; direction: 'incoming' | 'outgoing'
}