import { useState } from "react";
import { NumberInput } from "@heroui/number-input";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { 
  Search, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  FolderSearch,
  FileText,
  ArrowDown
} from "lucide-react";

import type { FilterTypes, SearchCaseIdsData, ExtendedPath } from "src/types/types";
import ProcessData from "../../utils/ProcessData";

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

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)} ثانیه`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} دقیقه`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} ساعت`;
    return `${(seconds / 86400).toFixed(2)} روز`;
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

    try {
      const response = (await ProcessData(
        filePath,
        filters,
        caseIdNum
      )) as SearchCaseIdsData;

      setSearchResult(response);

      if (response.found && response.data && response.data.nodes.length > 0) {
        if (onCaseFound) {
          const specificDurations: Record<string, number> = {};
          const nodes = response.data.nodes;
          const durations = response.data.edge_durations;

          for (let i = 0; i < nodes.length - 1; i++) {
             const source = nodes[i];
             const target = nodes[i+1];
             const edgeId = `${source}->${target}`; 
             
             if (durations[i] !== undefined) {
                 specificDurations[edgeId] = durations[i];
             }
          }

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
      setError(err.message || "خطایی در جستجو رخ داد.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submit();
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {filters?.dateRange.start && filters?.dateRange.end ? (
        <>
          {/* --- Header --- */}
          <div className="flex items-center gap-2 px-1 shrink-0">
             <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
                <FolderSearch size={18} />
             </div>
             <div>
                <h3 className="font-bold text-sm text-slate-800">جستجوی پرونده</h3>
                <span className="text-[10px] text-slate-400 block">رهگیری فرآیند یک مورد خاص</span>
             </div>
          </div>

          {/* --- Input Area --- */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-2">
              <NumberInput
                placeholder="شماره پرونده (مثال: 1001)"
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
                classNames={{
                  inputWrapper: "h-10 bg-slate-50 border border-slate-200 hover:bg-slate-100 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-200 shadow-none",
                  input: "text-right"
                }}
                startContent={<span className="text-slate-400 text-xs font-mono">#</span>}
              />
              <Button
                isIconOnly
                color="primary"
                variant="shadow"
                onPress={submit}
                isLoading={isLoading}
                size="sm"
                className="h-10 w-10 min-w-10 rounded-xl bg-blue-500 shadow-blue-200"
              >
                {!isLoading && <Search size={18} />}
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs flex items-start gap-2 border border-rose-100">
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <Divider className="bg-slate-100" />

          {/* --- Result Area --- */}
          <div className="flex-1 min-h-0 relative bg-white rounded-xl border border-slate-100 overflow-hidden">
            {searchResult?.found && searchResult.data ? (
              <div className="flex flex-col h-full">
                
                {/* Result Header Card */}
                <div className="p-4 bg-emerald-50/50 border-b border-emerald-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        <span className="text-sm font-bold text-slate-700">پرونده یافت شد</span>
                    </div>
                    <Chip size="sm" variant="flat" className="bg-white text-emerald-600 border border-emerald-200 shadow-sm text-xs font-mono h-6">
                      Case #{searchResult.data.case_id}
                    </Chip>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/60 p-2 rounded-lg border border-emerald-100/50 flex items-center gap-2">
                        <div className="p-1 bg-emerald-100 text-emerald-600 rounded-md">
                            <Clock size={14} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400">مدت زمان</span>
                            <span className="text-xs font-bold text-slate-700 font-mono dir-ltr text-right">
                                {formatDuration(searchResult.data.total_duration)}
                            </span>
                        </div>
                    </div>
                    <div className="bg-white/60 p-2 rounded-lg border border-emerald-100/50 flex items-center gap-2">
                        <div className="p-1 bg-blue-100 text-blue-600 rounded-md">
                            <MapPin size={14} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400">مراحل</span>
                            <span className="text-xs font-bold text-slate-700">
                                {searchResult.data.nodes.length} فعالیت
                            </span>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Path */}
                <ScrollShadow className="flex-1 p-4 bg-slate-50/30">
                  <div className="relative pl-2 pr-4">
                    {/* خط عمودی اصلی (تایم‌لاین) */}
                    <div className="absolute top-3 bottom-3 right-[7px] w-0.5 bg-slate-200" />

                    {searchResult.data.nodes.map((node, index) => {
                        const isLast = index === searchResult.data!.nodes.length - 1;
                        const isFirst = index === 0;
                        const duration = !isLast ? searchResult.data!.edge_durations[index] : null;

                        return (
                            <div key={index} className="relative">
                                {/* ردیف گره (دایره + متن) */}
                                <div className="flex items-start gap-3 relative z-10">
                                    {/* دایره نشانگر */}
                                    <div className={`
                                        w-4 h-4 rounded-full border-2 shrink-0 bg-white mt-1
                                        ${isFirst 
                                            ? 'border-emerald-500 ring-2 ring-emerald-100' 
                                            : isLast 
                                                ? 'border-rose-500 ring-2 ring-rose-100' 
                                                : 'border-blue-400'
                                        }
                                    `} />
                                    
                                    {/* متن گره */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-sm ${isFirst || isLast ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                                {node}
                                            </span>
                                            {isFirst && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">شروع</span>}
                                            {isLast && <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md">پایان</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* نمایش مدت زمان بین مراحل (به عنوان یک بلوک جداگانه زیر گره) */}
                                {!isLast && duration !== undefined && duration !== null && (
                                    <div className="flex justify-start pr-[0.15rem] my-3 relative z-20">
                                        <div className="
                                            flex items-center gap-1 px-2 py-0.5 rounded-full 
                                            bg-white border border-slate-200 shadow-sm
                                            text-[10px] text-slate-500 font-mono
                                            hover:border-blue-300 transition-colors
                                        ">
                                            <span className="text-slate-300"><ArrowDown size={10} /></span>
                                            {formatDuration(duration)}
                                        </div>
                                    </div>
                                )}
                                
                                {/* فاصله اضافی اگر آخرین آیتم نیست و مدتی هم ندارد (برای زیبایی) */}
                                {!isLast && (duration === undefined || duration === null) && (
                                    <div className="h-6" />
                                )}
                            </div>
                        );
                    })}
                  </div>
                </ScrollShadow>
              </div>
            ) : (
                // Empty State
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center opacity-60">
                    <FileText size={48} className="text-slate-300" />
                    <p className="text-slate-400 text-xs leading-5">
                        شماره پرونده مورد نظر را وارد کنید تا مسیر دقیق طی شده و زمان‌بندی آن را مشاهده کنید.
                    </p>
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