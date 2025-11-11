import { Edge, Node } from "@xyflow/react";
import { Button } from "@heroui/button";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Tooltip } from "@heroui/tooltip";
import { Input } from "@heroui/input";
import { Search } from "lucide-react";
import displayIcon from "../../../assets/display-icon.svg";
import { Chip } from "@heroui/chip";
import type { Path } from "src/types/types";
import { useState, useEffect } from "react";

interface PathfindingCardProps {
  startNodeId: string | null;
  endNodeId: string | null;
  paths: Path[];
  allNodes: Node[];
  isLoading: boolean;
  onSelectPath: (path: Path, index: number) => void;
  selectedIndex: number | null;
  calculatePathDuration: (path: Path) => {
    totalDuration: number;
    averageDuration: number;
  };
  handleNodeClick: (_event: React.MouseEvent, node: Node) => void;
}

export const PathfindingCard = ({
  startNodeId,
  endNodeId,
  paths,
  allNodes,
  isLoading,
  onSelectPath,
  selectedIndex,
  calculatePathDuration,
  handleNodeClick,
}: PathfindingCardProps) => {
  const [processedPaths, setProcessedPaths] = useState<Path[]>([]);
  const [sortedPaths, setSortedPaths] = useState<Path[]>([]);
  const [isSorted, setIsSorted] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [searchedNodes, setSearchedNodes] = useState<Node[]>(allNodes);

  // پردازش مسیرها بدون مرتب‌سازی خودکار
  useEffect(() => {
    // اگر مسیری وجود ندارد، همه‌چیز را ریست کن
    if (paths.length === 0) {
      setProcessedPaths([]);
      setSortedPaths([]);
      setIsSorted(false);
      setIsSorting(false);
      return;
    }

    // لودر پردازش را نشان بده
    setIsSorting(true);

    const processed: Path[] = [];
    let index = 0;
    // اندازه هر "تکه" برای پردازش
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
          processed.push({ ...path, totalDuration, averageDuration });
        }

        index += CHUNK_SIZE;

        if (index < paths.length) {
          // اگر هنوز مسیری باقی مانده، به UI اجازه نفس کشیدن بده
          setTimeout(processChunk, 0);
        } else {
          // تمام مسیرها پردازش شدند، لیست بدون مرتب‌سازی را ذخیره کن
          setProcessedPaths(processed);
          setSortedPaths(processed);
          setIsSorting(false);
        }
      } catch (error) {
        console.error("خطا در پردازش مسیرها:", error);
        setIsSorting(false);
      }
    }

    // شروع پردازش اولین تکه
    processChunk();
  }, [paths, calculatePathDuration]);

  // تابع مرتب‌سازی
  const handleSortPaths = () => {
    if (isSorted) return; // اگر قبلاً مرتب شده، کاری نکن

    setIsSorting(true);
    // مرتب‌سازی بر اساس میانگین زمان (از کم به زیاد)
    const sorted = [...processedPaths].sort(
      (a, b) => (a.averageDuration ?? 0) - (b.averageDuration ?? 0)
    );
    setSortedPaths(sorted);
    setIsSorted(true);
    setIsSorting(false);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"Nodes" | "Paths">("Nodes");
  const itemsPerPage = 50;
  const totalPages = Math.ceil(sortedPaths.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPaths = sortedPaths.slice(startIndex, endIndex);

  const getNodeLabel = (id: string) =>
    searchedNodes.find((n) => n.id === id)?.data?.label || id;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)} ثانیه`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} دقیقه`;
    return `${(seconds / 3600).toFixed(1)} ساعت`;
  };

  const Tabs: {
    name: "Nodes" | "Paths";
    label: string;
  }[] = [
    {
      name: "Nodes",
      label: "راس ها",
    },
    {
      name: "Paths",
      label: "مسیر ها",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* بخش‌های مربوط به انتخاب نود شروع و پایان بدون تغییر */}
      <div className="w-full p-2 flex-shrink-0">
        {!startNodeId && <p>لطفاً نود شروع را روی گراف انتخاب کنید...</p>}
        {startNodeId && !endNodeId && (
          <>
            <p>
              نود شروع: <strong>{getNodeLabel(startNodeId)}</strong>
            </p>
            <p>لطفاً نود پایان را روی گراف انتخاب کنید...</p>
          </>
        )}

        {!isLoading && startNodeId && endNodeId && (
          <p>
            <strong>{paths.length.toLocaleString()}</strong> مسیر از{" "}
            <strong>{getNodeLabel(startNodeId)}</strong> به{" "}
            <strong>{getNodeLabel(endNodeId)}</strong> یافت شد:
          </p>
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
      </div>

      {/* تب ها */}
      <div className="w-full flex gap-x-2 mt-3 flex-shrink-0">
        {Tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <div
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full text-center py-1 border-1 rounded-lg shadow-lg text-sm cursor-pointer transition-all ${isActive ? "bg-primary/70 text-white shadow-xl" : "hover:bg-primary/30"}`}
            >
              {tab.label}
            </div>
          );
        })}
      </div>
      <div className=" flex-1 overflow-y-auto min-h-0 px-2 mt-4">
        {/* تب مسیر ها: */}
        {activeTab === "Paths" && startNodeId && endNodeId && !isLoading && (
          <div>
            {/* نمایش لودر پردازش */}
            {isSorting && (
              <div className="text-center p-4">
                <p className="font-bold">
                  {isSorted ? "در حال مرتب‌سازی" : "در حال آماده‌سازی"}{" "}
                  {paths.length.toLocaleString()} مسیر...
                </p>
                <p className="text-sm text-gray-500">
                  لطفا کمی صبر کنید. این عملیات ممکن است چند لحظه طول بکشد.
                </p>
              </div>
            )}

            {/* نمایش لیست (فقط زمانی که پردازش تمام شده) */}
            {!isSorting && !isLoading && (
              <div>
                {paths.length === 0 ? (
                  <p>هیچ مسیر مستقیمی یافت نشد.</p>
                ) : (
                  <div>
                    <div className="flex flex-col justify-between items-center mb-4">
                      <div className="flex gap-2">
                        {/* دکمه مرتب‌سازی */}
                        <Button
                          size="sm"
                          variant="flat"
                          color={isSorted ? "success" : "primary"}
                          isDisabled={isSorted}
                          onPress={handleSortPaths}
                        >
                          {isSorted ? "مرتب‌شده" : "مرتب‌سازی"}
                        </Button>
                        {/* دکمه‌های صفحه‌بندی */}
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
                      <span className="text-sm text-gray-500 mt-2">
                        {isSorted && " (مرتب‌شده بر اساس میانگین زمان)"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                      <span>
                        صفحه {currentPage} از {totalPages} (
                        {sortedPaths.length.toLocaleString()} مسیر)
                      </span>
                    </div>

                    <Accordion className="p-0" variant="splitted" isCompact>
                      {currentPaths.map((path, index) => {
                        const actualIndex = startIndex + index;

                        const duration = {
                          totalDuration: path.totalDuration ?? 0,
                          averageDuration: path.averageDuration ?? 0,
                        };

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
                                        ? "warning"
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
                            className={`shadow-none ${selectedIndex === actualIndex ? "bg-warning/20" : "bg-default/40"}`}
                            classNames={{ indicator: "cursor-pointer" }}
                          >
                            <div className="text-sm text-gray-500">
                              میانگین زمان:{" "}
                              {formatDuration(duration.averageDuration)} | کل
                              زمان: {formatDuration(duration.totalDuration)}
                            </div>
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
        {activeTab === "Paths" && (!startNodeId || !endNodeId) && (
          <div className="flex justify-center items-center h-full">
            لطفا راس ها را انتخاب کنید.
          </div>
        )}

        {activeTab === "Nodes" &&
          (() => {
            return (
              <div className="flex flex-col gap-y-2">
                <Input
                  type="text"
                  variant="faded"
                  placeholder="جستجو بین راس ها"
                  startContent={<Search size={24} />}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase();

                    if (!value.trim()) {
                      setSearchedNodes(allNodes);
                      return;
                    }
                    setSearchedNodes(
                      allNodes.filter((node) =>
                        node.data.label.toLowerCase().includes(value)
                      )
                    );
                  }}
                />
                {searchedNodes.map((node, index) => {
                  const isSelected =
                    startNodeId === node.id || endNodeId === node.id;

                  return (
                    <Tooltip
                      showArrow
                      placement="left"
                      content={
                        startNodeId === node.id
                          ? "انتخاب شده به عنوان راس شروع"
                          : endNodeId === node.id
                            ? "انتخاب شده به عنوان راس پایان"
                            : !startNodeId
                              ? "انتخاب کردن به عنوان راس شروع"
                              : !endNodeId
                                ? "انتخاب کردن به عنوان راس پایان"
                                : "انتخاب دوباره راس شروع"
                      }
                    >
                      <Button
                        variant={isSelected ? "solid" : "flat"}
                        color="primary"
                        fullWidth
                        onPress={(event) => {
                          handleNodeClick(event, node);
                        }}
                        className={`${isSelected ? "scale-95" : ""} transition-all`}
                      >
                        {node.data.label}
                        {isSelected && (
                          <Chip
                            variant="solid"
                            size="sm"
                            color={
                              startNodeId === node.id
                                ? "success"
                                : endNodeId === node.id && "danger"
                            }
                          >
                            {startNodeId === node.id
                              ? "راس شروع"
                              : endNodeId === node.id && "راس پایان"}
                          </Chip>
                        )}
                      </Button>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })()}
      </div>
    </div>
  );
};
