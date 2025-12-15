import { Node } from "@xyflow/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Search } from "lucide-react";
import { Tooltip } from "@heroui/tooltip";
import { Chip } from "@heroui/chip";
import { useState, useEffect, useMemo } from "react";

import type { Path } from "src/types/types";
// 1. ایمپورت کامپوننت جدید
import { PathList } from "../../PathList";

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
  removePath: (index: number) => void;
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
  removePath,
  className,
}: PathfindingCardProps) => {
  const [processedPaths, setProcessedPaths] = useState<Path[]>([]);
  const [sortedPaths, setSortedPaths] = useState<Path[]>([]);
  const [isSorted, setIsSorted] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const [searchedNodes, setSearchedNodes] = useState<Node[]>([]);
  const [activeTab, setActiveTab] = useState<"Nodes" | "Paths">("Nodes");

  // محاسبه لیست پایه (گره‌های مجاز)
  const baseNodes = useMemo(() => {
    if (selectedNodeIds && selectedNodeIds.size > 0) {
      return allNodes.filter((node) => selectedNodeIds.has(node.id));
    }
    return allNodes;
  }, [allNodes, selectedNodeIds]);

  // پردازش مسیرها (محاسبه زمان‌ها)
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
          const { totalDuration, averageDuration } = calculatePathDuration(path);
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

  // به‌روزرسانی لیست جستجو
  useEffect(() => {
    setSearchedNodes(baseNodes);
  }, [baseNodes]);

  // تابع مرتب‌سازی
  const handleSortPaths = () => {
    if (isSorted) return;
    setIsSorting(true);
    // یک تاخیر کوچک برای اینکه UI آپدیت شود
    setTimeout(() => {
      const sorted = [...processedPaths].sort(
        (a, b) => (a.averageDuration ?? 0) - (b.averageDuration ?? 0)
      );
      setSortedPaths(sorted);
      setIsSorted(true);
      setIsSorting(false);
    }, 10);
  };

  const getNodeLabel = (id: string) =>
    allNodes.find((n) => n.id === id)?.data?.label || id;

  const Tabs: { name: "Nodes" | "Paths"; label: string }[] = [
    { name: "Nodes", label: "راس ها" },
    { name: "Paths", label: "مسیر ها" },
  ];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* هدر: اطلاعات شروع و پایان */}
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
              پیدا کردن مسیر ها...
            </p>
            <p>لطفاً صبر کنید...</p>
          </div>
        )}
      </div>

      {/* تب‌ها */}
      <div className="w-full flex gap-x-2 mt-3 flex-shrink-0">
        {Tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <div
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full text-center py-1 border-1 rounded-lg shadow-lg text-sm cursor-pointer transition-all ${
                isActive ? "bg-primary/70 text-white shadow-xl" : "hover:bg-primary/30"
              }`}
            >
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* بدنه اصلی */}
      <div className="flex-1 overflow-y-auto min-h-0 px-2 mt-4">
        {activeTab === "Paths" && startNodeId && endNodeId && !isLoading && (
          <div>
            {isSorting && (
              <div className="text-center p-4">
                <p className="font-bold">
                  {isSorted ? "در حال مرتب‌سازی" : "در حال آماده‌سازی"}{" "}
                  {paths.length.toLocaleString()} مسیر...
                </p>
              </div>
            )}

            {!isSorting && !isLoading && (
              <div>
                {paths.length === 0 ? (
                  <p>هیچ مسیر مستقیمی یافت نشد.</p>
                ) : (
                  <div>
                    {/* کنترل‌های مرتب‌سازی */}
                    <div className="flex flex-col justify-between items-center mb-4">
                      <Button
                        size="sm"
                        variant="flat"
                        color={isSorted ? "success" : "primary"}
                        isDisabled={isSorted}
                        onPress={handleSortPaths}
                      >
                        {isSorted ? "مرتب‌شده" : "مرتب‌سازی بر اساس زمان"}
                      </Button>
                    </div>

                    {/* 2. استفاده از کامپوننت جدید */}
                    <PathList
                      paths={sortedPaths}
                      allNodes={allNodes}
                      selectedIndex={selectedIndex}
                      onSelectPath={onSelectPath}
                      onRemovePath={removePath}
                      groupByType={true} 
                      emptyMessage="هیچ مسیر مستقیمی یافت نشد."
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* پیام عدم انتخاب راس */}
        {activeTab === "Paths" && (!startNodeId || !endNodeId) && (
          <div className="flex justify-center items-center h-full">
            لطفا راس ها را انتخاب کنید.
          </div>
        )}

        {/* بخش جستجوی گره‌ها (بدون تغییر) */}
        {/* نکته: از کامپوننت Activity خودتان استفاده کنید یا div جایگزین */}
        <div className={`${activeTab === "Nodes" ? "block" : "hidden"}`}> 
          {selectedNodeIds.size > 0 ? (
            <div className="flex flex-col gap-y-2">
              <Input
                type="text"
                variant="faded"
                placeholder="جستجو بین راس ها"
                startContent={<Search size={24} />}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace('ی', 'ي');
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
              {searchedNodes.map((node) => {
                 const isSelected = startNodeId === node.id || endNodeId === node.id;
                 return (
                    <Tooltip
                        key={node.id}
                        content={startNodeId === node.id ? "انتخاب شده به عنوان شروع" : "انتخاب"}
                    >
                     <Button
                      variant={isSelected ? "solid" : "flat"}
                      color="primary"
                      fullWidth
                      onPress={(event) => handleNodeClick(event, node)}
                     >
                      {node.data.label}
                      {/* چیپ‌ها */}
                      {startNodeId === node.id && <Chip size="sm" color="success">شروع</Chip>}
                      {endNodeId === node.id && <Chip size="sm" color="danger">پایان</Chip>}
                     </Button>
                    </Tooltip>
                 )
              })}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              لطفا ابتدا گره ها را در تب گره ها انتخاب کنید.
            </div>
          )}
        </div>
      </div>

      <Button
        fullWidth
        color="danger"
        variant="flat"
        className="mt-3"
        onPress={resetPathfinding}
      >
        لغو مسیریابی
      </Button>
    </div>
  );
};