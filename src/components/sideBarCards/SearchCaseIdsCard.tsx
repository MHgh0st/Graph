import { useEffect, useState, useMemo } from "react";
import { NumberInput } from "@heroui/number-input";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { ScrollShadow } from "@heroui/scroll-shadow";
import Chart from "react-apexcharts"; 
import { ApexOptions } from "apexcharts";
import { 
  Search, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  FolderSearch,
  FileText,
  ArrowDown,
  Activity,
  BarChart2,
  TrendingUp,   // آیکون برای روند افزایشی (کندتر)
  TrendingDown, // آیکون برای روند کاهشی (سریع‌تر)
  AlertCircle,  // آیکون هشدار
  Info          // آیکون اطلاعات
} from "lucide-react";

import type { FilterTypes, SearchCaseIdsData, ExtendedPath, EdgeStatisticsGlobalData } from "src/types/types";
import ProcessData from "../../utils/ProcessData";
import GetEdgeStatisticsData from "../../utils/GetEdgeStatisticsData";

interface SearchCaseIdsCardProps {
  filters: FilterTypes;
  filePath: string;
  onCaseFound?: (pathData: ExtendedPath, index: number) => void;
}

export default function SearchCaseIdsCard({
  filters,
  filePath,
  onCaseFound,
}: SearchCaseIdsCardProps) {
  const [caseIdInput, setCaseIdInput] = useState<number>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<SearchCaseIdsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [globalStatisticsData, setGlobalStatisticsData] = useState<EdgeStatisticsGlobalData | null>(null);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)} ثانیه`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} دقیقه`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} ساعت`;
    return `${(seconds / 86400).toFixed(1)} روز`;
  };

  const submit = async () => {
    if (!caseIdInput) {
      setError("لطفاً شناسه پرونده را وارد کنید.");
      return;
    }
    const caseIdNum = Number(caseIdInput);
    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    setGlobalStatisticsData(null); 

    try {
      const response = (await ProcessData(filePath, filters, caseIdNum)) as SearchCaseIdsData;
      setSearchResult(response);

      if (response.found && response.data && response.data.nodes.length > 0) {
        const globalStats = await GetEdgeStatisticsData(
            filePath, 
            filters.dateRange.start, 
            filters.dateRange.end, 
            'global'
        ) as EdgeStatisticsGlobalData;
        setGlobalStatisticsData(globalStats);

        if (onCaseFound) {
          const edgeStats: Record<string, { sum: number; count: number }> = {};
          const nodes = response.data.nodes;
          const durations = response.data.edge_durations;
          for (let i = 0; i < nodes.length - 1; i++) {
             const source = nodes[i];
             const target = nodes[i+1];
             const edgeId = `${source}->${target}`; 
             const duration = durations[i];
             if (duration !== undefined) {
                 if (!edgeStats[edgeId]) edgeStats[edgeId] = { sum: 0, count: 0 };
                 edgeStats[edgeId].sum += duration;
                 edgeStats[edgeId].count += 1;
             }
          }
          const specificDurations: Record<string, number> = {};
          Object.keys(edgeStats).forEach((edgeId) => {
              const stat = edgeStats[edgeId];
              specificDurations[edgeId] = stat.sum / stat.count;
          });
          const pathForGraph: ExtendedPath = {
            nodes: response.data.nodes,
            edges: Object.keys(specificDurations), 
            averageDuration: response.data.total_duration,
            _frequency: 1,
            _startIndex: 0,
            _endIndex: response.data.nodes.length - 1,
            _pathType: "absolute",
            _fullPathNodes: response.data.nodes,
            _variantTimings: response.data.edge_durations,
            _specificEdgeDurations: specificDurations, 
          };
          onCaseFound(pathForGraph, 0);
        }
      } else {
        setError("پرونده‌ای با این شناسه در بازه زمانی فعلی یافت نشد.");
      }
    } catch (err: any) {
       console.error(err);
       setError("خطایی در دریافت اطلاعات رخ داد.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  // --- Chart Preparation Logic ---
  const chartData = useMemo(() => {
    if (!globalStatisticsData || !searchResult?.data) return null;

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
            myValueFormatted: formatDuration(caseDuration)
        },
        steps: {
            series: [{ name: 'تعداد پرونده‌ها', data: stepCounts }],
            categories: stepCategories,
            annotationX: stepCategories[stepIndex], 
            myValue: caseSteps
        }
    };
  }, [globalStatisticsData, searchResult]);

  // --- Chart Options ---
  const getChartOptions = (
      categories: string[], 
      annotationX: string, 
      color: string, 
      xAxisTitle: string,
      yAxisTitle: string,
      annotationLabel: string
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
    tooltip: { theme: 'light', y: { formatter: (val) => `${val} پرونده` }, x: { show: true } },
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

  // --- Helper to render Performance Stats ---
  const renderPerformanceStats = () => {
    if (!searchResult?.data?.position_stats) return null;
    
    const stats = searchResult.data.position_stats;
    const isCritical = stats.duration_percentile > 80;
    const isWarning = stats.duration_percentile > 50 && stats.duration_percentile <= 80;
    
    // تعیین استایل و آیکون بر اساس وضعیت
    let styleClass = "bg-slate-50 text-slate-600 border-slate-200";
    let icon = <Info size={16} />;
    let title = "عملکرد نرمال";
    let desc = "زمان اجرای این پرونده در محدوده میانگین است.";

    if (isCritical) {
        styleClass = "bg-rose-50 text-rose-700 border-rose-200";
        icon = <AlertCircle size={16} />;
        title = "عملکرد بحرانی (کند)";
        desc = `این پرونده از ${stats.duration_percentile.toFixed(0)}٪ کل پرونده‌ها کندتر است.`;
    } else if (isWarning) {
        styleClass = "bg-amber-50 text-amber-700 border-amber-200";
        icon = <TrendingUp size={16} />;
        title = "کندتر از میانگین";
        desc = `این پرونده از ${stats.duration_percentile.toFixed(0)}٪ پرونده‌ها طولانی‌تر شده است.`;
    } else {
        styleClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
        icon = <TrendingDown size={16} />;
        title = "عملکرد سریع";
        desc = `این پرونده سریع‌تر از ${(100 - stats.duration_percentile).toFixed(0)}٪ موارد مشابه انجام شده است.`;
    }

    return (
        <div className={`mt-2 p-3 rounded-xl border ${styleClass} flex flex-col gap-1`}>
            <div className="flex items-center gap-2 font-bold text-xs">
                {icon}
                <span>{title}</span>
            </div>
            <p className="text-[11px] opacity-90 leading-5">
                {desc}
                {stats.is_slower_than_average && isCritical && (
                    <span className="block mt-1 font-semibold opacity-100">• زمان کل بیشتر از میانگین جامعه آماری است.</span>
                )}
            </p>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {filters?.dateRange.start && filters?.dateRange.end ? (
        <>
          <div className="flex items-center gap-2 px-1 shrink-0">
             <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg"><FolderSearch size={18} /></div>
             <div>
                <h3 className="font-bold text-sm text-slate-800">جستجوی پرونده</h3>
                <span className="text-[10px] text-slate-400 block">رهگیری فرآیند یک مورد خاص</span>
             </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-2">
              <NumberInput
                placeholder="شماره پرونده"
                value={caseIdInput}
                onValueChange={setCaseIdInput}
                onKeyDown={handleKeyDown}
                isDisabled={isLoading}
                formatOptions={{ useGrouping: false }}
                minValue={0}
                hideStepper
                isClearable
                variant="flat"
                size="sm"
                classNames={{ inputWrapper: "h-10 bg-slate-50 border border-slate-200 hover:bg-slate-100 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-200 shadow-none", input: "text-right" }}
                startContent={<span className="text-slate-400 text-xs font-mono">#</span>}
              />
              <Button isIconOnly color="primary" variant="shadow" onPress={submit} isLoading={isLoading} size="sm" className="h-10 w-10 min-w-10 rounded-xl bg-blue-500 shadow-blue-200">
                {!isLoading && <Search size={18} />}
              </Button>
            </div>
            {error && (<div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs flex items-start gap-2 border border-rose-100"><XCircle size={16} className="shrink-0 mt-0.5" /><span>{error}</span></div>)}
          </div>

          <Divider className="bg-slate-100" />

          <div className="flex-1 min-h-0 relative bg-white rounded-xl border border-slate-100 overflow-x-hidden overflow-y-auto flex flex-col">
            {searchResult?.found && searchResult.data ? (
              <div className="flex flex-col h-full">
                
                {/* Result Header */}
                <div className="p-4 bg-white border-b border-slate-100 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        <span className="text-sm font-bold text-slate-700">پرونده یافت شد</span>
                    </div>
                    <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-600 border border-slate-200 shadow-sm text-xs font-mono h-6">Case #{searchResult.data.case_id}</Chip>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                        <div className="p-1.5 bg-white text-emerald-600 rounded-md border border-slate-100 shadow-sm"><Clock size={14} /></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400">مدت زمان</span>
                            <span className="text-xs font-bold text-slate-700 font-mono dir-ltr text-right">{formatDuration(searchResult.data.total_duration)}</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                        <div className="p-1.5 bg-white text-blue-600 rounded-md border border-slate-100 shadow-sm"><MapPin size={14} /></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400">مراحل</span>
                            <span className="text-xs font-bold text-slate-700">{searchResult.data.nodes.length} فعالیت</span>
                        </div>
                    </div>
                  </div>

                  {/* --- NEW: Performance Insight Card --- */}
                  {renderPerformanceStats()}

                </div>

                {/* --- Charts Area --- */}
                {chartData && (
                    <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={16} className="text-slate-500"/>
                            <span className="text-sm font-bold text-slate-700">جایگاه پرونده در توزیع آماری</span>
                        </div>
                        
                        <div className="flex flex-col gap-6 w-full">
                            {/* Time Chart */}
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                        <Clock size={14} className="text-emerald-500"/> توزیع زمان کل
                                    </span>
                                </div>
                                <div className="h-[280px] w-full dir-ltr">
                                    <Chart 
                                        options={getChartOptions(
                                            chartData.time.categories, 
                                            chartData.time.annotationX, 
                                            '#10b981', 
                                            'بازه زمانی',
                                            'تعداد پرونده',
                                            'پرونده شما'
                                        )}
                                        series={chartData.time.series}
                                        type="area"
                                        height="100%"
                                        width="100%"
                                    />
                                </div>
                            </div>
                            
                            {/* Steps Chart */}
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                        <BarChart2 size={14} className="text-blue-500"/> توزیع تعداد مراحل
                                    </span>
                                </div>
                                <div className="h-[280px] w-full dir-ltr">
                                    <Chart 
                                        options={getChartOptions(
                                            chartData.steps.categories, 
                                            chartData.steps.annotationX, 
                                            '#3b82f6', 
                                            'تعداد مراحل',
                                            'تعداد پرونده',
                                            'پرونده شما'
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
                )}

                {/* Timeline Path */}
                <ScrollShadow className="flex-1 p-4 bg-slate-50/30 min-h-[400px]">
                  <div className="relative pl-2 pr-4">
                    <div className="absolute top-3 bottom-3 right-[7px] w-0.5 bg-slate-200" />
                    {searchResult.data.nodes.map((node, index) => {
                        const isLast = index === searchResult.data!.nodes.length - 1;
                        const isFirst = index === 0;
                        const duration = !isLast ? searchResult.data!.edge_durations[index] : null;
                        return (
                            <div key={index} className="relative">
                                <div className="flex items-start gap-3 relative z-10">
                                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 bg-white mt-1 ${isFirst ? 'border-emerald-500 ring-2 ring-emerald-100' : isLast ? 'border-rose-500 ring-2 ring-rose-100' : 'border-blue-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-sm ${isFirst || isLast ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{node}</span>
                                            {isFirst && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">شروع</span>}
                                            {isLast && <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md">پایان</span>}
                                        </div>
                                    </div>
                                </div>
                                {!isLast && duration !== undefined && duration !== null && (
                                    <div className="flex justify-start pr-[0.15rem] my-3 relative z-20">
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-sm text-[10px] text-slate-500 font-mono hover:border-blue-300 transition-colors">
                                            <span className="text-slate-300"><ArrowDown size={10} /></span>
                                            {formatDuration(duration)}
                                        </div>
                                    </div>
                                )}
                                {!isLast && (duration === undefined || duration === null) && (<div className="h-6" />)}
                            </div>
                        );
                    })}
                  </div>
                </ScrollShadow>
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center opacity-60">
                    <FileText size={48} className="text-slate-300" />
                    <p className="text-slate-400 text-xs leading-5">شماره پرونده مورد نظر را وارد کنید تا مسیر دقیق طی شده و زمان‌بندی آن را مشاهده کنید.</p>
                </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <Clock size={32} className="opacity-50" />
            <p className="text-xs font-medium">لطفاً ابتدا بازه زمانی را در تب "فیلترها" مشخص کنید.</p>
        </div>
      )}
    </div>
  );
}