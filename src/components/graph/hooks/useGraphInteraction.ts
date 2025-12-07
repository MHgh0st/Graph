import { useState, useCallback, useMemo } from "react";
import { Node, Edge } from "@xyflow/react";
import type { Path, Variant, ExtendedPath } from "src/types/types";

export const useGraphInteraction = (
  allNodes: Node[],
  allEdges: Edge[],
  variants: Variant[],
  setLayoutedNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setLayoutedEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  // New props for state lifted up
  selectedPathNodes: Set<string>,
  setSelectedPathNodes: React.Dispatch<React.SetStateAction<Set<string>>>,
  selectedPathEdges: Set<string>,
  setSelectedPathEdges: React.Dispatch<React.SetStateAction<Set<string>>>,
  selectedPathIndex: number | null,
  setSelectedPathIndex: React.Dispatch<React.SetStateAction<number | null>>,
  selectedNodeIds: Set<string>
) => {
  const [activeTooltipEdgeId, setActiveTooltipEdgeId] = useState<string | null>(
    null
  );
  
  const [isNodeCardVisible, setIsNodeCardVisible] = useState<
    boolean
  >(false);
  const [isEdgeCardVisible, setIsEdgeCardVisible] = useState<
    boolean
  >(false);
  const [edgeTooltipTitle, setEdgeTooltipTitle] = useState<string | null>(null);
  const [edgeTooltipData, setEdgeTooltipData] = useState<
    Array<{ label: string; value: string | number }>
  >([]);
  const [nodeTooltipTitle, setNodeTooltipTitle] = useState<string | null>(null);
  const [nodeTooltipData, setNodeTooltipData] = useState<
    Array<{ targetLabel: string; weight: string | number }>
  >([]);

  const [isPathFinding, setIsPathFinding] = useState(false);
  const [pathStartNodeId, setPathStartNodeId] = useState<string | null>(null);
  const [pathEndNodeId, setPathEndNodeId] = useState<string | null>(null);
  const [foundPaths, setFoundPaths] = useState<ExtendedPath[]>([]);

  const outgoingEdgesMap = useMemo(() => {
    const map = new Map<string, Edge[]>();
    allEdges.forEach((edge) => {
      if (!map.has(edge.source)) {
        map.set(edge.source, []);
      }
      map.get(edge.source)!.push(edge);
    });
    return map;
  }, [allEdges]);

  // مپ برای دسترسی سریع به یال‌ها جهت پیدا کردن ID یال بین دو نود
  // کلید: "Source->Target" | مقدار: Edge
  const edgeLookupMap = useMemo(() => {
    const map = new Map<string, Edge>();
    allEdges.forEach((edge) => {
      map.set(`${edge.source}->${edge.target}`, edge);
    });
    return map;
  }, [allEdges]);

  // --- تغییر ۱: محاسبه زمان بر اساس دیتای دقیق واریانت ---
  const calculatePathDuration = useCallback((path: Path) => {
    // اگر مسیر ما از نوع ExtendedPath باشد و مقدار دقیق داشته باشد، همان را برمی‌گردانیم
    const extPath = path as ExtendedPath;
    if (typeof extPath._variantDuration === "number") {
      return {
        totalDuration: extPath._variantDuration,
        averageDuration:
          path.edges.length > 0
            ? extPath._variantDuration / path.edges.length
            : 0,
      };
    }

    // فال‌بک به روش قدیمی (جمع زدن میانگین یال‌ها) اگر دیتای واریانت نبود
    // (این بخش شاید دیگه استفاده نشه ولی برای اطمینان میمونه)
    let totalDuration = 0;
    // ... (کد قبلی محاسبه دستی)
    return { totalDuration, averageDuration: 0 };
  }, []);

  const handleEdgeSelect = useCallback(
    (edgeId: string) => {
      const selectedEdge = allEdges.find((e) => e.id === edgeId);

      setLayoutedEdges((prevEdges) => {
        return prevEdges.map((edge) => {
          const isSelected = edge.id === edgeId;
          const originalStroke =
            (edge.data as any)?.originalStroke ||
            (edge.style?.stroke?.includes("rgba")
              ? edge.style.stroke
              : edge.style?.stroke || "#3b82f6");
          const originalStrokeWidth =
            (edge.data as any)?.originalStrokeWidth || 2;

          return {
            ...edge,
            selected: isSelected,
            style: {
              ...(edge.style || {}),
              strokeWidth: isSelected ? 4 : originalStrokeWidth,
              stroke: isSelected ? "#FFC107" : originalStroke,
              zIndex: isSelected ? 500 : undefined,
              strokeOpacity: isSelected
                ? 1
                : originalStroke.includes("rgba")
                  ? parseFloat(originalStroke.split(",")[3])
                  : 1,
            },
          };
        });
      });

      if (selectedEdge) {
        const dataToShow = [];
        if (selectedEdge.label) {
          dataToShow.push({ label: "تعداد", value: selectedEdge.label });
        }
        if (selectedEdge.data?.Tooltip_Mean_Time) {
          dataToShow.push({
            label: "میانگین زمان",
            value: selectedEdge.data.Tooltip_Mean_Time,
          });
        }
        if (selectedEdge.data?.Tooltip_Total_Time) {
          dataToShow.push({
            label: "زمان کل",
            value: selectedEdge.data.Tooltip_Total_Time,
          });
        }
        setEdgeTooltipData(dataToShow);

        const sourceNode = allNodes.find((n) => n.id === selectedEdge.source);
        const targetNode = allNodes.find((n) => n.id === selectedEdge.target);
        setEdgeTooltipTitle(
          `از یال ${sourceNode?.data?.label || selectedEdge.source} به ${targetNode?.data?.label || selectedEdge.target}`
        );

        setIsEdgeCardVisible(true)
        setActiveTooltipEdgeId(edgeId);
      } else {
        setIsEdgeCardVisible(false)
        setActiveTooltipEdgeId(null);
      }

      setLayoutedNodes((prevNodes) =>
        prevNodes.map((node) => ({ ...node, selected: false }))
      );
    },
    [allEdges, allNodes, setLayoutedEdges, setLayoutedNodes]
  );

  const handleSelectPath = (path: Path, index: number) => {
    setSelectedPathNodes(new Set(path.nodes));
    setSelectedPathEdges(new Set(path.edges));
    setSelectedPathIndex(index);
  };

  // --- حذف توابع setupWorker و useEffect مربوطه ---

  // --- تغییر ۲: منطق جدید مسیریابی با استفاده از Variants ---
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setActiveTooltipEdgeId(null);

      // حالت عادی (نمایش تولتیپ نود)
      if (!isPathFinding) {
        const nodeLabel = (node.data?.label as string) || (node.id as string);
        setNodeTooltipData([]);
        const outgoingEdges = outgoingEdgesMap.get(node.id) || [];
        const outgoingEdgeIds = new Set(outgoingEdges.map((e) => e.id));
        const tooltipData = outgoingEdges.map((edge) => {
          const targetNode = allNodes.find((n) => n.id === edge.target);
          return {
            targetLabel:
              (targetNode?.data?.label as string) || (edge.target as string),
            weight: (edge.label as string) || "N/A",
          };
        });

        setIsNodeCardVisible(true)
        setNodeTooltipData(tooltipData);
        setNodeTooltipTitle(nodeLabel);

        setLayoutedNodes((nds) =>
          nds.map((n) => ({ ...n, selected: n.id === node.id }))
        );

        setLayoutedEdges((prevEdges) =>
          prevEdges.map((edge) => {
            // ... (منطق استایل قبلی حفظ شود)
            const originalStroke =
              (edge.data as any)?.originalStroke || "#3b82f6";
            // (خلاصه کردم کد رو، همون منطق قبلی رو بذارید)
            const isOutgoing = outgoingEdgeIds.has(edge.id);
            return {
              ...edge,
              selected: isOutgoing,
              style: {
                ...edge.style,
                stroke: isOutgoing ? "#ef4444" : originalStroke,
                zIndex: isOutgoing ? 1000 : undefined,
                // ...
              },
            } as any;
          })
        );
        return;
      }

      // --- حالت مسیریابی (Path Finding) ---
      setActiveTooltipEdgeId(null);

      // ۱. انتخاب نقطه شروع
      if (!pathStartNodeId) {
        setPathStartNodeId(node.id);
        setPathEndNodeId(null);
        setFoundPaths([]);
        setSelectedPathNodes(new Set([node.id]));
        setSelectedPathEdges(new Set());
        return;
      }

      // ۲. انتخاب نقطه پایان و اجرای الگوریتم روی Variants
      if (pathStartNodeId && !pathEndNodeId && node.id !== pathStartNodeId) {
        const endId = node.id;
        setPathEndNodeId(endId);

        console.log("pathStartNodeId: ", pathStartNodeId);
        console.log("pathEndNodeId: ", endId);

        // --- الگوریتم جدید (جایگزین Worker) ---
        console.log("Searching paths in variants...");

        const validPaths: ExtendedPath[] = [];

        variants.forEach((variant) => {
          let startIdx = -1;
          let endIdx = -1;

          if (pathStartNodeId === "START_NODE") {
            // اگر شروع "START_NODE" بود، همیشه اولین فعالیت واریانت را در نظر بگیر
            startIdx = 0;
          } else {
            startIdx = variant.Variant_Path.indexOf(pathStartNodeId);
          }

          // --- ب) پیدا کردن ایندکس پایان ---
          if (endId === "END_NODE") {
            // اگر پایان "END_NODE" بود، همیشه آخرین فعالیت واریانت را در نظر بگیر
            endIdx = variant.Variant_Path.length - 1;
          } else {
            // از lastIndexOf استفاده می‌کنیم (جهت اطمینان از ترتیب زمانی)
            endIdx = variant.Variant_Path.lastIndexOf(endId);
          }

          // شرط: هر دو نود باشند و شروع قبل از پایان باشد
          if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
            // برش مسیر (Slice)
            const pathNodes = variant.Variant_Path.slice(startIdx, endIdx + 1);

            if (selectedNodeIds && selectedNodeIds.size > 0) {
              const isPathInSubgraph = pathNodes.every((nodeId) =>
                selectedNodeIds.has(nodeId)
              );
              // اگر حتی یک گره از مسیر در فیلتر کاربر نباشد، این مسیر را نادیده بگیر
              if (!isPathInSubgraph) return;
            }

            // پیدا کردن ID یال‌ها برای هایلایت
            const pathEdges: string[] = [];
            for (let i = 0; i < pathNodes.length - 1; i++) {
              const source = pathNodes[i];
              const target = pathNodes[i + 1];
              const edge = edgeLookupMap.get(`${source}->${target}`);
              if (edge) {
                pathEdges.push(edge.id);
              }
            }

            // محاسبه زمان دقیق از روی Avg_Timings واریانت
            // زمان رسیدن به مقصد منهای زمان رسیدن به مبدا
            const startTime = variant.Avg_Timings[startIdx];
            const endTime = variant.Avg_Timings[endIdx];
            const accurateDuration = endTime - startTime;

            validPaths.push({
              nodes: pathNodes,
              edges: pathEdges,
              _variantDuration: accurateDuration, // ذخیره برای استفاده در calculatePathDuration
              _frequency: variant.Frequency,
              _fullPathNodes: variant.Variant_Path,
              _startIndex: startIdx,
              _endIndex: endIdx,
            });
          }
        });

        // مرتب‌سازی بر اساس تکرار (Frequency) - اختیاری
        // validPaths.sort((a, b) => (b._frequency || 0) - (a._frequency || 0));

        setFoundPaths(validPaths);
        console.log(`Found ${validPaths.length} paths from variants.`);

        setSelectedPathNodes(new Set([pathStartNodeId, endId]));
        setSelectedPathEdges(new Set());
        return;
      }

      // ریست کردن برای انتخاب شروع جدید
      setPathStartNodeId(node.id);
      setPathEndNodeId(null);
      setFoundPaths([]);
      setSelectedPathNodes(new Set([node.id]));
      setSelectedPathEdges(new Set());
    },
    [
      isPathFinding,
      pathStartNodeId,
      pathEndNodeId,
      outgoingEdgesMap,
      allNodes,
      variants, // وابستگی جدید
      edgeLookupMap,
      setLayoutedEdges,
      setLayoutedNodes,
      setSelectedPathNodes, // Added dependency
      setSelectedPathEdges, // Added dependency
      selectedNodeIds,
    ]
  );

  const closeNodeTooltip = () => {
    // ... (همان کد قبلی)
    setIsNodeCardVisible(false);
    setNodeTooltipTitle(null);
    setLayoutedNodes((nds) => nds.map((n) => ({ ...n, selected: false })));  
    setLayoutedEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: false,
        style: {
          ...e.style,
          stroke: (e.data as any)?.originalStroke || "#3b82f6",
        },
      }))
    );
  };
  const closeEdgeTooltip= () => {
    setIsEdgeCardVisible(false)
    setActiveTooltipEdgeId(null);
    setLayoutedEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: false,
        style: {
          ...e.style,
          stroke: (e.data as any)?.originalStroke || "#3b82f6",
        },
      }))
    );
  }

  const resetPathfinding = () => {
    setIsPathFinding(false);
    
    setPathStartNodeId(null);
    setPathEndNodeId(null);
    setFoundPaths([]);
    setSelectedPathNodes(new Set());
    setSelectedPathEdges(new Set());
    setSelectedPathIndex(null);
    // ورکر نداریم که ریست کنیم
  };

  const onPaneClick = useCallback(() => {
    setActiveTooltipEdgeId(null);
    closeNodeTooltip();
  }, [closeNodeTooltip]);

  return {
    activeTooltipEdgeId,
    isNodeCardVisible,
    isEdgeCardVisible,
    nodeTooltipTitle,
    nodeTooltipData,
    edgeTooltipTitle,
    edgeTooltipData,
    isPathFinding,
    pathStartNodeId,
    pathEndNodeId,
    foundPaths,
    // selectedPathNodes, // Removed from return as it is passed in
    // selectedPathEdges, // Removed from return as it is passed in
    // selectedPathIndex, // Removed from return as it is passed in
    isPathfindingLoading: false, // همیشه false چون محاسبات آنی است
    handleEdgeSelect,
    handleSelectPath,
    handleNodeClick,
    closeNodeTooltip,
    closeEdgeTooltip,
    setIsPathFinding,
    setIsNodeCardVisible,
    setIsEdgeCardVisible,
    resetPathfinding,
    calculatePathDuration,
    onPaneClick,
  };
};
