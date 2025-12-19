import { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Clock, BarChart2, Activity } from "lucide-react";
import type { SearchCaseIdsData, EdgeStatisticsGlobalData, FilterTypes } from "src/types/types";
import GetEdgeStatisticsData from "../../../utils/GetEdgeStatisticsData";

interface CaseDistributionChartsProps {
  searchResult: SearchCaseIdsData;
  filePath: string;
  filters: FilterTypes;
}

export default function CaseDistributionCharts({
  searchResult,
  filePath,
  filters,
}: CaseDistributionChartsProps) {
  const [globalStatisticsData, setGlobalStatisticsData] = useState<EdgeStatisticsGlobalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch Global Statistics inside the component
  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      if (!filePath || !filters?.dateRange) {
          if (isMounted) setIsLoading(false);
          return;
      }
      
      setIsLoading(true);
      try {
        const globalStats = await GetEdgeStatisticsData(
            filePath, 
            filters.dateRange.start, 
            filters.dateRange.end, 
            'global'
        ) as EdgeStatisticsGlobalData;
        
        if (isMounted) {
            setGlobalStatisticsData(globalStats);
        }
      } catch (error) {
        console.error("Failed to fetch global stats", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStats();

    return () => { isMounted = false; };
  }, [filePath, filters]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)} ثانیه`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} دقیقه`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} ساعت`;
    return `${(seconds / 86400).toFixed(1)} روز`;
  };

  // 2. Prepare Chart Data
  const chartData = useMemo(() => {
    if (!globalStatisticsData || !searchResult?.data) return null;

    // Time Data
    const timeBins = globalStatisticsData.total_time.bins;
    const timeCounts = globalStatisticsData.total_time.counts;
    const timeCategories = timeCounts.map((_, i) => formatDuration(timeBins[i]));
    const caseDuration = searchResult.data.total_duration;
    
    let timeIndex = timeBins.findIndex((bin, i) => {
        if (i === timeBins.length - 1) return caseDuration >= bin;
        return caseDuration >= bin && caseDuration < timeBins[i+1];
    });
    if (timeIndex === -1 && caseDuration >= timeBins[timeBins.length-1]) timeIndex = timeCounts.length - 1;
    if (timeIndex >= timeCounts.length) timeIndex = timeCounts.length - 1;
    if (timeIndex < 0) timeIndex = 0;

    // Steps Data
    const stepBins = globalStatisticsData.steps.bins;
    const stepCounts = globalStatisticsData.steps.counts;
    const stepCategories = stepCounts.map((_, i) => String(stepBins[i]));
    const caseSteps = searchResult.data.nodes.length;
    
    let stepIndex = stepBins.findIndex((bin, i) => {
         if (i === stepBins.length - 1) return caseSteps >= bin;
         return caseSteps >= bin && caseSteps < stepBins[i+1];
    });
    if (stepIndex === -1 && caseSteps >= stepBins[stepBins.length-1]) stepIndex = stepCounts.length - 1;
    if (stepIndex >= stepCounts.length) stepIndex = stepCounts.length - 1;
    if (stepIndex < 0) stepIndex = 0;

    return {
        time: {
            series: [{ name: 'تعداد پرونده‌ها', data: timeCounts }],
            categories: timeCategories,
            annotationX: timeCategories[timeIndex],
            myValueFormatted: formatDuration(caseDuration),
            bins: timeBins // اضافه کردن bins برای دسترسی در تولتیپ
        },
        steps: {
            series: [{ name: 'تعداد پرونده‌ها', data: stepCounts }],
            categories: stepCategories,
            annotationX: stepCategories[stepIndex],
            myValue: caseSteps,
            bins: stepBins // اضافه کردن bins برای دسترسی در تولتیپ
        }
    };
  }, [globalStatisticsData, searchResult]);

  // 3. Chart Options Helper
  const getChartOptions = (
      categories: string[], 
      annotationX: string, 
      color: string, 
      xAxisTitle: string,
      yAxisTitle: string,
      annotationLabel: string,
      tooltipFormatter?: (index: number) => string // اضافه کردن فرمتر اختصاصی
  ): ApexOptions => ({
    chart: {
        type: 'area',
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: { enabled: true, easing: 'easeinout', speed: 800 },
        parentHeightOffset: 0,
    },
    stroke: { curve: 'smooth', width: 2, colors: [color] },
    fill: {
        type: 'gradient',
        gradient: {
            shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100],
            colorStops: [{ offset: 0, color: color, opacity: 0.5 }, { offset: 100, color: color, opacity: 0.1 }]
        }
    },
    dataLabels: { enabled: false },
    xaxis: {
        categories: categories,
        labels: { show: true, rotate: -45, hideOverlappingLabels: true, style: { fontSize: '10px', colors: '#64748b', fontFamily: 'inherit' }, trim: true, maxHeight: 60 },
        axisBorder: { show: true, color: '#e2e8f0' },
        axisTicks: { show: true, color: '#e2e8f0' },
        title: { text: xAxisTitle, style: { fontSize: '11px', color: '#94a3b8', fontWeight: 500 }, offsetY: 5 },
        tooltip: { enabled: false }
    },
    yaxis: {
        show: true,
        labels: { style: { fontSize: '10px', colors: '#64748b', fontFamily: 'inherit' }, formatter: (val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0) },
        title: { text: yAxisTitle, style: { fontSize: '11px', color: '#94a3b8', fontWeight: 500 }, rotate: -90, offsetX: 0 }
    },
    grid: { show: true, borderColor: '#f1f5f9', strokeDashArray: 4, padding: { top: 10, right: 20, bottom: 10, left: 20 } },
    tooltip: { 
        theme: 'light', 
        y: { formatter: (val) => `${val} پرونده` }, 
        x: { 
            show: true,
            // لاجیک فرمتر تولتیپ
            formatter: (val, { dataPointIndex }) => {
                if (tooltipFormatter && typeof dataPointIndex === 'number') {
                    return tooltipFormatter(dataPointIndex);
                }
                return val;
            }
        } 
    },
    annotations: {
        xaxis: [{
            x: annotationX, borderColor: '#ef4444', strokeDashArray: 0, borderWidth: 2, opacity: 1,
            label: {
                borderColor: '#ef4444', style: { color: '#fff', background: '#ef4444', fontSize: '11px', padding: { left: 6, right: 6, top: 4, bottom: 4 }, fontWeight: 'bold', borderRadius: 4, fontFamily: 'inherit' },
                text: annotationLabel, orientation: 'horizontal', position: 'top', offsetY: -15
            }
        }]
    }
  });

  // --- 4. Beautiful Skeleton Loading UI ---
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 w-full h-full animate-pulse">
        {/* Title Skeleton */}
        <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-slate-200 rounded-md"></div>
            <div className="h-4 bg-slate-200 rounded w-40"></div>
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-2 gap-4 h-full">
            {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 h-64 flex flex-col gap-4">
                    {/* Card Header Skeleton */}
                    <div className="flex justify-between items-center">
                        <div className="h-3 bg-slate-200 rounded w-24"></div>
                        <div className="h-3 bg-slate-100 rounded w-8"></div>
                    </div>
                    {/* Chart Area Skeleton */}
                    <div className="flex-1 flex items-end gap-1 pb-2">
                        {/* Fake bars/area visual */}
                        <div className="w-full bg-slate-50 rounded-lg h-full relative overflow-hidden">
                             {/* Gradient overlay for shimmer effect */}
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                             
                             {/* Mocking a graph shape */}
                             <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-slate-100 rounded-t-lg opacity-50"></div>
                             <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-slate-200 rounded-t-lg opacity-50"></div>
                        </div>
                    </div>
                    {/* X-Axis labels skeleton */}
                    <div className="flex justify-between gap-2 px-2">
                        <div className="h-2 bg-slate-100 rounded w-8"></div>
                        <div className="h-2 bg-slate-100 rounded w-8"></div>
                        <div className="h-2 bg-slate-100 rounded w-8"></div>
                        <div className="h-2 bg-slate-100 rounded w-8"></div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  }

  if (!chartData) return null;

  return (
    <div className="flex flex-col gap-4 p-4 w-full h-full">
        <div className="flex items-center gap-2 mb-2">
            <Activity size={18} className="text-slate-500"/>
            <span className="text-sm font-bold text-slate-700">تحلیل توزیع آماری پرونده</span>
        </div>

        <div className="grid grid-cols-2 gap-4 h-full">
            {/* Time Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative flex flex-col h-64">
                <div className="flex items-center justify-between mb-2 shrink-0">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <Clock size={14} className="text-emerald-500"/> توزیع زمان کل
                    </span>
                </div>
                <div className="flex-1 w-full dir-ltr min-h-0">
                    <Chart 
                        options={getChartOptions(
                            chartData.time.categories, 
                            chartData.time.annotationX, 
                            '#10b981', 
                            'بازه زمانی', 
                            'تعداد', 
                            'پرونده شما',
                            // فرمتر بازه زمانی
                            (i) => {
                                const bins = chartData.time.bins;
                                return `بازه: ${formatDuration(bins[i])} تا ${formatDuration(bins[i+1])}`;
                            }
                        )}
                        series={chartData.time.series}
                        type="area"
                        height="100%"
                        width="100%"
                    />
                </div>
            </div>

            {/* Steps Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative flex flex-col h-64">
                <div className="flex items-center justify-between mb-2 shrink-0">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <BarChart2 size={14} className="text-blue-500"/> توزیع تعداد مراحل
                    </span>
                </div>
                <div className="flex-1 w-full dir-ltr min-h-0">
                    <Chart 
                        options={getChartOptions(
                            chartData.steps.categories, 
                            chartData.steps.annotationX, 
                            '#3b82f6', 
                            'تعداد مراحل', 
                            'تعداد', 
                            'پرونده شما',
                            // فرمتر بازه مراحل
                            (i) => {
                                const bins = chartData.steps.bins;
                                return `بازه: ${bins[i]} تا ${bins[i+1]}`;
                            }
                        )}
                        series={chartData.steps.series}
                        type="area"
                        height="100%"
                        width="100%"
                    />
                </div>
            </div>
        </div>
    </div>
  );
}