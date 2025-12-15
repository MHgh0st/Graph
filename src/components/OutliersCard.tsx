import { useMemo, useEffect } from "react";
import type { Variant, Path, ExtendedPath } from "src/types/types";
import { Node } from "@xyflow/react"; 
import { PathList } from "./PathList"; 

interface OutliersCardProps {
  outliers: Variant[] | null;
  allNodes: Node[];
  selectedNodeIds: Set<string>; // این پراپ برای فیلترینگ استفاده می‌شود
  selectedIndex: number | null;
  onSelectOutlier: (outlierPath: Path, index: number) => void;
}

export default function OutliersCard({
  outliers,
  allNodes,
  selectedNodeIds,
  selectedIndex,
  onSelectOutlier,
}: OutliersCardProps) {

  // 1. تبدیل، فیلتر و مرتب‌سازی
  const convertedPaths = useMemo<Path[]>(() => {
    if (!outliers) return [];

    // گام اول: فیلتر کردن (اگر گره‌ای انتخاب شده باشد)
    // تنها واریانت‌هایی که تمام راس‌هایشان در selectedNodeIds باشد می‌مانند
    let filteredOutliers : Variant[] = [];
    if (selectedNodeIds.size > 0) {
      filteredOutliers = outliers.filter((variant) =>
        variant.Variant_Path.every((nodeId) => selectedNodeIds.has(nodeId))
      );
    }

    // گام دوم: تبدیل به Path (محاسبه زمان و یال‌ها)
    const mappedPaths = filteredOutliers.map((variant) => {
      const edges: string[] = [];
      const nodes = variant.Variant_Path;
      
      // ساخت شناسه یال‌ها
      for (let i = 0; i < nodes.length - 1; i++) {
        const source = nodes[i];
        const target = nodes[i + 1];
        edges.push(`${source}->${target}`); 
      }

      // محاسبه میانگین زمان طی شده (End - Start)
      const meanPathDuration = variant.Avg_Timings.length > 0
        ? variant.Avg_Timings[variant.Avg_Timings.length - 1] - variant.Avg_Timings[0]
        : 0;

      const pathData: ExtendedPath = {
        nodes: nodes,
        edges: edges,
        averageDuration: meanPathDuration,
        _startIndex: 0,
        _endIndex: nodes.length - 1,
        _fullPathNodes: nodes,
        _frequency: variant.Frequency,
        _variantTimings: variant.Avg_Timings,
        _pathType: "absolute", 
      };

      return pathData;
    });

    // گام سوم: مرتب‌سازی
    // 1. بیشترین تعداد (Frequency)
    // 2. بیشترین میانگین زمان (averageDuration)
    return mappedPaths.sort((a, b) => {
      const pathA = a as ExtendedPath;
      const pathB = b as ExtendedPath;

      const freqA = pathA._frequency || 0;
      const freqB = pathB._frequency || 0;

      // اولویت اول: تعداد (نزولی)
      if (freqB !== freqA) {
        return freqB - freqA;
      }

      // اولویت دوم: زمان (نزولی)
      const durA = pathA.averageDuration || 0;
      const durB = pathB.averageDuration || 0;
      return durB - durA;
    });

  }, [outliers, selectedNodeIds]);

  const handleSelectPathWrapper = (path: Path, index: number) => {
     onSelectOutlier(path, index);
  };

  return (
    <>
    {
      selectedNodeIds.size > 0 && (
        <p className="text-center mb-2 mt-4 text-lg font-semibold">
            تعداد مسیر های پرت: {convertedPaths.length} 
            {selectedNodeIds.size > 0 && <span className="text-xs text-gray-500 block">(فیلتر شده)</span>}
        </p>
      )
    }
    
    <PathList
      paths={convertedPaths}
      allNodes={allNodes}
      selectedIndex={selectedIndex}
      onSelectPath={handleSelectPathWrapper}
      emptyMessage={
          selectedNodeIds.size > 0 
          ? "هیچ مسیر پرتی با گره‌های انتخاب شده یافت نشد." 
          : "هنوز هیچ راسی برای نمایش انتخاب نشده"
      }
      groupByType={false} 
    />
    </>
  );
}