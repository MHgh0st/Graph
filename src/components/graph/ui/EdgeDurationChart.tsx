import { useEffect, useState, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { Activity } from "lucide-react";
import type { FilterTypes, HistogramData } from "src/types/types";
import GetEdgeStatisticsData from "../../../utils/GetEdgeStatisticsData";

interface EdgeDurationChartProps {
  source: string;
  target: string;
  duration: number;
  filePath: string;
  filters: FilterTypes;
}

export default function EdgeDurationChart({
  source,
  target,
  duration,
  filePath,
  filters,
}: EdgeDurationChartProps) {
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      if (!filePath || !filters?.dateRange || !source || !target) return;
      
      setIsLoading(true);
      try {
        const stats = await GetEdgeStatisticsData(
            filePath, 
            filters.dateRange.start, 
            filters.dateRange.end, 
            'specific',
            source,
            target
        ) as HistogramData;
        
        if (isMounted) {
            setHistogramData(stats);
        }
      } catch (error) {
        console.error("Failed to fetch edge stats", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStats();

    return () => { isMounted = false; };
  }, [filePath, filters, source, target]);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)} ثانیه`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(0)} دقیقه`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} ساعت`;
    return `${(seconds / 86400).toFixed(1)} روز`;
  };

  const chartConfig = useMemo(() => {
    if (!histogramData || !histogramData.bins.length) return null;

    const bins = histogramData.bins;
    const counts = histogramData.counts;
    
    const categories = counts.map((_, i) => formatDuration(bins[i]));
    
    let index = bins.findIndex((bin, i) => {
        if (i === bins.length - 1) return duration >= bin;
        return duration >= bin && duration < bins[i+1];
    });
    
    if (index === -1 && duration >= bins[bins.length-1]) index = counts.length - 1;
    if (index >= counts.length) index = counts.length - 1;
    if (index < 0) index = 0;

    return {
        series: [{ name: 'تعداد پرونده‌ها', data: counts }],
        categories,
        bins, 
        selectedIndex: index,
        annotationX: categories[index],
        myValueFormatted: formatDuration(duration)
    };
  }, [histogramData, duration]);

  const options: ApexOptions = {
    chart: {
        type: 'area',
        toolbar: { show: false },
        sparkline: { enabled: false },
        animations: { enabled: true },
        parentHeightOffset: 0,
        zoom: { enabled: false }
    },
    stroke: {
        curve: 'smooth',
        width: 2,
    },
    fill: {
        type: 'gradient',
        gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.5,
            opacityTo: 0.1,
            stops: [0, 100]
        }
    },
    colors: ['#64748b'],
    dataLabels: { enabled: false },
    xaxis: {
        type: 'category',
        categories: chartConfig?.categories || [],
        labels: { 
            show: true,
            rotate: -45,
            style: { fontSize: '9px', colors: '#94a3b8' },
            trim: true,
            maxHeight: 40,
            // --- تغییر اصلی: مدیریت هوشمند لیبل‌ها ---
            formatter: (val, timestamp, opts) => {
                const index = opts?.i;
                if (typeof index === 'undefined') return val;

                const total = chartConfig?.categories.length || 0;
                
                if (total < 8) return val;

                const step = Math.ceil(total / 6);

                if (index % step === 0) return val;
                
                return '';
            }
        },
        tickAmount: 6,
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
        crosshairs: { show: false }
    },
    yaxis: {
        show: true,
        labels: { 
            show: true,
            style: { fontSize: '9px', colors: '#94a3b8' },
            formatter: (val) => val.toFixed(0),
            offsetX: -5
        },
    },
    grid: {
        show: true,
        borderColor: '#f1f5f9',
        padding: { top: 0, right: 10, bottom: 5, left: 10 }
    },
    tooltip: {
        theme: 'light',
        fixed: { enabled: false },
        // --- اصلاح تولتیپ به صورت راست‌چین ---
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
            const value = series[seriesIndex][dataPointIndex];
            
            // پیدا کردن لیبل بازه زمانی
            let label = w.globals.labels[dataPointIndex];
            if (chartConfig?.bins) {
                const start = formatDuration(chartConfig.bins[dataPointIndex]);
                const end = formatDuration(chartConfig.bins[dataPointIndex + 1]);
                label = `بازه: ${start} تا ${end}`;
            }

            return `
                <div class="px-3 py-2 bg-white border border-slate-200 shadow-lg rounded-lg text-right font-vazir" style="direction: rtl;">
                    <div class="text-[10px] text-slate-500 mb-1 border-b border-slate-100 pb-1">
                        ${label}
                    </div>
                    <div class="flex items-center justify-between gap-3 text-xs">
                        <span class="text-slate-600 font-medium">تعداد پرونده:</span>
                        <span class="font-bold text-slate-700" style=" direction: ltr;">${value}</span>
                    </div>
                </div>
            `;
        },
        marker: { show: true }
    },
    annotations: {
        xaxis: [{
            x: chartConfig?.annotationX,
            borderColor: '#3b82f6',
            strokeDashArray: 0,
            borderWidth: 2,
            opacity: 1,
            label: {
                borderColor: '#3b82f6',
                style: { 
                    color: '#fff', 
                    background: '#3b82f6', 
                    fontSize: '9px', 
                    padding: { left: 4, right: 4, top: 2, bottom: 2 },
                    fontWeight: 'bold',
                    borderRadius: 2,
                },
                text: 'پرونده انتخابی',
                orientation: 'horizontal',
                position: 'top',
                offsetY: -5
            }
        }]
    }
  };

  // --- Improved Skeleton Loading UI ---
  if (isLoading) {
    return (
      <div className="mt-3 pt-3 border-t border-slate-100 animate-pulse">
        {/* Title Placeholder */}
        <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
            <div className="w-28 h-2.5 bg-slate-200 rounded"></div>
        </div>

        {/* Chart Area Placeholder */}
        <div className="h-28 w-full bg-slate-50 rounded-lg relative overflow-hidden">
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite] z-10"></div>
            
            {/* Mocking Shapes (Fake bars/area) */}
            <div className="absolute bottom-0 left-4 w-6 h-12 bg-slate-200 rounded-t opacity-60"></div>
            <div className="absolute bottom-0 left-12 w-6 h-20 bg-slate-200 rounded-t opacity-60"></div>
            <div className="absolute bottom-0 left-20 w-6 h-8 bg-slate-200 rounded-t opacity-60"></div>
            <div className="absolute bottom-0 right-16 w-6 h-16 bg-slate-200 rounded-t opacity-60"></div>
            <div className="absolute bottom-0 right-6 w-6 h-10 bg-slate-200 rounded-t opacity-60"></div>
            
            {/* Base line */}
            <div className="absolute bottom-0 w-full h-1 bg-slate-200"></div>
        </div>

        {/* Labels Placeholder */}
        <div className="flex justify-between px-2 mt-2">
            <div className="w-8 h-2 bg-slate-100 rounded"></div>
            <div className="w-8 h-2 bg-slate-100 rounded"></div>
            <div className="w-8 h-2 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!chartConfig) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1 mb-2 text-[10px] text-slate-500 font-bold">
            <Activity size={12} />
            <span>توزیع زمان در این مرحله</span>
        </div>
        <div className="h-32 w-full dir-ltr -ml-2">
            <Chart 
                options={options} 
                series={chartConfig.series} 
                type="area" 
                height="100%" 
                width="100%" 
            />
        </div>
    </div>
  );
}