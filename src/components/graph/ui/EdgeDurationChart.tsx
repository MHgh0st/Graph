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
    
    // ساخت لیبل‌های بازه‌ای (مثلاً: 0s - 5m)
    const categories = counts.map((_, i) => {
        const start = formatDuration(bins[i]);
        // const end = formatDuration(bins[i+1]); 
        return start; // فعلاً فقط نقطه شروع را نشان می‌دهیم تا شلوغ نشود (تولتیپ بازه کامل را نشان می‌دهد)
    });
    
    // پیدا کردن ایندکس
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
        // داده‌های اضافه برای استفاده در تولتیپ و Annotation
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
        fontFamily: 'inherit',
        sparkline: { enabled: false }, // حتماً باید false باشد تا محورها دیده شوند
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
    // --- تنظیمات مهم محور X ---
    xaxis: {
        type: 'category', // <--- این خط مشکل نمایش اعداد صحیح را حل می‌کند
        categories: chartConfig?.categories || [],
        labels: { 
            show: true,
            rotate: -45,
            style: { fontSize: '9px', colors: '#94a3b8', fontFamily: 'inherit' },
            trim: true,
            maxHeight: 40,
            // فقط هر چند تا یکی را نشان بده تا محور شلوغ نشود
            formatter: (val) => val 
        },
        tickAmount: 5, // تعداد تیک‌ها را محدود کن
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
        crosshairs: { show: false }
    },
    yaxis: {
        show: true,
        labels: { 
            show: true,
            style: { fontSize: '9px', colors: '#94a3b8', fontFamily: 'inherit' },
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
        x: { 
            show: true, 
            // در تولتیپ بازه کامل را نشان می‌دهیم
            formatter: (_val, { dataPointIndex, w }) => {
                if (!chartConfig?.bins) return _val;
                const i = dataPointIndex;
                const start = formatDuration(chartConfig.bins[i]);
                const end = formatDuration(chartConfig.bins[i+1]);
                return `بازه: ${start} تا ${end}`;
            }
        },
        y: { 
            title: { formatter: () => 'تعداد پرونده:' } 
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
                    fontFamily: 'inherit'
                },
                text: 'پرونده انتخابی',
                orientation: 'horizontal',
                position: 'top',
                offsetY: -5
            }
        }]
    }
  };

  if (isLoading) return <div className="h-24 w-full animate-pulse bg-slate-50 rounded-md mt-2"></div>;
  if (!chartConfig) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1 mb-2 text-[10px] text-slate-500 font-bold">
            <Activity size={12} />
            <span>توزیع زمان در این مرحله</span>
        </div>
        {/* کانتینر نمودار */}
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