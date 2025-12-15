import { Node } from "@xyflow/react";
import { Button } from "@heroui/button";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Tooltip } from "@heroui/tooltip";
import { Monitor, X, ChevronDown } from "lucide-react";
import { Chip } from "@heroui/chip";
import { useMemo, useState, memo } from "react";
import type { Path, ExtendedPath } from "src/types/types";

// --- 1. کامپوننت محتوای داخلی (سنگین) که Memo شده است ---
// این کامپوننت فقط لیست نودها را رندر می‌کند تا هنگام باز/بسته شدن یا تغییر سایر آیتم‌ها، الکی رندر نشود.
interface PathNodesListProps {
  path: Path;
  allNodes: Node[];
}

const PathNodesList = memo(({ path, allNodes }: PathNodesListProps) => {
  const getNodeLabel = (id: string) => allNodes.find((n) => n.id === id)?.data?.label || id;
  const extPath = path as ExtendedPath;
  const nodesToShow = extPath._fullPathNodes || path.nodes;
  const startIdx = extPath._startIndex ?? 0;
  const endIdx = extPath._endIndex ?? nodesToShow.length - 1;

  return (
    <div className="flex flex-col gap-1 p-2 ml-2">
      {nodesToShow.map((id, i) => {
        const isStart = i === startIdx;
        const isEnd = i === endIdx;
        const isInPath = i > startIdx && i < endIdx;
        const isOutside = i < startIdx || i > endIdx;

        return (
          <div key={i} className={`flex items-center text-sm ${isOutside ? "opacity-50" : "opacity-100"}`}>
            <span className="w-6 text-xs text-gray-500">{i + 1}.</span>
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
              <Chip size="sm" color="success" variant="flat" className="mr-2 h-5 text-[10px]">
                شروع
              </Chip>
            )}
            {isEnd && (
              <Chip size="sm" color="danger" variant="flat" className="mr-2 h-5 text-[10px]">
                پایان
              </Chip>
            )}
          </div>
        );
      })}
    </div>
  );
});

// --- 2. کامپوننت اصلی ---

interface PathListComponentProps {
  paths: Path[];
  allNodes: Node[];
  selectedIndex: number | null;
  onSelectPath: (path: Path, index: number) => void;
  onRemovePath?: (index: number) => void;
  className?: string;
  emptyMessage?: string;
  groupByType?: boolean;
}

export const PathList = ({
  paths,
  allNodes,
  selectedIndex,
  onSelectPath,
  onRemovePath,
  className = "",
  emptyMessage = "هیچ مسیری یافت نشد.",
  groupByType = false,
}: PathListComponentProps) => {
  
  // استیت برای Load More
  const [itemsToShow, setItemsToShow] = useState<Record<string, number>>({
    absolute: 20,
    relative: 20,
    others: 20,
    all: 20,
  });

  const handleLoadMore = (key: string) => {
    setItemsToShow((prev) => ({ ...prev, [key]: prev[key] + 50 }));
  };

  const formatDuration = (seconds: number) => `${(seconds / 3600 / 24).toFixed(2)} روز`;

  const { absolutePaths, relativePaths, otherPaths } = useMemo(() => {
    if (!groupByType) return { absolutePaths: [], relativePaths: [], otherPaths: paths };

    const absolute: Path[] = [];
    const relative: Path[] = [];
    const others: Path[] = [];

    paths.forEach((path) => {
      const extPath = path as ExtendedPath;
      if (extPath._pathType === "absolute") absolute.push(path);
      else if (extPath._pathType === "relative") relative.push(path);
      else others.push(path);
    });

    return { absolutePaths: absolute, relativePaths: relative, otherPaths: others };
  }, [paths, groupByType]);

  // تابع رندر
  const renderPathItems = (pathList: Path[], listKey: string) => {
    if (pathList.length === 0) {
      return <p className="text-sm text-gray-500 p-2">{emptyMessage}</p>;
    }

    const visibleCount = itemsToShow[listKey] || 20;
    const visibleItems = pathList.slice(0, visibleCount);
    const hasMore = pathList.length > visibleCount;

    return (
      <div className="flex flex-col gap-2">
        <Accordion className="p-0" variant="splitted" isCompact>
          {visibleItems.map((path) => {
            const globalIndex = paths.indexOf(path);
            const extPath = path as ExtendedPath;
            const isSelected = selectedIndex === globalIndex;

            // نکته مهم: AccordionItem باید فرزند مستقیم Accordion باشد
            return (
              <AccordionItem
                key={globalIndex}
                aria-label={`path-${globalIndex}`}
                title={`مسیر ${globalIndex + 1} ${extPath._frequency ? `(تعداد: ${extPath._frequency})` : ""}`}
                startContent={
                  <div className="flex items-center">
                    {onRemovePath && (
                      <Tooltip content="حذف مسیر" showArrow>
                        <Button
                          isIconOnly
                          variant="light"
                          color="danger"
                          size="sm"
                          onPress={() => onRemovePath(globalIndex)}
                        >
                          <X size={16} />
                        </Button>
                      </Tooltip>
                    )}
                    <div onClick={(e) => e.stopPropagation()} className={onRemovePath ? "ms-2" : ""}>
                      <Tooltip content={`مشخص کردن مسیر ${globalIndex + 1}`} showArrow>
                        <Button
                          as="div"
                          isIconOnly
                          color={isSelected ? "warning" : "default"}
                          variant="flat"
                          onPress={() => onSelectPath(path, globalIndex)}
                        >
                          <Monitor size={16} />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                }
                itemClasses={{
                  heading: "flex flex-row-reverse items-center justify-between gap-2",
                  titleWrapper: "text-right",
                }}
                className={`shadow-none ${isSelected ? "bg-warning/20" : "bg-default/40"}`}
              >
                <div className="text-sm text-gray-500">
                  مدت زمان میانگین : {formatDuration(path.averageDuration || 0)}
                </div>

                {/* اینجا از کامپوننت Memo شده استفاده می‌کنیم */}
                <PathNodesList path={path} allNodes={allNodes} />
                
              </AccordionItem>
            );
          })}
        </Accordion>

        {hasMore && (
          <Button
            variant="flat"
            size="sm"
            className="self-center mt-2 w-full text-gray-500"
            onPress={() => handleLoadMore(listKey)}
            endContent={<ChevronDown size={16} />}
          >
            نمایش {Math.min(50, pathList.length - visibleCount)} مورد بیشتر (از {pathList.length})
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      {groupByType ? (
        <Accordion selectionMode="multiple" defaultExpandedKeys={["absolute"]}>
          <AccordionItem key="absolute" title={`مسیر های مطلق (${absolutePaths.length.toLocaleString()})`}>
            {renderPathItems(absolutePaths, "absolute")}
          </AccordionItem>

          <AccordionItem key="relative" title={`مسیر های نسبی (${relativePaths.length.toLocaleString()})`}>
            {renderPathItems(relativePaths, "relative")}
          </AccordionItem>

          {otherPaths.length > 0 && (
            <AccordionItem key="others" title={`سایر مسیر ها (${otherPaths.length.toLocaleString()})`}>
              {renderPathItems(otherPaths, "others")}
            </AccordionItem>
          )}
        </Accordion>
      ) : (
        renderPathItems(paths, "all")
      )}
    </div>
  );
};