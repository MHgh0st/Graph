import { useMemo, useCallback, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  applyNodeChanges,
  NodeChange,
  OnMoveEnd,
  OnMoveStart,
  EdgeMouseHandler,
  NodeMouseHandler,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@heroui/card";

import { StyledSmoothStepEdge } from "./graph/ui/StyledSmoothStepEdge";
import { NodeTooltip } from "./graph/ui/NodeTooltip";
import EdgeTooltip from "./graph/ui/EdgeTooltip";
import CustomNode from "./graph/ui/CustomNode";
import type { Path, NodeTooltipType, ExtendedPath, SidebarTab } from "src/types/types";

interface UtilsProps {
  GraphLayout: {
    allNodes: Node[];
    layoutedNodes: Node[];
    layoutedEdges: Edge[];
    isLoading: boolean;
    loadingMessage: string;
    setLayoutedNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setLayoutedEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  };

  GraphInteraction: {
    activeTooltipEdgeId: string | null;
    isNodeCardVisible: boolean;
    isEdgeCardVisible: boolean;
    nodeTooltipTitle: string | null;
    nodeTooltipData: Array<NodeTooltipType>;
    edgeTooltipTitle: string | null;
    edgeTooltipData: Array<{ label: string; value: string | number }>;
    pathStartNodeId: string | null;
    pathEndNodeId: string | null;
    foundPaths: Path[];
    selectedPathNodes: Set<string>;
    selectedPathEdges: Set<string>;
    selectedPathIndex: number | null;
    isPathFinding: boolean;
    isPathfindingLoading: boolean;
    handleEdgeSelect: (id: string, overrides?: any) => void;
    handleSelectPath: (path: Path, index: number) => void;
    handleNodeClick: (_event: React.MouseEvent, node: Node) => void;
    closeNodeTooltip: () => void;
    closeEdgeTooltip: () => void;
    setIsPathFinding: React.Dispatch<React.SetStateAction<boolean>>;
    setIsNodeCardVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsEdgeCardVisible: React.Dispatch<React.SetStateAction<boolean>>;
    resetPathfinding: () => void;
    calculatePathDuration: (path: Path) => {
      totalDuration: number;
      averageDuration: number;
    };
    onPaneClick: () => void;
  };
}

interface GraphProps {
  className?: string;
  utils: UtilsProps;
  filteredNodeIds?: Set<string>;
  activeSideBar?: SidebarTab
}

const defaultEdgeOptions = {
  markerEnd: {
    type: MarkerType.ArrowClosed,
    height: 7,
  },
  type: "default",
  animated: false,
};

const edgeTypes = {
  default: StyledSmoothStepEdge,
};

const nodeTypes: NodeTypes = {
  start: CustomNode,
  end: CustomNode,
  activity: CustomNode,
  default: CustomNode,
};

export default function Graph({
  className,
  utils,
  filteredNodeIds,
  activeSideBar
}: GraphProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    layoutedNodes,
    layoutedEdges,
    isLoading,
    loadingMessage,
    setLayoutedNodes,
  } = utils.GraphLayout;

  const {
    activeTooltipEdgeId,
    isEdgeCardVisible,
    isNodeCardVisible,
    nodeTooltipTitle,
    nodeTooltipData,
    edgeTooltipTitle,
    edgeTooltipData,
    pathStartNodeId,
    pathEndNodeId,
    selectedPathNodes,
    selectedPathEdges,
    isPathFinding,
    selectedPathIndex,
    foundPaths,
    handleEdgeSelect,
    handleNodeClick,
    closeNodeTooltip,
    closeEdgeTooltip,
    onPaneClick,
  } = utils.GraphInteraction;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds.toFixed(0)} ثانیه`;
    } else if (seconds < 3600) {
      return `${(seconds / 60).toFixed(1)} دقیقه`;
    } else if (seconds < 86400) {
      return `${(seconds / 3600).toFixed(1)} ساعت`;
    }
    return `${(seconds / 86400).toFixed(2)} روز`;
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setLayoutedNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setLayoutedNodes]
  );

  const onMoveStart: OnMoveStart = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.classList.add("is-interacting");
    }
  }, []);

  const onMoveEnd: OnMoveEnd = useCallback((event, viewport) => {
    if (containerRef.current) {
      containerRef.current.classList.remove("is-interacting");
    }
    setZoomLevel(viewport.zoom);
  }, []);

  // ✅ Wrapper برای هندل کردن کلیک روی پن (بک‌گراند)
  const onPaneClickWrapper = useCallback((event: React.MouseEvent) => {
    // 1. اطمینان از حذف کلاس تعامل
    if (containerRef.current) {
      containerRef.current.classList.remove("is-interacting");
    }
    // 2. اجرای لاجیک اصلی
    onPaneClick();
  }, [onPaneClick]);

  // ✅ Wrapper برای هندل کردن کلیک روی نود
  const onNodeClickWrapper: NodeMouseHandler = useCallback((event, node) => {
    if (containerRef.current) {
      containerRef.current.classList.remove("is-interacting");
    }
    handleNodeClick(event, node);
  }, [handleNodeClick]);

  // ✅ Wrapper برای هندل کردن کلیک روی یال
  const onEdgeClickWrapper: EdgeMouseHandler = useCallback(
    (event, edge) => {
      if (containerRef.current) {
        containerRef.current.classList.remove("is-interacting");
      }
      const overrideData = edge.data?.tooltipOverrideData;
      handleEdgeSelect(edge.id, overrideData);
    },
    [handleEdgeSelect]
  );

  const nodesForRender = useMemo(() => {
    const isHighlighting = selectedPathNodes.size > 0;
    const nodesToShow =
      filteredNodeIds && filteredNodeIds.size > 0
        ? layoutedNodes.filter((node) => filteredNodeIds.has(node.id))
        : null;

    const sourceNodes = nodesToShow || layoutedNodes;

    return sourceNodes.map((node) => {
      const isHighlighted = selectedPathNodes.has(node.id);
      const nodeType = (node.data?.type as string) || "activity";

      return {
        ...node,
        type: nodeType,
        data: {
          ...node.data,
          label: node.data?.label || node.id,
        },
        style: {
          width: 'fit-content',
          opacity: isHighlighting && !isHighlighted ? 0.2 : 1,
          transition: "opacity 0.3s ease",
        },
      };
    });
  }, [
    layoutedNodes,
    selectedPathNodes,
    pathStartNodeId,
    pathEndNodeId,
    filteredNodeIds,
  ]);

  const edgesForRender = useMemo(() => {
    const isHighlighting = selectedPathEdges.size > 0;
    const showEdgeLabels = zoomLevel > 0.6; 

    let activePath: ExtendedPath | null = null;
    if (
      selectedPathIndex !== null &&
      foundPaths &&
      foundPaths[selectedPathIndex]
    ) {
      activePath = foundPaths[selectedPathIndex] as ExtendedPath;
    }

    const processedEdges = layoutedEdges.map((edge) => {
      const isHighlighted = selectedPathEdges.has(edge.id);
      const isTooltipActive =
        activeTooltipEdgeId !== null && edge.id === activeTooltipEdgeId;

      const opacity =
        (isPathFinding || isHighlighting) && !isHighlighted
          ? 0.1 
          : edge.style?.opacity ?? 1;

      let displayLabel = edge.label as string;
      let tooltipMeanTime = (edge.data as any)?.Tooltip_Mean_Time;
      let tooltipTotalTime = (edge.data as any)?.Tooltip_Total_Time;
      let tooltipOverride = undefined;

      if (activePath && isHighlighted) {
          const pathEdges = activePath.edges || [];
            const edgeIndices: number[] = [];

            pathEdges.forEach((id: string, idx: number) => {
            if (id === edge.id) edgeIndices.push(idx);
            });

            if (
            activePath._specificEdgeDurations && 
            activePath._specificEdgeDurations[edge.id] !== undefined
            ) {
            // حالت جستجوی پرونده: نمایش میانگین محاسبه شده
            const avgDuration = activePath._specificEdgeDurations[edge.id];
            displayLabel = formatDuration(avgDuration);
            
            // تولتیپ هم اصلاح می‌شود
            tooltipMeanTime = `${formatDuration(avgDuration)} (میانگین)`;
            
            // محاسبه زمان کل برای این یال در این پرونده (میانگین * تعداد دفعات عبور)
            const count = activePath._fullPathNodes 
                ? activePath._fullPathNodes.filter((_, idx) => {
                    // منطق ساده برای شمارش تعداد عبور از این یال خاص
                    if (idx >= activePath._fullPathNodes!.length - 1) return false;
                    const src = activePath._fullPathNodes![idx];
                    const trg = activePath._fullPathNodes![idx+1];
                    return `${src}->${trg}` === edge.id;
                  }).length
                : 1;

            tooltipTotalTime = formatDuration(avgDuration * count);
            
            tooltipOverride = {
              label: 1, // تعداد پرونده ۱ است
              meanTime: tooltipMeanTime,
              totalTime: tooltipTotalTime,
            };
          }

            else if (
            edgeIndices.length > 0 &&
            activePath._variantTimings &&
            activePath._variantTimings.length > 0 &&
            typeof activePath._startIndex === "number"
            ) {
            let totalDuration = 0;
            let count = 0;

            edgeIndices.forEach((idx) => {
                const timeIndex = activePath!._startIndex! + idx;
                const start = activePath!._variantTimings![timeIndex];
                const end = activePath!._variantTimings![timeIndex + 1];

                if (typeof start === "number" && typeof end === "number") {
                totalDuration += Math.max(0, end - start);
                count++;
                }
            });

            if (count > 0) {
                const formatted = formatDuration(totalDuration);
                displayLabel = formatted;
                tooltipMeanTime =
                count > 1 ? `${formatted} (مجموع ${count} بار عبور)` : formatted;

                const frequency = activePath._frequency || 0;
                const totalVariantDuration = totalDuration * frequency;
                tooltipTotalTime = formatDuration(totalVariantDuration);

                tooltipOverride = {
                label: (foundPaths[selectedPathIndex!] as ExtendedPath)._frequency!,
                meanTime: tooltipMeanTime,
                totalTime: tooltipTotalTime,
                };
            }
        }
      }

      const finalLabel = (isHighlighted || showEdgeLabels) ? displayLabel : "";

      return {
        ...edge,
        label: finalLabel,
        hidden: false,
        data: {
          ...edge.data,
          tooltipOverrideData: tooltipOverride,
          isTooltipVisible: isTooltipActive,
          Tooltip_Mean_Time: tooltipMeanTime,
        },
        style: {
          ...(edge.style || {}),
          stroke: edge.style?.stroke,
          strokeWidth: edge.style?.strokeWidth,
          opacity: opacity,
          zIndex: isTooltipActive ? 1000 : isHighlighted ? 500 : 0,
        },
        focusable: true,
      };
    });

    return processedEdges.sort((a, b) => {
        if (a.id === activeTooltipEdgeId) return 1;
        if (b.id === activeTooltipEdgeId) return -1;
        const aSelected = selectedPathEdges.has(a.id);
        const bSelected = selectedPathEdges.has(b.id);
        if (aSelected && !bSelected) return 1;
        if (!aSelected && bSelected) return -1;
        return 0;
    });

  }, [
    layoutedEdges,
    activeTooltipEdgeId,
    selectedPathEdges,
    isPathFinding,
    selectedPathIndex,
    foundPaths,
    zoomLevel,
  ]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <h2 className="text-lg font-medium text-white/70">{loadingMessage}</h2>
      </div>
    );
  }

  if (layoutedNodes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <h2 className="text-lg font-medium text-white/50">هیچ داده‌ای برای نمایش وجود ندارد.</h2>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`${className} w-full h-full`}>
      <div className="relative w-full h-full">
        {isNodeCardVisible && (
          <Card className="absolute right-2 z-50 p-2 max-h-[250px] min-w-[40%] shadow-xl">
            <NodeTooltip
              nodeTooltipTitle={nodeTooltipTitle}
              nodeTooltipData={nodeTooltipData}
              onClose={closeNodeTooltip}
              onEdgeSelect={handleEdgeSelect}
            />
          </Card>
        )}
        {isEdgeCardVisible && (
          <Card className="absolute z-10 top-0 left-0 min-w-[40%] shadow-xl">
            <EdgeTooltip
              edgeTooltipData={edgeTooltipData}
              edgeTooltipTitle={edgeTooltipTitle}
              onClose={closeEdgeTooltip}
            />
          </Card>
        )}

       {activeSideBar === 'SearchCaseIds' && (
        <Card className="absolute z-10 bottom-4 left-1/2 -translate-x-1/2 min-w-[95%] shadow-xl">
          
        </Card>
       )} 

        <ReactFlow
          nodes={nodesForRender}
          edges={edgesForRender}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          
          // ✅ استفاده از Wrappers
          onNodeClick={onNodeClickWrapper}
          onEdgeClick={onEdgeClickWrapper}
          onPaneClick={onPaneClickWrapper}
          
          onMoveStart={onMoveStart}
          onMoveEnd={onMoveEnd}

          onlyRenderVisibleElements={true}
          minZoom={0.05}
          maxZoom={4}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          nodesConnectable={false}
          nodesDraggable={true} 
          elementsSelectable={true}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}