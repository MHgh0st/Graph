import { Edge, Node } from "@xyflow/react";
import { CardHeader, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Tooltip } from "@heroui/tooltip";
import closeIcon from "../../../assets/close-icon.svg";
import displayIcon from "../../../assets/display-icon.svg";
import type { Path } from "src/types/types";
import { useState, useEffect } from "react";
interface PathfindingCardProps {
  startNodeId: string | null;
  endNodeId: string | null;
  paths: Path[];
  allNodes: Node[];
  isLoading: boolean;
  onSelectPath: (path: Path, index: number) => void;
  onClose: () => void;
  selectedIndex: number | null;
  calculatePathDuration: (path: Path) => {
    totalDuration: number;
    averageDuration: number;
  };
}

export const PathfindingCard = ({
  startNodeId,
  endNodeId,
  paths,
  allNodes,
  isLoading,
  onSelectPath,
  onClose,
  selectedIndex,
  calculatePathDuration,
}: PathfindingCardProps) => {
  const [sortedPaths, setSortedPaths] = useState<Path[]>([]);
  const [isSorting, setIsSorting] = useState(false);
  // مرتب کردن لیست
  useEffect(() => {
    // اگر مسیری وجود ندارد، همه‌چیز را ریست کن
    if (paths.length === 0) {
      setSortedPaths([]);
      setIsSorting(false);
      return;
    }

    // لودر مرتب‌سازی را نشان بده
    setIsSorting(true);
    // با دریافت مسیرهای جدید، به صفحه اول برو
    setCurrentPage(1);

    const processedPaths: Path[] = [];
    let index = 0;
    // اندازه هر "تکه" برای پردازش
    // این عدد را می‌توانید بر اساس تست پرفورمنس تنظیم کنید
    const CHUNK_SIZE = 5000;

    function processChunk() {
      try {
        const limit = Math.min(index + CHUNK_SIZE, paths.length);

        // پردازش تکه‌ای از داده‌ها
        for (let i = index; i < limit; i++) {
          const path = paths[i];
          const { totalDuration, averageDuration } =
            calculatePathDuration(path);
          // ذخیره مقادیر محاسبه‌شده در خود آبجکت مسیر
          processedPaths.push({ ...path, totalDuration, averageDuration });
        }

        index += CHUNK_SIZE;

        if (index < paths.length) {
          // اگر هنوز مسیری باقی مانده، به UI اجازه نفس کشیدن بده
          // و پردازش تکه بعدی را به تعویق بینداز
          setTimeout(processChunk, 0);
        } else {
          // --- تمام مسیرها پردازش شدند، حالا مرتب‌سازی ---
          // مرتب‌سازی بر اساس میانگین زمان (از کم به زیاد)
          // از 0 (?? 0) برای مقادیر احتمالی undefined استفاده می‌کنیم
          processedPaths.sort(
            (a, b) => (a.averageDuration ?? 0) - (b.averageDuration ?? 0)
          );

          // ذخیره لیست نهایی و مرتب‌شده در state
          setSortedPaths(processedPaths);
          // پایان لودینگ مرتب‌سازی
          setIsSorting(false);
        }
      } catch (error) {
        console.error("خطا در پردازش و مرتب‌سازی مسیرها:", error);
        setIsSorting(false); // در صورت بروز خطا، لودینگ متوقف شود
      }
    }

    // شروع پردازش اولین تکه
    processChunk();
  }, [paths, calculatePathDuration]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const totalPages = Math.ceil(sortedPaths.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPaths = sortedPaths.slice(startIndex, endIndex);

  const getNodeLabel = (id: string) =>
    allNodes.find((n) => n.id === id)?.data?.label || id;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)} ثانیه`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} دقیقه`;
    return `${(seconds / 3600).toFixed(1)} ساعت`;
  };

  return (
    <>
      <CardHeader className="text-lg font-bold flex gap-x-2">
        {/* ... (دکمه بستن و عنوان کارت بدون تغییر) ... */}
        <Button
          isIconOnly
          color="danger"
          size="sm"
          variant="light"
          onPress={onClose}
        >
          <img src={closeIcon} width={25} alt="Close" />
        </Button>
        <p>یافتن مسیر</p>
      </CardHeader>
      <CardBody className="text-right w-[500px]">
        {/* ... (بخش‌های مربوط به انتخاب نود شروع و پایان بدون تغییر) ... */}
        {!startNodeId && <p>. لطفاً نود شروع را روی گراف انتخاب کنید...</p>}
        {startNodeId && !endNodeId && (
          <>
            <p>
              نود شروع: <strong>{getNodeLabel(startNodeId)}</strong>
            </p>
            <p> لطفاً نود پایان را روی گراف انتخاب کنید...</p>
          </>
        )}

        {/* --- 5. مدیریت UI لودینگ‌ها --- */}
        {/* (زمانی که نودها انتخاب شدند و لودینگ اصلی تمام شده) */}
        {startNodeId && endNodeId && !isLoading && (
          <div>
            {/* --- 5a. نمایش لودر مرتب‌سازی --- */}
            {isSorting && (
              <div className="text-center p-4">
                <p className="font-bold">
                  در حال آماده‌سازی و مرتب‌سازی {paths.length.toLocaleString()}{" "}
                  مسیر...
                </p>
                <p className="text-sm text-gray-500">
                  لطفا کمی صبر کنید. این عملیات ممکن است چند لحظه طول بکشد.
                </p>
                {/* می‌توانید یک کامپوننت Spinner هم اینجا اضافه کنید */}
              </div>
            )}

            {/* --- 5b. نمایش لیست (فقط زمانی که مرتب‌سازی تمام شده) --- */}
            {!isSorting && (
              <div>
                <p>
                  {/* از sortedPaths.length استفاده می‌کنیم */}
                  <strong>{sortedPaths.length.toLocaleString()}</strong> مسیر از{" "}
                  <strong>{getNodeLabel(startNodeId)}</strong> به{" "}
                  <strong>{getNodeLabel(endNodeId)}</strong> یافت شد:
                </p>
                <Divider className="my-2" />
                {sortedPaths.length === 0 ? (
                  <p>هیچ مسیر مستقیمی یافت نشد.</p>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-gray-500">
                        صفحه {currentPage} از {totalPages} (
                        {sortedPaths.length.toLocaleString()} مسیر)
                      </span>
                      <div className="flex gap-2">
                        {/* ... (دکمه‌های صفحه‌بندی بدون تغییر) ... */}
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={currentPage === 1}
                          onPress={() => setCurrentPage((prev) => prev - 1)}
                        >
                          قبلی
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          isDisabled={currentPage === totalPages}
                          onPress={() => setCurrentPage((prev) => prev + 1)}
                        >
                          بعدی
                        </Button>
                      </div>
                    </div>

                    <Accordion className="p-0" variant="splitted" isCompact>
                      {/* از currentPaths (که از sortedPaths آمده) استفاده می‌کنیم */}
                      {currentPaths.map((path, index) => {
                        const actualIndex = startIndex + index;

                        // --- 6. استفاده از مقادیر محاسبه‌شده ---
                        // دیگر نیازی به فراخوانی calculatePathDuration در هر رندر نیست
                        const duration = {
                          totalDuration: path.totalDuration ?? 0,
                          averageDuration: path.averageDuration ?? 0,
                        };
                        // ---

                        return (
                          <AccordionItem
                            key={actualIndex}
                            title={`مسیر ${actualIndex + 1} ( دارای ${path.nodes.length - 2} راس و ${path.edges.length} یال )`}
                            startContent={
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="ms-2"
                              >
                                <Tooltip
                                  content={`مشخص کردن مسیر ${actualIndex + 1}`}
                                  showArrow
                                >
                                  <Button
                                    as="div"
                                    isIconOnly
                                    color={
                                      selectedIndex === actualIndex
                                        ? "success"
                                        : "default"
                                    }
                                    variant="flat"
                                    onPress={() =>
                                      onSelectPath(path, actualIndex)
                                    }
                                  >
                                    <img src={displayIcon} alt="" width={20} />
                                  </Button>
                                </Tooltip>
                              </div>
                            }
                            itemClasses={{
                              heading:
                                "flex flex-row-reverse items-center justify-between gap-2",
                              titleWrapper: "text-right",
                            }}
                            className={`shadow-none ${selectedIndex === actualIndex ? "bg-success/20" : "bg-default/40"}`}
                            classNames={{ indicator: "cursor-pointer" }}
                          >
                            <div className="text-sm text-gray-500">
                              میانگین زمان: {/* استفاده از متغیر duration */}
                              {formatDuration(duration.averageDuration)} | کل
                              زمان: {formatDuration(duration.totalDuration)}
                            </div>
                            {/* ... (بقیه رندر آیتم بدون تغییر) ... */}
                            {path.nodes.slice(0, 10).map((id, i) => (
                              <p
                                key={i}
                                className="text-sm text-gray-500 leading-6"
                              >
                                {`${i} - ${getNodeLabel(id)}`}
                              </p>
                            ))}
                            {path.nodes.length > 10 && (
                              <p className="text-sm text-gray-400">
                                ... و {path.nodes.length - 10} نود دیگر
                              </p>
                            )}
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* لودینگ اصلی (برای پیدا کردن مسیرها) */}
        {isLoading && (
          <div>
            <p className="text-xl font-bold mb-2 ">
              پیدا کردن مسیر ها از {getNodeLabel(startNodeId)} به{" "}
              {getNodeLabel(endNodeId)}
            </p>
            <p>در حال یافتن مسیرها، لطفاً صبر کنید...</p>
          </div>
        )}
      </CardBody>
    </>
  );
};
