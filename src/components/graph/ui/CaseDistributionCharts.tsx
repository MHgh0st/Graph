import { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Clock, BarChart2, Activity } from "lucide-react";
import { Button } from "@heroui/button";
import type { SearchCaseIdsData, EdgeStatisticsGlobalData, FilterTypes } from "src/types/types";
import GetEdgeStatisticsData from "../../../utils/GetEdgeStatisticsData";

interface CaseDistributionChartsProps {
  searchResult: SearchCaseIdsData;
  filePath: string;
  filters: FilterTypes;
}

type ChartType = 'time' | 'steps';

export default function CaseDistributionCharts({
  searchResult,
  filePath,
  filters,
}: CaseDistributionChartsProps) {
  const [globalStatisticsData, setGlobalStatisticsData] = useState<EdgeStatisticsGlobalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChart, setActiveChart] = useState<ChartType>('time');

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
            bins: timeBins
        },
        steps: {
            series: [{ name: 'تعداد پرونده‌ها', data: stepCounts }],
            categories: stepCategories,
            annotationX: stepCategories[stepIndex],
            myValue: caseSteps,
            bins: stepBins
        }
    };
  }, [globalStatisticsData, searchResult]);

  const getChartOptions = (
      categories: string[], 
      annotationX: string, 
      color: string, 
      xAxisTitle: string,
      yAxisTitle: string,
      annotationLabel: string,
      tooltipFormatter?: (index: number) => string
  ): ApexOptions => ({
    chart: {
        type: 'area',
        toolbar: { show: false },
        animations: { enabled: true, easing: 'easeinout', speed: 800 },
        parentHeightOffset: 0,
        width: '100%'
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
        type: 'category', 
        categories: categories,
        labels: { 
            show: true, 
            rotate: -45, 
            hideOverlappingLabels: false, 
            style: { fontSize: '10px', colors: '#64748b'}, 
            trim: true, 
            maxHeight: 60,
            formatter: (val, timestamp, opts) => {
                const index = opts?.i;
                if (typeof index === 'undefined') return val;
                
                const total = categories.length;
                if (total < 12) return val; 

                const step = Math.ceil(total / 8);
                
                if (index % step === 0) return val;
                return '';
            }
        },
        tickAmount: 8,
        axisBorder: { show: true, color: '#e2e8f0' },
        axisTicks: { show: true, color: '#e2e8f0' },
        title: { text: xAxisTitle, style: { fontSize: '11px', color: '#94a3b8', fontWeight: 500 }, offsetY: 5 },
        tooltip: { enabled: false }
    },
    yaxis: {
        show: true,
        labels: { style: { fontSize: '10px', colors: '#64748b' }, formatter: (val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val.toFixed(0) },
        title: { text: yAxisTitle, style: { fontSize: '11px', color: '#94a3b8', fontWeight: 500 }, rotate: -90, offsetX: 0 }
    },
    grid: { show: true, borderColor: '#f1f5f9', strokeDashArray: 4, padding: { top: 10, right: 20, bottom: 10, left: 20 } },
    
    // --- اصلاح تولتیپ برای نمایش راست‌چین و زیبا ---
    tooltip: { 
        theme: 'light',
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
            const value = series[seriesIndex][dataPointIndex];
            let label = w.globals.labels[dataPointIndex];
            
            // استفاده از فرمتر سفارشی اگر وجود داشته باشد
            if (tooltipFormatter) {
                label = tooltipFormatter(dataPointIndex);
            }

            // ساخت HTML سفارشی برای تولتیپ
            return `
                <div class="px-3 py-2 bg-white border border-slate-200 shadow-lg rounded-lg text-right font-vazir" style="direction: rtl;">
                    <div class="text-[10px] text-slate-500 mb-1 border-b border-slate-100 pb-1">
                        ${label}
                    </div>
                    <div class="flex items-center justify-between gap-3 text-xs">
                        <span class="text-slate-600 font-medium">تعداد پرونده:</span>
                        <span class="font-bold" style="color: ${color}; direction: ltr;">${value}</span>
                    </div>
                </div>
            `;
        }
    },

    annotations: {
        xaxis: [{
            x: annotationX, borderColor: '#ef4444', strokeDashArray: 0, borderWidth: 2, opacity: 1,
            label: {
                borderColor: '#ef4444', style: { color: '#fff', background: '#ef4444', fontSize: '11px', padding: { left: 6, right: 6, top: 4, bottom: 4 }, fontWeight: 'bold', borderRadius: 4 },
                text: annotationLabel, orientation: 'horizontal', position: 'top', offsetY: -15
            }
        }]
    }
  });

  // --- Beautiful Skeleton Loading UI ---
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-2 w-full h-full animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-slate-200 rounded-md"></div>
                <div className="h-4 bg-slate-200 rounded w-24"></div>
            </div>
            <div className="flex gap-1">
                <div className="h-7 w-16 bg-slate-200 rounded-lg"></div>
                <div className="h-7 w-16 bg-slate-200 rounded-lg"></div>
            </div>
        </div>

        {/* Chart Skeleton */}
        <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4 relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] z-10"></div>
             <div className="flex items-end justify-between h-full gap-2 pt-8 pb-2">
                 <div className="w-full bg-slate-100 rounded-t-md h-[30%]"></div>
                 <div className="w-full bg-slate-100 rounded-t-md h-[50%]"></div>
                 <div className="w-full bg-slate-100 rounded-t-md h-[70%]"></div>
                 <div className="w-full bg-slate-100 rounded-t-md h-[40%]"></div>
                 <div className="w-full bg-slate-100 rounded-t-md h-[60%]"></div>
                 <div className="w-full bg-slate-100 rounded-t-md h-[80%]"></div>
                 <div className="w-full bg-slate-100 rounded-t-md h-[45%]"></div>
                 <div className="w-full bg-slate-100 rounded-t-md h-[25%]"></div>
             </div>
             <div className="absolute bottom-2 left-4 right-4 h-1 bg-slate-200"></div>
        </div>
      </div>
    );
  }

  if (!chartData) return null;

  return (
    <div className="flex flex-col gap-3 p-2 w-full h-full">
        {/* --- Header & Tabs --- */}
        <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-slate-700">
                <Activity size={18} className="text-blue-500"/>
                <span className="text-sm font-bold">تحلیل توزیع</span>
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <Button 
                    size="sm" 
                    variant={activeChart === 'time' ? "solid" : "light"}
                    color={activeChart === 'time' ? "success" : "default"}
                    className={`h-7 text-xs font-medium rounded-lg ${activeChart === 'time' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}
                    startContent={<Clock size={14} />}
                    onPress={() => setActiveChart('time')}
                >
                    زمان
                </Button>
                <Button 
                    size="sm"
                    variant={activeChart === 'steps' ? "solid" : "light"}
                    color={activeChart === 'steps' ? "primary" : "default"}
                    className={`h-7 text-xs font-medium rounded-lg ${activeChart === 'steps' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                    startContent={<BarChart2 size={14} />}
                    onPress={() => setActiveChart('steps')}
                >
                    مراحل
                </Button>
            </div>
        </div>

        {/* --- Chart Area --- */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm relative overflow-hidden">
            
            {/* Time Chart */}
            <div className={`w-full h-full transition-opacity duration-300 ${activeChart === 'time' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                <Chart 
                    options={getChartOptions(
                        chartData.time.categories, 
                        chartData.time.annotationX, 
                        '#10b981', 
                        'بازه زمانی', 
                        'تعداد پرونده', 
                        'پرونده شما',
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

            {/* Steps Chart */}
            <div className={`w-full h-full transition-opacity duration-300 ${activeChart === 'steps' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                <Chart 
                    options={getChartOptions(
                        chartData.steps.categories, 
                        chartData.steps.annotationX, 
                        '#3b82f6', 
                        'تعداد مراحل', 
                        'تعداد پرونده', 
                        'پرونده شما',
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
  );
}