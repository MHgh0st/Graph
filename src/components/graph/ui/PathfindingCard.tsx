import { Edge, Node } from "@xyflow/react";
import { Button } from "@heroui/button";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Tooltip } from "@heroui/tooltip";
import { Input } from "@heroui/input";
import { Search } from "lucide-react";
import displayIcon from "../../../assets/display-icon.svg";
import { Chip } from "@heroui/chip";
import type { Path, ExtendedPath } from "src/types/types";
import { useState, useEffect, Activity, useMemo } from "react";

interface PathfindingCardProps {
  startNodeId: string | null;
  endNodeId: string | null;
  paths: Path[];
  allNodes: Node[];
  selectedNodeIds: Set<string>;
  isLoading: boolean;
  onSelectPath: (path: Path, index: number) => void;
  selectedIndex: number | null;
  calculatePathDuration: (path: Path) => {
    totalDuration: number;
    averageDuration: number;
  };
  handleNodeClick: (_event: React.MouseEvent, node: Node) => void;
  resetPathfinding: () => void;
  className?: string;
}

export const PathfindingCard = ({
  startNodeId,
  endNodeId,
  paths,
  allNodes,
  selectedNodeIds,
  isLoading,
  onSelectPath,
  selectedIndex,
  calculatePathDuration,
  handleNodeClick,
  resetPathfinding,
  className,
}: PathfindingCardProps) => {
  const [processedPaths, setProcessedPaths] = useState<Path[]>([]);
  const [sortedPaths, setSortedPaths] = useState<Path[]>([]);
  const [isSorted, setIsSorted] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [searchedNodes, setSearchedNodes] = useState<Node[]>([]);

  // --- تغییر ۱: محاسبه لیست پایه (گره‌های مجاز) ---
  // این لیست فقط شامل گره‌هایی است که در selectedNodeIds وجود دارند
  const baseNodes = useMemo(() => {
    if (selectedNodeIds && selectedNodeIds.size > 0) {
      return allNodes.filter((node) => selectedNodeIds.has(node.id));
    }
    return allNodes;
  }, [allNodes, selectedNodeIds]);

  // پردازش مسیرها بدون مرتب‌سازی خودکار
  useEffect(() => {
    if (paths.length === 0) {
      setProcessedPaths([]);
      setSortedPaths([]);
      setIsSorted(false);
      setIsSorting(false);
      return;
    }

    setIsSorting(true);

    const processed: Path[] = [];
    let index = 0;
    const CHUNK_SIZE = 5000;

    function processChunk() {
      try {
        const limit = Math.min(index + CHUNK_SIZE, paths.length);

        for (let i = index; i < limit; i++) {
          const path = paths[i];
          const { totalDuration, averageDuration } =
            calculatePathDuration(path);
          processed.push({ ...path, totalDuration, averageDuration });
        }

        index += CHUNK_SIZE;

        if (index < paths.length) {
          setTimeout(processChunk, 0);
        } else {
          setProcessedPaths(processed);
          setSortedPaths(processed);
          setIsSorting(false);
        }
      } catch (error) {
        console.error("خطا در پردازش مسیرها:", error);
        setIsSorting(false);
      }
    }

    processChunk();
  }, [paths, calculatePathDuration]);

  // --- تغییر ۲: به‌روزرسانی لیست نمایش داده شده بر اساس baseNodes ---
  useEffect(() => {
    setSearchedNodes(baseNodes);
  }, [baseNodes]);

  const handleSortPaths = () => {
    if (isSorted) return;

    setIsSorting(true);
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
    allNodes.find((n) => n.id === id)?.data?.label || id;

  const formatDuration = (seconds: number) => {
    return `${(seconds / 3600 / 24).toFixed(2)} روز`;
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
    <div className={`flex flex-col h-full ${className}`}>
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
        {activeTab === "Paths" && startNodeId && endNodeId && !isLoading && (
          <div>
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

            {!isSorting && !isLoading && (
              <div>
                {paths.length === 0 ? (
                  <p>هیچ مسیر مستقیمی یافت نشد.</p>
                ) : (
                  <div>
                    <div className="flex flex-col justify-between items-center mb-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="flat"
                          color={isSorted ? "success" : "primary"}
                          isDisabled={isSorted}
                          onPress={handleSortPaths}
                        >
                          {isSorted ? "مرتب‌شده" : "مرتب‌سازی"}
                        </Button>
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
                        const extPath = path as ExtendedPath;
                        const nodesToShow =
                          extPath._fullPathNodes || path.nodes;
                        const startIdx = extPath._startIndex ?? 0;
                        const endIdx =
                          extPath._endIndex ?? path.nodes.length - 1;

                        return (
                          <AccordionItem
                            key={actualIndex}
                            title={`مسیر ${actualIndex + 1} (تعداد: ${extPath._frequency || "?"})`}
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
                              مدت زمان میانگین :{" "}
                              {formatDuration(path.averageDuration || 0)}
                            </div>

                            <div className="flex flex-col gap-1 p-2 ml-2">
                              {nodesToShow.map((id, i) => {
                                const isStart = i === startIdx;
                                const isEnd = i === endIdx;
                                const isInPath = i > startIdx && i < endIdx;
                                const isOutside = i < startIdx || i > endIdx;

                                return (
                                  <div
                                    key={i}
                                    className={`flex items-center text-sm ${isOutside ? "opacity-50" : "opacity-100"}`}
                                  >
                                    <span className="w-6 text-xs text-gray-500">
                                      {i + 1}.
                                    </span>
                                    <span
                                      className={`
                                      ${isStart ? "font-bold text-success-600" : ""}
                                      ${isEnd ? "font-bold text-danger-600" : ""}
                                      ${isInPath ? "text-gray-800" : ""}
                                      ${isOutside ? "text-gray-500" : ""}
                                   `}
                                    >
                                      {getNodeLabel(id)}
                                    </span>
                                    {isStart && (
                                      <Chip
                                        size="sm"
                                        color="success"
                                        variant="flat"
                                        className="mr-2 h-5 text-[10px]"
                                      >
                                        شروع
                                      </Chip>
                                    )}
                                    {isEnd && (
                                      <Chip
                                        size="sm"
                                        color="danger"
                                        variant="flat"
                                        className="mr-2 h-5 text-[10px]"
                                      >
                                        پایان
                                      </Chip>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
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

        <Activity mode={`${activeTab === "Nodes" ? "visible" : "hidden"}`}>
          {selectedNodeIds.size > 0 ? (<div className="flex flex-col gap-y-2">
            <Input
              type="text"
              variant="faded"
              placeholder="جستجو بین راس ها"
              startContent={<Search size={24} />}
              onChange={(e) => {
                const value = e.target.value.toLowerCase();

                // --- تغییر ۳: استفاده از baseNodes برای جستجو ---
                if (!value.trim()) {
                  setSearchedNodes(baseNodes);
                  return;
                }
                setSearchedNodes(
                  baseNodes.filter((node) =>
                    (node.data.label as string).toLowerCase().includes(value)
                  )
                );
              }}
            />
            {searchedNodes.map((node, index) => {
              const isSelected =
                startNodeId === node.id || endNodeId === node.id;

              return (
                <Tooltip
                  key={node.id}
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
          </div>) : (
            <div className="flex justify-center items-center h-full">
              لطفا ابتدا گره ها را در تب گره ها انتخاب کنید.
            </div>
          )}
        </Activity>
      </div>
      <Button
        fullWidth
        color="danger"
        variant="flat"
        className="mt-3"
        onPress={resetPathfinding}
      >
        لفو مسیریابی
      </Button>
    </div>
  );
};