import { useState } from "react";
import { NumberInput } from "@heroui/number-input";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Accordion, AccordionItem } from "@heroui/accordion"; // برای جمع کردن لیست اگر خیلی طولانی بود (اختیاری)
import { Search, XCircle, CheckCircle2, Clock, MapPin } from "lucide-react";

import type { FilterTypes, SearchCaseIdsData, ExtendedPath } from "src/types/types";
import ProcessData from "../utils/ProcessData";

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

  // تابع فرمت زمان برای نمایش زیباتر
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(0)} ثانیه`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} دقیقه`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} ساعت`;
    return `${(seconds / 86400).toFixed(2)} روز`;
  };

  const submit = async () => {
    // اعتبارسنجی ورودی
    if (!caseIdInput) {
      setError("لطفاً شناسه پرونده را وارد کنید.");
      return;
    }

    const caseIdNum = Number(caseIdInput);

    setIsLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      // فراخوانی تابع پردازش
      const response = (await ProcessData(
        filePath,
        filters,
        caseIdNum
      )) as SearchCaseIdsData;

      setSearchResult(response);

      if (response.found && response.data && response.data.nodes.length > 0) {
        // اگر نتیجه پیدا شد، دیتای آن را برای رسم به والد می‌فرستیم
        if (onCaseFound) {
          
          // --- ساختن مپ زمان‌های دقیق یال‌ها ---
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
    <>
      {filters?.dateRange.start && filters?.dateRange.end ? (
        <Card className="w-full shadow-sm border border-default-200">
          <CardHeader className="pb-2">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Search size={18} />
              جستجوی شناسه پرونده
            </span>
          </CardHeader>

          <Divider />

          <CardBody className="flex flex-col gap-4">
            {/* Input Section */}
            <div className="flex w-full gap-2">
              <NumberInput
                placeholder="شناسه پرونده (مثلاً 1001)"
                value={caseIdInput}
                onValueChange={setCaseIdInput}
                onKeyDown={handleKeyDown}
                isDisabled={isLoading}
                formatOptions={{ useGrouping: false }}
                minValue={0}
                hideStepper
                isClearable
                variant="bordered"
                size="sm"
                classNames={{
                  inputWrapper: "h-10",
                }}
                startContent={<span className="text-default-400 text-xs">#</span>}
              />
              <Button
                isIconOnly
                color="primary"
                variant="flat"
                onPress={submit}
                isLoading={isLoading}
                size="sm"
                className="h-10 w-10 min-w-10"
              >
                {!isLoading && <Search size={18} />}
              </Button>
            </div>

            {/* Error Section */}
            {error && (
              <div className="p-2 rounded-lg bg-danger-50 text-danger-600 text-xs flex items-center gap-2">
                <XCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Result Section */}
            {searchResult?.found && searchResult.data && (
              <div className="flex flex-col gap-2">
                {/* Summary Box */}
                <div className="flex flex-col gap-2 p-3 rounded-lg bg-success-50/50 border border-success-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-success-700 flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      پیدا شد
                    </span>
                    <Chip size="sm" variant="flat" color="success" className="text-[10px] h-5">
                      Case {searchResult.data.case_id}
                    </Chip>
                  </div>

                  <Divider className="my-1 bg-success-200/50" />

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      مدت زمان کل:
                    </span>
                    <span className="font-mono font-bold">
                      {formatDuration(searchResult.data.total_duration)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                     <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        تعداد مراحل:
                     </span>
                     <span className="font-bold">{searchResult.data.nodes.length}</span>
                  </div>
                </div>

                {/* Timeline Path List */}
                <div className="mt-2">
                  <span className="text-xs font-semibold text-gray-500 mb-2 block px-1 text-right">
                    مسیر طی شده:
                  </span>
                  
                  <div className="relative border border-default-200 rounded-lg p-3 bg-white max-h-[500px] overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col">
                        {searchResult.data.nodes.map((node, index) => {
                            const isLast = index === searchResult.data!.nodes.length - 1;
                            const isFirst = index === 0;
                            const duration = !isLast ? searchResult.data!.edge_durations[index] : null;

                            return (
                                <div key={index} className="relative pr-6 pb-0">
                                    {/* خط عمودی اتصال دهنده */}
                                    {!isLast && (
                                        <div className="absolute right-[0.65rem] top-5 bottom-[-4px] w-0.5 bg-gray-200"></div>
                                    )}
                                    
                                    {/* دایره نشانگر مرحله */}
                                    <div className={`absolute right-[0.2rem] top-1.5 w-4 h-4 rounded-full border-2 z-10 ${
                                        isFirst ? 'border-success-500 bg-success-100' :
                                        isLast ? 'border-danger-500 bg-danger-100' :
                                        'border-primary-400 bg-primary-50'
                                    }`}></div>

                                    {/* محتوای مرحله */}
                                    <div className="flex flex-col items-start gap-1 pb-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs ${isFirst || isLast ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                                                {node}
                                            </span>
                                            {isFirst && <Chip size="sm" color="success" variant="flat" className="h-4 text-[9px] px-1 min-w-0">شروع</Chip>}
                                            {isLast && <Chip size="sm" color="danger" variant="flat" className="h-4 text-[9px] px-1 min-w-0">پایان</Chip>}
                                        </div>

                                        {/* نمایش زمان بین مراحل */}
                                        {!isLast && duration !== undefined && duration !== null && (
                                            <div className="mt-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                                                {formatDuration(duration)}
                                                <span className="mr-1 opacity-70">▼</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="text-sm text-gray-500 text-center p-4">
          لطفا ابتدا فیلتر تاریخ را در تب فیلترها وارد کنید.
        </div>
      )}
    </>
  );
}