/**
 * @component SearchCaseIdsCard
 * @module components/sideBarCards/SearchCaseIdsCard
 *
 * @description
 * Sidebar card for single case investigation.
 * Allows searching for a specific case ID to view:
 * - Full path timeline from start to end
 * - Duration statistics and performance comparison
 * - Distribution charts showing percentile position
 *
 * @example
 * ```tsx
 * <SearchCaseIdsCard
 *   filters={currentFilters}
 *   filePath="/path/to/data.csv"
 *   onCaseFound={handleCaseFound}
 * />
 * ```
 */

import { useState, useCallback, memo } from "react";
import { NumberInput } from "@heroui/number-input";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Accordion, AccordionItem } from "@heroui/accordion";
import {
  Search,
  XCircle,
  CheckCircle2,
  Clock,
  MapPin,
  FolderSearch,
  FileText,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  Activity,
  ListStart,
} from "lucide-react";

import type { FilterTypes, SearchCaseIdsData, ExtendedPath } from "../../types/types";
import { formatDuration } from "../../utils/formatDuration";
import ProcessData from "../../utils/ProcessData";
import CaseDistributionCharts from "../graph/ui/CaseDistributionCharts";


interface SearchCaseIdsCardProps {
  filters: FilterTypes;
  filePath: string;
  onCaseFound?: (pathData: ExtendedPath, index: number) => void;
  onSearchResult?: (data: SearchCaseIdsData | null) => void;
}

export default function SearchCaseIdsCard({
  filters,
  filePath,
  onCaseFound,
  onSearchResult,
}: SearchCaseIdsCardProps) {
  const [caseIdInput, setCaseIdInput] = useState<number>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<SearchCaseIdsData | null>(null);
  const [error, setError] = useState<string | null>(null);


  const submit = async () => {
    if (!caseIdInput) {
      setError("لطفاً شناسه پرونده را وارد کنید.");
      return;
    }
    const caseIdNum = Number(caseIdInput);
    setIsLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const response = (await ProcessData(filePath, filters, caseIdNum)) as SearchCaseIdsData;
      setSearchResult(response);
      
      if (onSearchResult) onSearchResult(response);

      if (response.found && response.data && response.data.nodes.length > 0) {
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

  const renderPerformanceStats = () => {
    if (!searchResult?.data?.position_stats) return null;
    
    const stats = searchResult.data.position_stats;
    const isCritical = stats.duration_percentile > 80;
    const isWarning = stats.duration_percentile > 50 && stats.duration_percentile <= 80;
    
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

          {/* کانتینر اصلی نتایج با اسکرول */}
          <div className="flex-1 min-h-0 relative bg-slate-50/50 rounded-xl overflow-x-hidden overflow-y-auto flex flex-col">
            {searchResult?.found && searchResult.data ? (
              <div className="flex flex-col h-full gap-2 p-1">
                
                {/* بخش هدر (اطلاعات ثابت) */}
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        <span className="text-sm font-bold text-slate-700">پرونده یافت شد</span>
                    </div>
                    <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-600 border border-slate-200 shadow-sm text-xs font-mono h-6">Case #{searchResult.data.case_id}</Chip>
                  </div>
                  
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
                </div>

                {/* آکاردئون‌ها */}
                <Accordion 
                    keepContentMounted
                    defaultExpandedKeys={["1"]} // آکاردئون نمودارها پیش‌فرض باز است
                    variant="splitted"
                    itemClasses={{
                        base: "group bg-white border border-slate-100 shadow-sm rounded-2xl px-0",
                        title: "text-sm font-bold text-slate-700",
                        trigger: "py-3 px-4",
                        indicator: "text-slate-400",
                        content: "pb-4 px-1" // فضای داخلی محتوا
                    }}
                >
                    {/* بخش ۱: تحلیل و نمودار */}
                    <AccordionItem 
                        key="1" 
                        aria-label="Charts" 
                        
                        className="overflow-y-auto"
                        title={
                            <div className="flex items-center gap-2">
                                <Activity size={18} className="text-blue-500" />
                                <span>تحلیل و نمودارها</span>
                            </div>
                        }
                    >
                        <div className="px-1 flex flex-col gap-4">
                            {/* Insight Card */}
                            {renderPerformanceStats()}
                            
                            {/* Distribution Charts */}
                            {/* نکته: ارتفاع فیکس دادیم تا اسکرول داخلی نخورد و با اسکرول والد حرکت کند */}
                            <div className="h-[450px] w-full">
                                <CaseDistributionCharts 
                                    searchResult={searchResult} 
                                    filePath={filePath} 
                                    filters={filters}
                                />
                            </div>
                        </div>
                    </AccordionItem>

                    {/* بخش ۲: مسیر زمانی (Timeline) */}
                    <AccordionItem 
                        key="2" 
                        aria-label="Timeline" 
                        title={
                            <div className="flex items-center gap-2">
                                <ListStart size={18} className="text-slate-500" />
                                <span>مسیر زمانی پرونده</span>
                            </div>
                        }
                    >
                        {/* لیست تایم‌لاین */}
                        <div className="px-2">
                            <div className="relative pl-2 pr-4 py-2 border-r-2 border-slate-100 mr-2">
                                {searchResult.data.nodes.map((node, index) => {
                                    const isLast = index === searchResult.data!.nodes.length - 1;
                                    const isFirst = index === 0;
                                    const duration = !isLast ? searchResult.data!.edge_durations[index] : null;
                                    return (
                                        <div key={index} className="relative mb-1">
                                            {/* خط اتصال */}
                                            {!isLast && <div className="absolute top-4 bottom-[-4px] right-[6.5px] w-0.5 bg-slate-200" />}
                                            
                                            <div className="flex items-start gap-3 relative z-10">
                                                {/* دایره نشانگر */}
                                                <div className={`w-4 h-4 rounded-full border-2 shrink-0 bg-white mt-1 z-20 
                                                    ${isFirst ? 'border-emerald-500 ring-2 ring-emerald-50' : 
                                                      isLast ? 'border-rose-500 ring-2 ring-rose-50' : 'border-blue-400'}`} 
                                                />
                                                
                                                <div className="flex-1 min-w-0 pb-4">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-sm ${isFirst || isLast ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                                            {node}
                                                        </span>
                                                        {isFirst && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">شروع</span>}
                                                        {isLast && <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md">پایان</span>}
                                                    </div>

                                                    {/* نمایش زمان */}
                                                    {!isLast && duration !== undefined && (
                                                        <div className="flex justify-start mt-2">
                                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500 font-mono">
                                                                <ArrowDown size={10} />
                                                                {formatDuration(duration)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </AccordionItem>
                </Accordion>

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